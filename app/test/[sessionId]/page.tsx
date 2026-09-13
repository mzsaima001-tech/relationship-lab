"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Question, QuestionOption } from "@/lib/assessment/types";
import { LIKERT_OPTIONS } from "@/lib/assessment/types";
import { AnalyzingScreen } from "@/app/components/AnalyzingScreen";
import HomeFooter from "@/app/components/HomeFooter";

interface SessionData {
  sessionId: string;
  status: string;
  nickname: string;
  initialQuestions: Question[];
  followupQuestions: Question[];
  answeredIds: string[];
  hasResult: boolean;
}

export default function TestPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [data, setData] = useState<SessionData | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // phase 仅用于进入 completing 时切分析页；UI 上不再区分 Step02 / Follow-up
  const [phase, setPhase] = useState<"answering" | "completing">("answering");
  const [error, setError] = useState("");
  const [questionShownAt, setQuestionShownAt] = useState(() => Date.now());

  useEffect(() => {
    async function fetchSession() {
      try {
        // 1. 取 session（含 initial 题 + 已答记录）
        const res = await fetch(`/api/assessments/${sessionId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        if (json.hasResult) {
          router.push(`/result/${sessionId}`);
          return;
        }

        // 2. 【关键】开答前把 followup 题也拿齐：
        //    session 已有 followup_ids（老 session 恢复）则直接用；
        //    否则调 followups API 生成。全部题一次性到位，
        //    答题过程中绝不出现"中间等待页 + 二次发卷"。
        let followups: Question[] = json.followupQuestions || [];
        if (followups.length === 0) {
          const fuRes = await fetch(`/api/assessments/${sessionId}/followups`);
          const fuJson = await fuRes.json();
          if (!fuRes.ok) throw new Error(fuJson.error || "追加题加载失败");
          followups = fuJson.followups || [];
        }

        const all: Question[] = [...json.initialQuestions, ...followups];
        setData(json);
        setAllQuestions(all);

        // 恢复已答记录，并直接跳到第一题未答的位置（断点续答）
        const existingAnswers: Record<string, number> = {};
        json.answeredIds.forEach((id: string) => {
          existingAnswers[id] = -1;
        });
        setAnswers(existingAnswers);
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

      // 180ms 让"已选中"视觉反馈出现，然后立即切下一题
      setTimeout(() => {
        setSelectedValue(null);
        const nextIdx = currentIdx + 1;

        if (nextIdx >= allQuestions.length) {
          // 全部题目答完，进入分析阶段
          completeAssessment();
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
  }, [currentIdx, allQuestions, submitting, sessionId, questionShownAt]);

  const completeAssessment = async () => {
    try {
      setPhase("completing");
      // fire-and-forget 触发后端 LLM 润色
      fetch(`/api/assessments/${sessionId}/complete`, { method: "POST" }).catch(() => {});
      // 立即轮询 result
      const FALLBACK_MS = 15000;
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
        if (Date.now() - startedAt > FALLBACK_MS) {
          // 兜底跳：超时直接进入结果页（结果可能只是模板版，但能进入）
          router.push(`/result/${sessionId}`);
          return;
        }
        setTimeout(tick, 1200);
      };
      setTimeout(tick, 400);
    } catch (err: any) {
      setError(err.message || "完成测评失败");
      setPhase("answering");
    }
  };

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

  // 进入 completing 阶段（生成报告）才全屏过渡
  if (phase === "completing") {
    return <AnalyzingScreen />;
  }

  const question = allQuestions[currentIdx];
  if (!question) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[var(--text-muted)] text-sm">题目加载完毕</p>
        <button onClick={() => completeAssessment()} className="btn-primary">
          查看结果 →
        </button>
      </main>
    );
  }

  const totalQuestions = allQuestions.length || 24;
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

  return (
    <main className="flex-1 flex flex-col items-center px-5 pt-0 pb-8 sm:px-6 sm:pb-10 max-w-xl mx-auto w-full min-h-screen safe-bottom">
      {/* 进度条 sticky 顶部 —— 答题时随时看到进度，滚动/键盘弹起也不丢 */}
      <div className="sticky top-0 z-20 w-full bg-[var(--bg-dark)]/95 backdrop-blur-sm -mx-5 px-5 sm:-mx-6 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-[var(--border-dim)]">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="archive-label text-[0.65rem] sm:text-[0.7rem]">
            默契测试
          </span>
          <span className="file-number text-[0.65rem] sm:text-[0.7rem]">
            {currentIdx + 1} / {totalQuestions}
          </span>
        </div>
        <div className="progress-track h-1">
          <div className="progress-fill h-full" style={{ width: `${progress}%` }} />
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