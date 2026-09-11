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
  const [phase, setPhase] = useState<"initial" | "followup" | "completing">("initial");
  const [error, setError] = useState("");
  const [questionShownAt, setQuestionShownAt] = useState(() => Date.now());

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/assessments/${sessionId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        if (json.hasResult) {
          router.push(`/result/${sessionId}`);
          return;
        }

        setData(json);
        setAllQuestions([...json.initialQuestions, ...json.followupQuestions]);
        const existingAnswers: Record<string, number> = {};
        json.answeredIds.forEach((id: string) => {
          existingAnswers[id] = -1; // mark as answered (value will be fetched separately)
        });
        setAnswers(existingAnswers);

        // Determine phase based on followups
        if (json.followupQuestions.length > 0) {
          setPhase("followup");
          setCurrentIdx(json.initialQuestions.length);
        }
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
  }, [currentIdx, phase]);

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

      // Wait a moment for UX, then move to next
      setTimeout(() => {
        setSelectedValue(null);
        const nextIdx = currentIdx + 1;

        // Check if we've finished initial 20 and need to fetch followups
        if (data && nextIdx === data.initialQuestions.length && phase === "initial") {
          // Fetch follow-ups
          fetchFollowups();
        } else if (nextIdx >= allQuestions.length) {
          // All done
          completeAssessment();
        } else {
          setCurrentIdx(nextIdx);
        }
        setSubmitting(false);
      }, 350);
    } catch (err) {
      setSubmitting(false);
      setSelectedValue(null);
    }
  }, [currentIdx, allQuestions, submitting, sessionId, data, phase, questionShownAt]);

  const fetchFollowups = async () => {
    try {
      setPhase("completing");
      const res = await fetch(`/api/assessments/${sessionId}/followups`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (json.followups.length === 0) {
        // No followups, go straight to complete
        completeAssessment();
      } else {
        setAllQuestions((prev) => [...prev, ...json.followups]);
        setPhase("followup");
        setCurrentIdx((prev) => prev + 0); // stays at same index, now pointing to first followup
        // Actually we need to set currentIdx to data.initialQuestions.length
        setCurrentIdx(data!.initialQuestions.length);
      }
    } catch (err: any) {
      setError(err.message || "加载追问题失败");
      setPhase("initial");
    }
  };

  const completeAssessment = async () => {
    try {
      setPhase("completing");
      const res = await fetch(`/api/assessments/${sessionId}/complete`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      router.push(`/result/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "完成测评失败");
      setPhase("followup");
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
        <button onClick={() => router.push("/start")} className="btn-ghost">
          重新开始
        </button>
      </main>
    );
  }

  // 进入 completing 阶段（等追问题 / 生成报告）即全屏过渡，不再依赖 currentIdx 边界判断
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
    <main className="flex-1 flex flex-col items-center px-6 py-8 max-w-xl mx-auto w-full min-h-screen">
      {/* Progress */}
      <div className="w-full mb-12">
        <div className="flex items-center justify-between mb-3">
          <span className="archive-label">
            {isFollowup ? "Follow-up" : "Step 02"}
          </span>
          <span className="file-number">
            {currentIdx + 1} / {totalQuestions}
          </span>
        </div>
        <div className="progress-track h-1">
          <div className="progress-fill h-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="w-full flex-1 flex flex-col justify-center" key={question.id}>
        <div className="fade-in-up" key={currentIdx}>
          {isFollowup && (
            <p className="text-xs text-[var(--accent)] mb-4 tracking-wider">
              · 根据你之前的回答，系统想再确认几件事 ·
            </p>
          )}
          <h2 className="display-serif text-xl md:text-2xl text-[var(--text-warm)] leading-relaxed mb-10">
            {question.text}
          </h2>

          {/* Options */}
          <div className={`space-y-3 ${question.kind === "forced_choice" ? "grid grid-cols-1 gap-3" : ""}`}>
            {options.map((option, idx) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option.value)}
                disabled={submitting}
                className={`option-card w-full text-left px-5 py-4 rounded flex items-center gap-4 fade-in-up ${
                  selectedValue === option.value ? "selected" : ""
                }`}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <span className="w-6 h-6 rounded-full border border-[var(--border-dim)] flex items-center justify-center text-xs text-[var(--text-muted)] flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-[15px] text-[var(--text-warm)]">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--danger)] mt-4">{error}</p>
      )}

      <HomeFooter />
    </main>
  );
}
