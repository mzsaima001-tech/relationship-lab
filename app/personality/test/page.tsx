"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnalyzingScreen } from "@/app/components/AnalyzingScreen";
import HomeFooter from "@/app/components/HomeFooter";

// =====================================================
// /personality/test — v1 风格答题页（v5 题库）
//
// 视觉与原 v1 test 一致：sticky 顶部 / 题目居中 / 选项列表 / 上一题
// 底层走 v2 API：拉 36 题（5 选项），答案写到 v2 answers 表
// 完成跳到 /personality-v2/result/{testId}（v5 月相卡结果页）
// =====================================================

interface PaperQuestion {
  id: string;
  dim: string;
  stem: string;
  options: { idx: number; text: string }[];
}

interface QuestionsResponse {
  testId: string;
  paperId: string;
  total: number;
  questions: PaperQuestion[];
  answered: Record<string, number>;
}

type Phase = "answering" | "completing";

function PersonalityTestInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const testId = sp.get("testId") || "";

  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  // 防重入锁：避免 36 题最后一道点完 A 又点了 B 引发 race
  const submitLockRef = useRef(false);

  // 加载 paper 题目（v2 API）
  useEffect(() => {
    if (!testId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/personality-v2/tests/${testId}/questions`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setData(json);
        setAnswers(json.answered || {});
        // 找到第一个未答的位置
        const firstUnanswered = json.questions.findIndex(
          (q: PaperQuestion) => !(json.answered || {})[q.id]
        );
        setIdx(firstUnanswered >= 0 ? firstUnanswered : json.questions.length - 1);
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
  // 已答题数：当前 idx 已经处于"待答"位置，但 progress 应该按"已确定的答题进度"
  const totalAnswered = Math.min(idx + 1, questions.length);
  const progress = total > 0 ? (totalAnswered / total) * 100 : 0;
  const selected = current ? answers[current.id] : undefined;

  const handleAnswer = async (optionIndex: number) => {
    if (!current || submitLockRef.current || phase === "completing") return;
    submitLockRef.current = true;
    try {
      // 1. 先落本地（含 selected 视觉态）
      const newAnswers = { ...answers, [current.id]: optionIndex };
      setAnswers(newAnswers);

      // 2. await 后端保存（v2 answers API）
      const res = await fetch(
        `/api/personality-v2/tests/${testId}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: current.id, optionIndex }),
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

      // 3. 最后一题 → 切 completing；否则下一题（150ms 让"已选中"先显示）
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

  // 触发后端算分 + 轮询 result → 一就绪立即跳
  const fireAndPollComplete = () => {
    fetch(`/api/personality-v2/tests/${testId}/complete`, {
      method: "POST",
    }).catch(() => {});
    const startedAt = Date.now();
    const FALLBACK_MS = 10000;
    const tick = async () => {
      try {
        const r = await fetch(
          `/api/personality-v2/tests/${testId}/result`
        );
        if (r.ok) {
          router.push(`/personality-v2/result/${testId}`);
          return;
        }
      } catch {
        /* 网络抖 */
      }
      if (Date.now() - startedAt > FALLBACK_MS) {
        router.push(`/personality-v2/result/${testId}`);
        return;
      }
      setTimeout(tick, 1000);
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
        title="请稍候，正在为你匹配月相卡"
        hint="约需 3–8 秒，请不要关闭页面"
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

  // 字母映射：optionIndex 0..4 → A..E
  const letterOf = (i: number) => String.fromCharCode(65 + i);

  return (
    <main className="flex-1 flex flex-col items-center px-5 pt-0 pb-8 sm:px-6 sm:pb-10 max-w-xl mx-auto w-full safe-bottom">
      {/* 进度：sticky 顶部（v1 风格） */}
      <div className="sticky top-0 z-20 w-full bg-[var(--bg-dark)]/95 backdrop-blur-sm -mx-5 px-5 sm:-mx-6 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-[var(--border-dim)] fade-in">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
          <span className="font-mono">
            {totalAnswered} / {total}
          </span>
          <span>{Math.round(progress)}%</span>
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
          {current.stem}
        </p>
      </div>

      {/* 选项 */}
      <div
        className="w-full space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        {current.options.map((opt) => {
          const isSelected = selected === opt.idx;
          return (
            <button
              key={opt.idx}
              onClick={() => handleAnswer(opt.idx)}
              className={`w-full min-h-[56px] text-left px-4 py-3.5 sm:px-5 sm:py-4 rounded-lg border transition-all ${
                isSelected
                  ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--text-warm)]"
                  : "bg-[rgba(245,237,224,0.04)] border-[var(--border-dim)] text-[var(--text-warm)] active:bg-[rgba(201,169,110,0.12)] active:border-[var(--accent-dim)]"
              }`}
            >
              <span className="text-[var(--accent)] font-mono mr-2 sm:mr-3">
                {letterOf(opt.idx)}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>

      {/* 上一题（idx > 0 才显示） */}
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
              href={`/personality-v2/result/${testId}`}
              className="text-xs px-3 py-2 rounded-lg border border-[var(--border-dim)] text-[var(--text-muted)] active:text-[var(--text-warm)] min-h-[40px] inline-flex items-center"
            >
              跳到结果页
            </Link>
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