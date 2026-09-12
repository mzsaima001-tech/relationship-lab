"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnalyzingScreen } from "@/app/components/AnalyzingScreen";
import HomeFooter from "@/app/components/HomeFooter";

interface Question {
  id: string;
  order: number;
  question: string;
  dimension: string;
}

const ANSWER_OPTIONS = [
  { letter: "A" as const, label: "非常符合我" },
  { letter: "B" as const, label: "比较符合我" },
  { letter: "C" as const, label: "不太符合我" },
  { letter: "D" as const, label: "完全不像我" },
];

type Phase = "answering" | "completing";

/** 与 lib/personality 页保持一致的本地 visitorId 工具 */
const VISITOR_KEY = "personalityVisitorId";
function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = `pv_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function PersonalityTestInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const testId = sp.get("testId") || "";
  /** ref 来自 /s/[code] 落地页跳转，仅用于顶部一行小字提示；visits 已在落地 API 自动递增 */
  const ref = sp.get("ref") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 答完最后一题 → 原地全屏过渡到 AnalyzingScreen（沿用双人 test 页 `phase=completing` 范式）
  // 不依赖中间页，避免「题目未全部完成」闪现
  const [phase, setPhase] = useState<Phase>("answering");

  // 加载题目
  useEffect(() => {
    (async () => {
      try {
        // 来自 /s/[code] 落地 → 没有 testId 时自动创建一个并携带 ref
        // 让推荐者在被推荐者完成测评时 +1
        if (!testId && ref) {
          try {
            const visitorId = getOrCreateVisitorId();
            const r = await fetch(`/api/personality/tests`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ visitorId, referredByCode: ref }),
            });
            const j = await r.json();
            if (r.ok && j.testId) {
              // 用 router.replace 把 URL 升级为带 testId，避免回退栈错乱
              router.replace(`/personality/test?testId=${j.testId}&ref=${ref}`);
              return;
            }
          } catch {
            // 失败则当作没有 ref，正常后续提示
          }
        }

        const res = await fetch(`/api/personality/questions`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setQuestions(json.questions);
        // 从 localStorage 恢复草稿
        const draft = localStorage.getItem(`personality_draft_${testId}`);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            // 容错：仅当解析结果为「看起来像草稿的对象」时才采用，
            // 否则清掉坏草稿（避免人为篡改导致 UI 答题记录错位）。
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              const restoredAnswers =
                parsed.answers && typeof parsed.answers === "object" && !Array.isArray(parsed.answers)
                  ? (parsed.answers as Record<string, "A" | "B" | "C" | "D">)
                  : {};
              setAnswers(restoredAnswers);
              setIdx(typeof parsed.idx === "number" && parsed.idx >= 0 ? parsed.idx : 0);
            } else {
              console.warn("[personality test] 草稿数据无效，已丢弃", { draft });
              localStorage.removeItem(`personality_draft_${testId}`);
            }
          } catch (e) {
            console.warn("[personality test] 草稿 JSON 解析失败，已丢弃", e);
            localStorage.removeItem(`personality_draft_${testId}`);
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId, ref, router]);

  // 每次答完，保存草稿到 localStorage
  useEffect(() => {
    if (!testId || phase === "completing") return;
    localStorage.setItem(
      `personality_draft_${testId}`,
      JSON.stringify({ answers, idx })
    );
  }, [answers, idx, testId, phase]);

  const current = questions[idx];
  // 已答题数 = idx + 1（当前 idx 已经处于"待答"位置，但 progress 应该按"已确定的答题进度"）
  // 答完最后一题（handleAnswer 触发）后 setIdx 已经切到下一题/或进入 completing 阶段
  // 答最后一题时 idx 仍是 length-1，此处 (idx+1)/length = 100%
  // 进入 completing 后整页被 AnalyzingScreen 替换，下面这行不进 render
  const totalAnswered = Math.min(idx + 1, questions.length);
  const progress =
    questions.length > 0 ? (totalAnswered / questions.length) * 100 : 0;
  const selected = current ? answers[current.id] : undefined;

  const handleAnswer = async (letter: "A" | "B" | "C" | "D") => {
    if (!current || phase === "completing") return;
    const newAnswers = { ...answers, [current.id]: letter };
    setAnswers(newAnswers);

    // await 单题落库，避免 race（必须确保 complete 接收到 36 题）
    try {
      const res = await fetch(`/api/personality/tests/${testId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id, letter }),
      });
      if (!res.ok) {
        // 401/404/500/HTML 错误页都打回 setError，前端 stay 不前进
        let msg = `保存答案失败 (HTTP ${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          /* 回包不是 JSON（HTML 错误页），保留 HTTP 状态文本 */
        }
        throw new Error(msg);
      }
    } catch (e: any) {
      console.error("save answer failed", e);
      setError(e?.message || "保存答案失败，请重试");
      // 关键：单题落库失败，立即切回 answering，让用户可重试同一题
      setPhase("answering");
      return;
    }

    // 答完最后一题（AWAIT 后写盘）→ 切 completing 阶段，原地全屏过渡
    if (idx + 1 >= questions.length) {
      setPhase("completing");
      await completeTest();
    } else {
      // 自动下一题
      setTimeout(() => setIdx(idx + 1), 280);
    }
  };

  const goPrev = () => {
    if (idx === 0) return;
    setIdx(idx - 1);
  };

  const completeTest = async () => {
    try {
      const res = await fetch(`/api/personality/tests/${testId}/complete`, {
        method: "POST",
      });
      // 后端 4xx/5xx 时可能回 JSON 或 HTML 错误页，先按 status 分流
      if (!res.ok) {
        let msg = `完成测试失败 (HTTP ${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          /* 回包不是 JSON（HTML 错误页），保留 HTTP 状态文本避免外露英文堆栈 */
        }
        throw new Error(msg);
      }
      const json = await res.json();
      // 清草稿
      localStorage.removeItem(`personality_draft_${testId}`);
      // 跳转结果页
      router.push(`/personality/result/${testId}`);
      return json;
    } catch (e: any) {
      setError(e?.message || "完成测试失败");
      setPhase("answering");
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="text-sm text-[var(--text-muted)]">题目加载中...</p>
      </main>
    );
  }

  // 答完最后一题原地切到全屏过渡页（沿用双人 test 页 phase=completing 范式）
  if (phase === "completing") {
    return (
      <AnalyzingScreen
        title="请稍候，正在生成你的人格画像"
        hint="约需 5–15 秒，请不要关闭页面"
      />
    );
  }

  if (!current) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-[var(--danger)]">{error || "题目不存在"}</p>
        <Link href="/personality" className="btn-ghost">返回测试入口</Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-5 pt-0 pb-8 sm:px-6 sm:pb-10 max-w-xl mx-auto w-full safe-bottom">
      {ref && (
        <p className="text-[11px] text-[var(--text-muted)] mt-4 mb-2 fade-in text-center">
          来自好友的分享 · 不会留下你的测试记录给对方
        </p>
      )}
      {/* 进度：sticky 顶部，方便答题时随时看到 */}
      <div className="sticky top-0 z-20 w-full bg-[var(--bg-dark)]/95 backdrop-blur-sm -mx-5 px-5 sm:-mx-6 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-[var(--border-dim)] fade-in">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
          <span className="font-mono">
            {totalAnswered} / {questions.length}
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
          {current.question}
        </p>
      </div>

      {/* 选项 */}
      <div className="w-full space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 fade-in" style={{ animationDelay: "0.1s" }}>
        {ANSWER_OPTIONS.map((opt) => {
          const isSelected = selected === opt.letter;
          return (
            <button
              key={opt.letter}
              onClick={() => handleAnswer(opt.letter)}
              className={`w-full min-h-[56px] text-left px-4 py-3.5 sm:px-5 sm:py-4 rounded-lg border transition-all ${
                isSelected
                  ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--text-warm)]"
                  : "bg-[rgba(245,237,224,0.04)] border-[var(--border-dim)] text-[var(--text-warm)] active:bg-[rgba(201,169,110,0.12)] active:border-[var(--accent-dim)]"
              }`}
            >
              <span className="text-[var(--accent)] font-mono mr-2 sm:mr-3">{opt.letter}</span>
              {opt.label}
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
          <p className="text-xs text-[var(--danger)] mb-3 text-center">{error}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {/* 出错时给用户两条出路：重试最后一题 / 跳过看结果（即便数据不完整） */}
            <button
              type="button"
              onClick={() => {
                setError("");
                if (idx + 1 >= questions.length && phase === "answering") {
                  completeTest();
                }
              }}
              className="text-xs px-3 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] active:bg-[var(--accent)]/15 min-h-[40px]"
            >
              重试
            </button>
            <Link
              href={`/personality/result/${testId}`}
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
