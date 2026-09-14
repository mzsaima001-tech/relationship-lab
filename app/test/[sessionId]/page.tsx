"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Question, QuestionOption } from "@/lib/assessment/types";
import { LIKERT_OPTIONS } from "@/lib/assessment/types";
import { AnalyzingScreen } from "@/app/components/AnalyzingScreen";
import HomeFooter from "@/app/components/HomeFooter";
import { getOrCreateVisitorId } from "@/lib/visitor";

interface SessionData {
  sessionId: string;
  status: string;
  nickname: string;
  initialQuestions: Question[];
  followupQuestions: Question[];
  answeredIds: string[];
  hasResult: boolean;
}

/**
 * 答题流程（单页连续体验）：
 * 1. 进页面只加载 initial 题（如 20 道），立即开答
 * 2. 答到倒数第 3 道时，后台静默请求 followups（此时大部分答案已出，追加题基本定准）
 * 3. 答完 initial 最后一题：
 *    - followups 已就绪 → 无缝继续第 21 题，同一页面、同一进度条
 *    - 未就绪 → 题目区内联"正在为你定制最后几道题"（非全屏、非跳转），就绪后继续
 * 4. 全部题答完 → 才进入 AnalyzingScreen（全屏分析）→ 结果页
 */
export default function TestPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [data, setData] = useState<SessionData | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [initialCount, setInitialCount] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // phase 仅用于「全部答完 → 生成报告」的全屏过渡；答题过程中绝不出现
  const [phase, setPhase] = useState<"answering" | "completing">("answering");
  const [error, setError] = useState("");
  const [questionShownAt, setQuestionShownAt] = useState(() => Date.now());
  // followups 请求状态：idle → pending → done / failed
  const [followupState, setFollowupState] = useState<"idle" | "pending" | "done" | "failed">("idle");
  const followupPromiseRef = useRef<Promise<void> | null>(null);
  // allQuestions 的最新镜像（setTimeout/await 闭包里读不到最新 state，用 ref 兜底）
  const allQuestionsRef = useRef<Question[]>([]);
  useEffect(() => {
    allQuestionsRef.current = allQuestions;
  }, [allQuestions]);

  useEffect(() => {
    async function fetchSession() {
      try {
        // 兜底登记：即使用户直接从收藏/历史进入答题页，「我的结果」按钮也能找回这份记录
        try {
          localStorage.setItem("sessionId", sessionId);
        } catch {
          /* 写不动忽略 */
        }
        const res = await fetch(`/api/assessments/${sessionId}`);
        const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) {
          // 拼接 server 返回的 detail，便于排查
          const msg = json.detail ? `${json.error}（${json.detail}）` : (json.error || `HTTP ${res.status}`);
          throw new Error(msg);
        }

        if (json.hasResult) {
          router.push(`/result/${sessionId}`);
          return;
        }

        const initial: Question[] = json.initialQuestions || [];
        // 老 session 恢复：followup_ids 已锁定过，直接用现成的追加题
        const existingFollowups: Question[] = json.followupQuestions || [];
        const all = [...initial, ...existingFollowups];

        setData(json);
        setAllQuestions(all);
        setInitialCount(initial.length);
        if (existingFollowups.length > 0) setFollowupState("done");

        const existingAnswers: Record<string, number> = {};
        json.answeredIds.forEach((id: string) => {
          existingAnswers[id] = -1;
        });
        setAnswers(existingAnswers);

        // 断点续答：跳到第一题未答的位置
        const firstUnanswered = all.findIndex(
          (q) => !json.answeredIds.includes(q.id)
        );
        setCurrentIdx(firstUnanswered === -1 ? all.length : firstUnanswered);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId, router]);

  useEffect(() => {
    setQuestionShownAt(Date.now());
  }, [currentIdx]);

  // —— 静默请求 followups：答到倒数第 3 道 initial 时触发 ——
  // 注意：followups API 会按「当前已答」计算并锁定 followup_ids，
  // 绝不能 0 答案时调用（会锁定为空列表）。
  const requestFollowups = useCallback(() => {
    if (followupPromiseRef.current) return;
    setFollowupState("pending");
    const p = (async () => {
      try {
        const res = await fetch(`/api/assessments/${sessionId}/followups`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "追加题加载失败");
        const followups: Question[] = json.followups || [];
        if (followups.length > 0) {
          setAllQuestions((prev) => {
            // 防重：已包含这些题就不再追加
            const ids = new Set(prev.map((q) => q.id));
            const fresh = followups.filter((q) => !ids.has(q.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
        setFollowupState("done");
      } catch (err: any) {
        console.warn("[followups] failed:", err?.message);
        setFollowupState("failed");
      }
    })();
    followupPromiseRef.current = p;
  }, [sessionId]);

  const completeAssessment = useCallback(async () => {
    try {
      setPhase("completing");
      // fire-and-forget 触发后端 LLM 润色（同步执行，最长 ~60s）
      // 带统一访客 ID：若本 session 来自邀请链接，后端据此给分享人 +1 积分（按人去重）
      fetch(`/api/assessments/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getOrCreateVisitorId() }),
      }).catch(() => {});
      // 轮询 result，就绪才跳：绝不中途跳走（中途跳走会被结果页弹回形成死循环）
      const MAX_WAIT_MS = 300000; // 极端兜底 5 分钟；分析等待页 90s 后自带给用户的提示
      const startedAt = Date.now();
      const tick = async () => {
        try {
          const r = await fetch(`/api/assessments/${sessionId}/complete`, { method: "GET" });
          if (r.ok) {
            router.push(`/result/${sessionId}`);
            return;
          }
        } catch {
          /* 网络抖动继续轮询 */
        }
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          // 兜底跳转：结果页自身也会原地等待轮询，不会弹回答题页
          router.push(`/result/${sessionId}`);
          return;
        }
        setTimeout(tick, 1500);
      };
      setTimeout(tick, 600);
    } catch (err: any) {
      setError(err.message || "完成测评失败");
      setPhase("answering");
    }
  }, [sessionId, router]);

  // 全部题答完（含断点续答进来就已全答完的情况）→ 自动进分析等待页，无需用户再点
  const autoCompleteFiredRef = useRef(false);
  useEffect(() => {
    if (loading || !data || phase !== "answering") return;
    if (allQuestions.length === 0) return;
    if (currentIdx < allQuestions.length) return;
    if (autoCompleteFiredRef.current) return;
    autoCompleteFiredRef.current = true;
    completeAssessment();
  }, [loading, data, phase, allQuestions.length, currentIdx, completeAssessment]);

  const handleAnswer = useCallback(async (value: number) => {
    if (!allQuestions[currentIdx] || submitting) return;

    const question = allQuestions[currentIdx];
    const answeredAt = Date.now();
    setSubmitting(true);
    setSelectedValue(value);

    try {
      const res = await fetch(`/api/assessments/${sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          value,
          shownAt: questionShownAt,
          answeredAt,
          responseTimeMs: Math.max(0, answeredAt - questionShownAt),
        }),
      });

      if (!res.ok) throw new Error("保存失败");

      setAnswers((prev) => ({ ...prev, [question.id]: value }));

      // 答到倒数第 3 道 initial 时，后台静默预取 followups
      const nextIdxPreview = currentIdx + 1;
      if (
        followupState === "idle" &&
        initialCount > 0 &&
        nextIdxPreview >= initialCount - 3 &&
        nextIdxPreview < initialCount
      ) {
        requestFollowups();
      }

      // 180ms 让"已选中"视觉反馈出现，然后立即切下一题
      setTimeout(async () => {
        setSelectedValue(null);
        const nextIdx = currentIdx + 1;

        if (nextIdx >= allQuestionsRef.current.length) {
          // 已到当前已加载题的末尾：
          // - followups 还在路上 → 等它就绪（题目区内联等待，非全屏）
          // - 已就绪 / 失败（当 0 道处理）→ 全部答完，进分析页
          if (followupPromiseRef.current) {
            await followupPromiseRef.current;
          }
          if (nextIdx >= allQuestionsRef.current.length) {
            completeAssessment();
          } else {
            setCurrentIdx(nextIdx);
          }
        } else {
          setCurrentIdx(nextIdx);
        }
        setSubmitting(false);
      }, 180);
    } catch (err) {
      setSubmitting(false);
      setSelectedValue(null);
      setError("答案保存失败，请检查网络后重试");
    }
  }, [currentIdx, allQuestions, submitting, sessionId, questionShownAt, followupState, initialCount, requestFollowups, completeAssessment]);

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-[var(--text-muted)] text-sm">正在准备你的题目...</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-ghost"
        >
          重新加载
        </button>
      </main>
    );
  }

  // 全部答完 → 生成报告的全屏过渡（整个流程只出现这一次）
  if (phase === "completing") {
    return <AnalyzingScreen />;
  }

  const question = allQuestions[currentIdx];

  // 边界：题已答完但 completing 阶段尚未渲染（如断点续答发现全答过）
  // —— 上面的 useEffect 已自动触发 completeAssessment，这里直接展示等待页，绝不让用户再点一次
  if (!question) {
    return <AnalyzingScreen title="题目已全部答完，正在生成你的报告" />;
  }

  const totalQuestions = allQuestions.length;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;

  // Determine options for this question
  let options: { id: string; label: string; value: number }[] = [];

  if (question.options && question.options.length > 0) {
    options = question.options.map((o: QuestionOption) => ({
      id: o.id,
      label: o.label,
      value: o.value,
    }));
  } else {
    // Likert scale
    options = LIKERT_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      value: o.value,
    }));
  }

  const isFollowup = question.phase === "followup";
  // 当前题是「已加载的最后一题」且 followups 还在路上 → 本题答完会有短暂内联等待
  const isLastLoaded = currentIdx === allQuestions.length - 1;
  const waitingFollowups = isLastLoaded && followupState === "pending";

  return (
    <main className="flex-1 flex flex-col items-center px-5 pt-0 pb-8 sm:px-6 sm:pb-10 max-w-xl mx-auto w-full min-h-screen safe-bottom">
      {/* 进度条 sticky 顶部 —— 答题时随时看到进度，滚动/键盘弹起也不丢 */}
      <div className="sticky top-0 z-20 w-full bg-[var(--bg-dark)]/95 backdrop-blur-sm -mx-5 px-5 sm:-mx-6 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-[var(--border-dim)]">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="archive-label text-[0.65rem] sm:text-[0.7rem]">
            默契测试
          </span>
          <span className="file-number text-[0.65rem] sm:text-[0.7rem]">
            第 {currentIdx + 1} 题 / 共 {totalQuestions} 题
          </span>
        </div>
        <div className="progress-track h-1">
          <div
            className="progress-fill h-full"
            style={{ width: `${progress}%`, transition: "width 0.3s ease-out" }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="w-full flex-1 flex flex-col pt-6 sm:pt-10" key={question.id}>
        <div className="fade-in-up" key={currentIdx}>
          {isFollowup && (
            <p className="text-xs text-[var(--accent)] mb-3 sm:mb-4 tracking-wider text-center sm:text-left">
              · 根据你之前的回答，系统想再确认几件事 ·
            </p>
          )}
          <h2 className="display-serif text-lg sm:text-xl md:text-2xl text-[var(--text-warm)] leading-relaxed mb-6 sm:mb-10">
            {question.text}
          </h2>

          {/* Options */}
          <div className={`space-y-2.5 sm:space-y-3 ${question.kind === "forced_choice" ? "grid grid-cols-1 gap-2.5 sm:gap-3" : ""}`}>
            {options.map((option, idx) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option.value)}
                disabled={submitting}
                className={`option-card w-full text-left px-4 py-3.5 sm:px-5 sm:py-4 rounded flex items-center gap-3 sm:gap-4 fade-in-up ${
                  selectedValue === option.value ? "selected" : ""
                }`}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <span className="w-6 h-6 rounded-full border border-[var(--border-dim)] flex items-center justify-center text-xs text-[var(--text-muted)] flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-[15px] sm:text-[15px] text-[var(--text-warm)]">
                  {option.label}
                </span>
              </button>
            ))}
          </div>

          {/* 内联等待：最后一题已答、追加题在路上（非全屏，不打断节奏） */}
          {waitingFollowups && (
            <p className="text-center text-xs text-[var(--text-muted)] mt-6 animate-pulse">
              正在根据你的回答定制最后几道题…
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 px-3 py-2 rounded text-xs text-[var(--danger)] bg-[rgba(220,80,80,0.08)] border border-[rgba(220,80,80,0.25)]">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-3 underline text-[10px]"
          >
            知道了
          </button>
        </div>
      )}

      <HomeFooter />
    </main>
  );
}
