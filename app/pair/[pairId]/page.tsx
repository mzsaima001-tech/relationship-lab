"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const DIMENSION_LABELS: Record<string, string> = {
  response_need: "回应需求",
  expression: "表达倾向",
  space_need: "空间需求",
  emotional_sensitivity: "情绪感知",
  conflict_urgency: "冲突节奏",
  repair_orientation: "修复意愿",
};

const PAIR_DIMENSION_LABELS: Record<string, string> = {
  attention: "默契度",
  communication: "沟通契合",
  distanceRhythm: "距离节奏",
  conflictRepair: "冲突修复",
  longTermComfort: "长期舒适",
  overall: "综合默契",
};

interface PersonData {
  nickname: string;
  archetype: string;
  scores: Record<string, number>;
  signals: Record<string, unknown>;
  tags: string[];
  context: { relationshipType: string; duration: string };
}

interface PairData {
  status: string;
  message?: string;
  pairScores?: {
    attention: number;
    communication: number;
    distanceRhythm: number;
    conflictRepair: number;
    longTermComfort: number;
    overall: number;
  };
  patterns?: Array<{
    pattern: string;
    name: string;
    confidence: number;
    severity: number;
    isPrimary: boolean;
  }>;
  strengths?: string[];
  personA?: PersonData;
  personB?: PersonData;
}

interface PairReport {
  relationshipType: string;
  headline: string;
  summary: string;
  attraction: string;
  personANeeds: string;
  personBNeeds: string;
  interactionCycle: string;
  conflictPattern: string;
  risks: string[];
  suggestions: string[];
  communicationScripts: { situation: string; personA: string; personB: string }[];
}

const PATTERN_DESCS: Record<string, string> = {
  A_APPROACH_B_WITHDRAW: "A 容易主动靠近确认关系，B 在压力增加后更需要空间。可能出现「A 越靠近，B 越后退」的循环。",
  B_APPROACH_A_WITHDRAW: "B 容易主动靠近确认关系，A 在压力增加后更需要空间。可能出现「B 越靠近，A 越后退」的循环。",
  A_SOLVE_NOW_B_NEEDS_PAUSE: "矛盾发生时，A 希望尽快解决，B 需要先冷静。这个节奏差异可能让两人都感到不被理解。",
  B_SOLVE_NOW_A_NEEDS_PAUSE: "矛盾发生时，B 希望尽快解决，A 需要先冷静。这个节奏差异可能让两人都感到不被理解。",
  A_SENSES_B_SILENT: "A 感知力强，容易察觉 B 的变化；但 B 不太主动表达，A 会反复猜测。",
  B_SENSES_A_SILENT: "B 感知力强，容易察觉 A 的变化；但 A 不太主动表达，B 会反复猜测。",
};

export default function PairPage() {
  const params = useParams<{ pairId: string }>();
  const pairId = params.pairId;

  const [data, setData] = useState<PairData | null>(null);
  const [report, setReport] = useState<PairReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [paying, setPaying] = useState(false);
  const [mySessionId, setMySessionId] = useState("");

  useEffect(() => {
    setMySessionId(localStorage.getItem("sessionId") || "");
  }, []);

  useEffect(() => {
    async function fetchPair() {
      try {
        const res = await fetch(`/api/pair/${pairId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);

        // If both completed, generate report
        if (json.status === "completed" && json.personA && json.personB) {
          generateReport();
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPair();
  }, [pairId]);

  const handlePairUnlock = async () => {
    setPaying(true);
    try {
      let currentPaymentId = paymentId;
      if (!currentPaymentId) {
        const orderRes = await fetch("/api/payments/pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pairId }),
        });
        const orderJson = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderJson.error);
        if (orderJson.unlocked) {
          setUnlocked(true);
          await generateReport();
          return;
        }
        currentPaymentId = orderJson.payment.id;
        setPaymentId(currentPaymentId);
      }
      const confirmRes = await fetch(`/api/payments/${currentPaymentId}/confirm`, { method: "POST" });
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmJson.error);
      setUnlocked(true);
      await generateReport();
    } catch (err: any) {
      setError(err.message || "支付失败");
    } finally {
      setPaying(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReport(json.report);
      setUnlocked(Boolean(json.unlocked));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm mt-4">正在加载关系档案...</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <Link href="/" className="btn-ghost">返回首页</Link>
      </main>
    );
  }

  if (!data) return null;

  // Waiting for Person B
  if (data.status === "waiting_b" || data.status === "waiting_a") {
    const personA = data.personA;
    return (
      <main className="flex-1 px-5 py-8 sm:px-6 sm:py-12 max-w-xl mx-auto w-full safe-bottom">
        <div className="text-center fade-in-up">
          <div className="flex items-center justify-center gap-4 mb-6 sm:mb-8">
            <span className="archive-label">Relationship Pair</span>
            <span className="w-8 h-px bg-[var(--border-dim)]" />
            <span className="file-number">WAITING</span>
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-6 sm:mb-8" />

          <h2 className="display-serif text-lg sm:text-xl text-[var(--text-warm)] mb-3">
            {data.message || "等待 TA 完成测评"}
          </h2>

          {personA && (
            <div className="card p-5 sm:p-6 mt-6 sm:mt-8">
              <p className="text-sm text-[var(--text-muted)] mb-2">
                {personA.nickname} 已完成测评
              </p>
              <p className="text-lg text-[var(--accent)] display-serif">
                {personA.archetype}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {personA.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 text-xs text-[var(--text-muted)] border border-[var(--border-dim)] rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)] mt-6 sm:mt-8 leading-relaxed px-2">
            TA 完成后会自动生成双人关系分析。请保持页面打开，或稍后回来查看。
          </p>

          <div className="mt-6 sm:mt-8">
            {mySessionId ? (
              <Link href={`/result/${mySessionId}`} className="btn-ghost inline-block min-h-[44px]">
                ← 返回我的报告
              </Link>
            ) : (
              <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] active:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4">
                ← 返回首页
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Both completed - show full report
  const { personA, personB, pairScores, patterns } = data;

  if (!personA || !personB || !pairScores) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-[var(--text-muted)] text-sm">数据不完整</p>
        <Link href="/" className="btn-ghost">返回首页</Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 py-8 sm:px-6 sm:py-12 max-w-2xl mx-auto w-full safe-bottom">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-12 fade-in-up">
        <div className="flex items-center justify-center gap-4 mb-5 sm:mb-6">
          <span className="archive-label">Relationship Pair</span>
          <span className="w-8 h-px bg-[var(--border-dim)]" />
          <span className="file-number">No. {pairId.slice(0, 6).toUpperCase()}</span>
        </div>
        <h1 className="display-serif text-xl sm:text-2xl md:text-3xl text-[var(--text-warm)] leading-tight">
          {personA.nickname} × {personB.nickname}
        </h1>
        <p className="display-serif text-base sm:text-lg text-[var(--accent)] mt-2">
          {report ? `「${report.headline}」` : `「${personA.archetype} × ${personB.archetype}」`}
        </p>
      </div>

      {/* Pair scores — 高亮突出综合默契分数 */}
      <div
        className="space-y-4 sm:space-y-5 mb-10 sm:mb-12 fade-in-up p-4 sm:p-5 rounded-2xl border-2"
        style={{
          animationDelay: "0.15s",
          background: "var(--highlight-bg)",
          borderColor: "var(--highlight)",
        }}
      >
        <div className="flex items-center gap-3">
          <h3 className="archive-label" style={{ color: "var(--highlight)" }}>
            Pair Scores · 双人默契指数
          </h3>
        </div>
        {Object.entries(pairScores).map(([key, score]) => {
          const label = PAIR_DIMENSION_LABELS[key] || key;
          const isOverall = key === "overall";
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span
                  className={`text-sm ${
                    isOverall
                      ? "text-[var(--highlight)] font-semibold text-base"
                      : "text-[var(--text-warm)]"
                  } truncate`}
                >
                  {label}
                </span>
                <span
                  className={`font-mono whitespace-nowrap ${
                    isOverall
                      ? "text-[var(--highlight)] text-xl font-bold"
                      : "text-[var(--text-muted)] text-sm"
                  }`}
                >
                  {score}
                </span>
              </div>
              <div
                className="dim-bar-track"
                style={{ height: isOverall ? "10px" : "6px" }}
              >
                <div
                  className="dim-bar-fill h-full"
                  style={{
                    width: `${score}%`,
                    background: isOverall
                      ? "linear-gradient(90deg, var(--highlight), var(--cta))"
                      : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dimension comparison */}
      <div className="card p-4 mb-10 sm:p-6 sm:mb-12 fade-in-up" style={{ animationDelay: "0.25s" }}>
        <h3 className="archive-label mb-4">Dimension Comparison</h3>
        <div className="space-y-4">
          {Object.entries(personA.scores).map(([key, scoreA]) => {
            const scoreB = personB.scores[key];
            const label = DIMENSION_LABELS[key] || key;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-muted)]">{label}</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    {scoreA} vs {scoreB}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex justify-end">
                    <div
                      className="h-2 rounded-l-full bg-[var(--accent-dim)]"
                      style={{ width: `${scoreA}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] px-1">|</span>
                  <div className="flex-1">
                    <div
                      className="h-2 rounded-r-full bg-[var(--accent)]"
                      style={{ width: `${scoreB}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-[var(--accent-dim)]">{personA.nickname}</span>
                  <span className="text-xs text-[var(--accent)]">{personB.nickname}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared strengths */}
      {data.strengths && data.strengths.length > 0 && (
        <div className="card p-4 mb-5 sm:p-6 sm:mb-10 fade-in-up" style={{ animationDelay: "0.28s" }}>
          <h3 className="archive-label mb-4">Shared Strengths</h3>
          <div className="space-y-2.5 sm:space-y-3">
            {data.strengths.map((strength) => (
              <div key={strength} className="flex gap-2.5 sm:gap-3">
                <span className="text-[var(--accent)] flex-shrink-0">+</span>
                <p className="text-[15px] sm:text-sm text-[var(--text-warm)] leading-relaxed">{strength}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {patterns && patterns.length > 0 && (
        <div className="card p-4 mb-10 sm:p-6 sm:mb-12 fade-in-up" style={{ animationDelay: "0.3s" }}>
          <h3 className="archive-label mb-4">Interaction Patterns</h3>
          <div className="space-y-2.5 sm:space-y-3">
            {patterns.map((pattern) => (
              <div key={pattern.pattern} className="flex gap-2.5 sm:gap-3">
                <span className="text-[var(--accent)] flex-shrink-0">·</span>
                <div>
                  <p className="text-[15px] sm:text-sm text-[var(--text-warm)] leading-relaxed">
                    {pattern.isPrimary ? "主模式 · " : "次模式 · "}{pattern.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    置信度 {pattern.confidence} · 影响程度 {pattern.severity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full report */}
      {generating && (
        <div className="text-center py-10 sm:py-12 fade-in">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-muted)]">正在撰写你们的关系分析报告...</p>
        </div>
      )}

      {report && !generating && !unlocked && (
        <div
          className="p-7 text-center mb-10 fade-in-up rounded-2xl border-2"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            borderColor: "var(--cta)",
            boxShadow: "0 8px 24px -8px rgba(239, 68, 68, 0.45)",
          }}
        >
          <span className="archive-label" style={{ color: "var(--cta)" }}>
            Full Pair Report · 解锁完整双人报告
          </span>
          <h3 className="display-serif text-xl text-[var(--text-warm)] mt-3 mb-3">
            已识别你们的主互动模式
          </h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
            免费预览展示六维对比、共同优势和主模式名称。解锁后可查看双方体验、完整循环、放大条件、次模式、具体建议与沟通话术。
          </p>
          <p className="text-4xl font-bold font-mono mb-2" style={{ color: "var(--cta)" }}>
            ¥19.9
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            双人报告不可使用积分抵扣
          </p>
          <button
            onClick={handlePairUnlock}
            disabled={paying}
            className="w-full py-3 px-6 rounded-xl font-semibold transition-all"
            style={{
              background: "var(--cta)",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35)",
            }}
          >
            {paying ? "正在处理..." : "🔓 支付 19.9 元解锁完整双人报告"}
          </button>
          <p className="text-[10px] text-[var(--text-muted)] mt-4">
            当前本地版使用模拟支付；云端上线时接入正式支付。
          </p>
        </div>
      )}

      {report && !generating && unlocked && (
        <div className="space-y-8 fade-in-up" style={{ animationDelay: "0.35s" }}>
          {/* Summary */}
          <div className="card p-6">
            <h3 className="archive-label mb-3">关系中的隐藏需求</h3>
            <p className="display-serif text-lg text-[var(--accent)] mb-4">{report.headline}</p>
            <p className="text-sm text-[var(--text-warm)] leading-relaxed">{report.summary}</p>
          </div>

          {/* Attraction */}
          <div className="card p-6">
            <h3 className="archive-label mb-3">谁更容易主动投入</h3>
            <p className="text-sm text-[var(--text-warm)] leading-relaxed">{report.attraction}</p>
          </div>

          {/* Needs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-6">
              <h3 className="archive-label mb-3">{personA.nickname} · 他真正需要的相处方式</h3>
              <p className="text-sm text-[var(--text-warm)] leading-relaxed">{report.personANeeds}</p>
            </div>
            <div className="card p-6">
              <h3 className="archive-label mb-3">{personB.nickname} · 他真正需要的相处方式</h3>
              <p className="text-sm text-[var(--text-warm)] leading-relaxed">{report.personBNeeds}</p>
            </div>
          </div>

          {/* Interaction Cycle */}
          <div className="card p-6">
            <h3 className="archive-label mb-3">沟通方式差异</h3>
            <p className="text-sm text-[var(--text-warm)] leading-relaxed whitespace-pre-line">{report.interactionCycle}</p>
          </div>

          {/* Conflict Pattern */}
          <div className="card p-6">
            <h3 className="archive-label mb-3">你们最容易爆发矛盾的地方</h3>
            <p className="text-sm text-[var(--text-warm)] leading-relaxed">{report.conflictPattern}</p>
          </div>

          {/* Risks */}
          <div className="card p-6">
            <h3 className="archive-label mb-3">长期相处风险</h3>
            <div className="space-y-3">
              {report.risks.map((risk, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[var(--danger)] flex-shrink-0 text-sm">·</span>
                  <p className="text-sm text-[var(--text-warm)] leading-relaxed">{risk}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="card p-6">
            <h3 className="archive-label mb-3">怎样让关系更舒服</h3>
            <div className="space-y-3">
              {report.suggestions.map((suggestion, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[var(--accent)] flex-shrink-0 text-sm">{i + 1}.</span>
                  <p className="text-sm text-[var(--text-warm)] leading-relaxed">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Communication Scripts */}
          <div className="card p-6">
            <h3 className="archive-label mb-3">沟通方式差异（话术参考）</h3>
            <div className="space-y-6">
              {report.communicationScripts.map((script, i) => (
                <div key={i} className="border-l-2 border-[var(--border-dim)] pl-4">
                  <p className="text-xs text-[var(--text-muted)] mb-3">{script.situation}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-[var(--accent-dim)]">{personA.nickname}：</span>
                      <p className="text-sm text-[var(--text-warm)] leading-relaxed">{script.personA}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--accent)]">{personB.nickname}：</span>
                      <p className="text-sm text-[var(--text-warm)] leading-relaxed">{script.personB}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generate report button */}
      {!report && !generating && (
        <div className="text-center py-8">
          <button onClick={generateReport} className="btn-primary">
            生成关系分析报告 →
          </button>
        </div>
      )}

      {error && (
        <div
          className="mt-4 px-4 py-3 rounded-md text-sm flex items-start gap-2"
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.45)",
            color: "#fca5a5",
          }}
        >
          <span className="flex-shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <div className="text-center mt-12">
        {mySessionId ? (
          <Link href={`/result/${mySessionId}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors">
            ← 返回我的报告
          </Link>
        ) : (
          <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors">
            ← 返回首页
          </Link>
        )}
      </div>
    </main>
  );
}
