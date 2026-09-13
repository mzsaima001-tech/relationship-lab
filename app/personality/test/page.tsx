"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnalyzingScreen } from "@/app/components/AnalyzingScreen";
import HomeFooter from "@/app/components/HomeFooter";

/**
 * /personality/test — 答题页（V3：5 选项，5 卷抽卷）
 *
 * 调后端：
 *   GET   /api/personality/questions                 拉 36 道题（无分值）
 *   POST  /api/personality/tests/{id}/answers        单题保存（letter: A/B/C/D/E）
 *   POST  /api/personality/tests/{id}/complete       算分 + Top3
 *   GET   /api/personality/tests/{id}/result         读报告
 *
 * 完成后跳 /personality/result/{testId}。
 */

interface PersonalityQuestion {
  id: string;
  order: number;
  question: string;
  dimension: string;
  paper?: string;
  options?: readonly string[];
}

interface QuestionsResponse {
  total: number;
  paperId?: string;
  questions: PersonalityQuestion[];
}

type Letter = "A" | "B" | "C" | "D" | "E";
type Phase = "answering" | "completing";

const LETTERS: readonly Letter[] = ["A", "B", "C", "D", "E"];

function PersonalityTestInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const testId = sp.get("testId") || "";
  const refCode = sp.get("ref") || "";

  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Letter>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  // 防重入锁
  const submitLockRef = useRef(false);

  /**
   * 启动逻辑（按优先级）：
   *   1. URL 带 testId → 直接用
   *   2. URL 带 ref → 自动创建 test(把 ref 作为 referredByCode 传给后端) → 跳到带 testId 的自己
   *   3. 都没有 → 报错回首页
   */
  useEffect(() => {
    if (!testId) {
      if (!refCode) {
        setError("缺少测试 ID,请从人格测试首页重新进入");
        setLoading(false);
        return;
      }
      // 带 ref 但没 testId → 创建 test(带上 referredByCode)
      let cancelled = false;
      (async () => {
        try {
          // 取/生成 visitorId
          const visitorId =
            (typeof window !== "undefined" &&
              (localStorage.getItem("personalityVisitorId") ||
                (() => {
                  const v = `pv_${Math.random().toString(36).slice(2, 10)}`;
                  try {
                    localStorage.setItem("personalityVisitorId", v);
                  } catch {
                    /* 写不动忽略 */
                  }
                  return v;
                })())) ||
            `pv_${Math.random().toString(36).slice(2, 10)}`;
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("personalityVisitorId", visitorId);
            } catch {
              /* 忽略 */
            }
          }
          const res = await fetch(`/api/personality/tests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, referredByCode: refCode }),
          });
          const json = await res.json();
          if (!res.ok || !json.testId) {
            throw new Error(json.error || "创建测试失败");
          }
          if (cancelled) return;
          // 把 ref 继续带上,避免在后续重定向里丢掉(实际上后续用 testId 即可,但保留 ref 利于调试)
          router.replace(`/personality/test?testId=${json.testId}&ref=${encodeURIComponent(refCode)}`);
        } catch (e: any) {
          if (!cancelled) {
            setError(e?.message || "创建测试失败");
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [testId, refCode, router]);

  // 加载题库（按当前 testId 抽出 36 道题）
  useEffect(() => {
    if (!testId) return;
    (async () => {
      try {
        const res = await fetch(`/api/personality/questions?testId=${encodeURIComponent(testId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载题目失败");
        setData(json);
        setIdx(0);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  const questions = data?.questions ?? [];
  const total = questions.length;
  const current = questions[idx];
  const totalAnswered = Math.min(idx + 1, questions.length);
  const progress = total > 0 ? (totalAnswered / total) * 100 : 0;
  const selected = current ? answers[current.id] : undefined;

  const handleAnswer = async (letter: Letter) => {
    if (!current || submitLockRef.current || phase === "completing") return;
    submitLockRef.current = true;
    try {
      // 1. 先落本地（含 selected 视觉态）
      const newAnswers = { ...answers, [current.id]: letter };
      setAnswers(newAnswers);

      // 2. await 后端保存（V3 answers API：letter A-E）
      const res = await fetch(
        `/api/personality/tests/${testId}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: current.id, letter }),
        }
      );
      if (!res.ok) {
        let msg = `保存答案失败 (HTTP ${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* HTML 错误页 */
        }
        throw new Error(msg);
      }

      // 3. 最后一题 → 切 completing；否则下一题
      if (idx + 1 >= total) {
        setPhase("completing");
        fireAndPollComplete();
      } else {
        setTimeout(() => {
          setIdx(idx + 1);
          submitLockRef.current = false;
        }, 150);
      }
    } catch (e: any) {
      console.error("save answer failed", e);
      setError(e?.message || "保存答案失败");
      submitLockRef.current = false;
    }
  };

  // 触发后端算分 + 轮询 result → 一就绪立即跳 v1 结果页
  const fireAndPollComplete = () => {
    fetch(`/api/personality/tests/${testId}/complete`, {
      method: "POST",
    }).catch(() => {});
    const startedAt = Date.now();
    // complete 路由里有两路并发 LLM 润色（polishFreeReportWithLLM + polishFullReportWithLLM），
    // 典型耗时 25–40s，极端网络下可逼近 maxDuration=60s。
    // 兜底 60s：给真正完成留出窗口，期间只要 /result 返回 200 就立刻跳。
    const FALLBACK_MS = 60000;
    const tick = async () => {
      try {
        const r = await fetch(`/api/personality/tests/${testId}/result`);
        if (r.ok) {
          router.push(`/personality/result/${testId}`);
          return;
        }
      } catch {
        /* 网络抖 */
      }
      if (Date.now() - startedAt > FALLBACK_MS) {
        router.push(`/personality/result/${testId}`);
        return;
      }
      setTimeout(tick, 1500);
    };
    setTimeout(tick, 300);
  };

  const goPrev = () => {
    if (idx === 0) return;
    setIdx(idx - 1);
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="text-sm text-[var(--text-muted)]">题目加载中...</p>
      </main>
    );
  }

  if (phase === "completing") {
    return (
      <AnalyzingScreen
        title="请稍候，正在为你生成报告"
        hint="约需 20–60 秒，请不要关闭页面"
      />
    );
  }

  if (!current) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-[var(--danger)]">{error || "题目不存在"}</p>
        <Link href="/personality" className="btn-ghost">
          返回测试入口
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-5 pt-0 pb-8 sm:px-6 sm:pb-10 max-w-xl mx-auto w-full safe-bottom">
      {/* 进度：sticky 顶部 */}
      <div className="sticky top-0 z-20 w-full bg-[var(--bg-dark)]/95 backdrop-blur-sm -mx-5 px-5 sm:-mx-6 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-[var(--border-dim)] fade-in">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
          <span className="font-mono">
            {totalAnswered} / {total}
          </span>
          <div className="flex items-center gap-2">
            {data?.paperId && (
              <span className="rounded-full border border-[var(--border-dim)] px-2 py-0.5 text-[10px] tracking-wider">
                {data.paperId}
              </span>
            )}
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="h-1.5 bg-[var(--border-dim)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 题目 */}
      <div key={current.id} className="w-full mt-8 mb-6 sm:mt-10 sm:mb-8 fade-in">
        <p className="display-serif text-base sm:text-lg md:text-xl text-[var(--text-warm)] leading-relaxed min-h-[4rem] sm:min-h-[5rem]">
          {current.question}
        </p>
        <p className="mt-3 text-[11px] text-[var(--text-muted)] tracking-wide">
          凭第一反应就好，不用想太久
        </p>
      </div>

      {/* 选项 A B C D E（V3：5 选项情境题） */}
      <div
        className="w-full space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        {(LETTERS).map((letter, i) => {
          const isSelected = selected === letter;
          const optText = current.options?.[i] ?? "";
          return (
            <button
              key={letter}
              onClick={() => handleAnswer(letter)}
              className={`w-full min-h-[56px] text-left px-4 py-3.5 sm:px-5 sm:py-4 rounded-lg border transition-all flex items-start gap-3 ${
                isSelected
                  ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--text-warm)]"
                  : "bg-[rgba(245,237,224,0.04)] border-[var(--border-dim)] text-[var(--text-warm)] active:bg-[rgba(201,169,110,0.12)] active:border-[var(--accent-dim)]"
              }`}
            >
              <span className="text-[var(--accent)] font-mono mt-0.5 shrink-0">
                {letter}
              </span>
              <span className="text-sm sm:text-[15px] leading-relaxed text-[var(--text-warm)]">
                {optText || "（暂无选项）"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 上一题 */}
      {idx > 0 && (
        <button
          onClick={goPrev}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4 active:text-[var(--text-warm)]"
        >
          ← 上一题
        </button>
      )}

      {error && (
        <div className="w-full mt-6 fade-in">
          <p className="text-xs text-[var(--danger)] mb-3 text-center">
            {error}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                setError("");
                submitLockRef.current = false;
              }}
              className="text-xs px-3 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] active:bg-[var(--accent)]/15 min-h-[40px]"
            >
              重试
            </button>
            <Link
              href="/personality"
              className="text-xs px-3 py-2 rounded-lg border border-[var(--border-dim)] text-[var(--text-muted)] active:text-[var(--text-warm)] min-h-[40px] inline-flex items-center"
            >
              返回测试首页
            </Link>
          </div>
        </div>
      )}

      <HomeFooter />
    </main>
  );
}

export default function PersonalityTest() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <PersonalityTestInner />
    </Suspense>
  );
}