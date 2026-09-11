"use client";

import { useEffect, useState } from "react";

interface SessionOption {
  id: string;
  nickname: string;
  relationshipType: string;
  status: string;
  createdAt: string;
  hasResult: boolean;
}

interface DebugData {
  session: { id: string; status: string; questionIds: string[]; followupIds: string[] };
  questionTrace: {
    id: string; phase: string; motherQuestionId?: string; dimension?: string;
    trigger?: Record<string, unknown>; resolves?: string[]; reportImpact?: number;
  }[];
  scores: Record<string, number>;
  activeSignals: Record<string, { value: unknown; confidence: number }>;
  responseQuality: { rqi: number; level: string; straightLiningScore: number; rapidAnsweringFlag: boolean; extremeResponseRatio: number; midpointResponseRatio: number };
  evaluatedRules: { id: string; category: string; priority: number; confidence: number; evidence: string[]; headline: string }[];
  reportFacts: Record<string, unknown>;
}

const DIM_LABELS: Record<string, string> = {
  response_need: "回应需求", expression: "表达倾向", space_need: "空间需求",
  emotional_sensitivity: "情绪感知", conflict_urgency: "冲突节奏", repair_orientation: "修复倾向",
};

const QUALITY_LABELS: Record<string, string> = {
  high_confidence: "高置信", good_confidence: "良好", moderate_confidence: "中等", low_confidence: "低置信",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function DebugPage() {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(d => setSessions(d.sessions ?? []))
      .catch(() => {});
  }, []);

  async function run(id: string) {
    if (!id) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/debug/assessments/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "调试数据不可用（该会话可能未完成）"); return; }
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">调试工具</h1>
        <p className="mt-1 text-sm text-gray-500">为什么问这道题 · 为什么报告这么写（证据链回溯）</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <select
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 max-w-xs"
        >
          <option value="">选择最近测评会话…</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.nickname || "匿名"} · {s.relationshipType} · {s.hasResult ? "已完成" : s.status}
            </option>
          ))}
        </select>
        <input
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          placeholder="或直接输入 session ID"
          className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-gray-900"
        />
        <button
          onClick={() => run(sessionId)}
          disabled={loading || !sessionId}
          className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "分析中…" : "查看证据链"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="space-y-4">
          <Section title={`会话概览 · ${data.session.id.slice(0, 8)}…（${data.session.status}）`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(data.scores).map(([dim, score]) => (
                <div key={dim} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{DIM_LABELS[dim] ?? dim}</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{Math.round(score)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-gray-900 px-3 py-1 text-white">
                RQI {Math.round(data.responseQuality.rqi)} · {QUALITY_LABELS[data.responseQuality.level] ?? data.responseQuality.level}
              </span>
              {data.responseQuality.rapidAnsweringFlag && <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">答题过快</span>}
              {data.responseQuality.straightLiningScore >= 8 && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-600">连续同选 {data.responseQuality.straightLiningScore}</span>}
            </div>
          </Section>

          <Section title={`为什么问这些题（${data.questionTrace.length} 道）`}>
            <div className="space-y-2">
              {data.questionTrace.map(q => (
                <div key={q.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-800">{q.id}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{q.phase}</span>
                    {q.dimension && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{DIM_LABELS[q.dimension] ?? q.dimension}</span>}
                    {q.reportImpact !== undefined && <span className="text-xs text-gray-400">impact {q.reportImpact}</span>}
                  </div>
                  {q.trigger && (
                    <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                      触发条件: {JSON.stringify(q.trigger)}
                    </pre>
                  )}
                  {q.resolves && q.resolves.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">消除歧义: {q.resolves.join("、")}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title={`激活信号（${Object.keys(data.activeSignals).length} 个）`}>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.activeSignals).map(([key, s]) => (
                <span key={key} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700" title={`置信度 ${Math.round(s.confidence)}`}>
                  {key} <span className="text-amber-400">{Math.round(s.confidence)}</span>
                </span>
              ))}
            </div>
          </Section>

          <Section title={`为什么报告这么写（命中规则 ${data.evaluatedRules.length} 条）`}>
            <div className="space-y-2">
              {data.evaluatedRules.map(rule => (
                <div key={rule.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-800">{rule.id}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{rule.category}</span>
                    <span className="text-xs text-gray-400">优先级 {rule.priority}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${rule.confidence >= 70 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"}`}>
                      置信度 {Math.round(rule.confidence)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-800">{rule.headline}</p>
                  {rule.evidence.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">证据: {rule.evidence.join("、")}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Report Facts（结构化报告事实）">
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
              {JSON.stringify(data.reportFacts, null, 2)}
            </pre>
          </Section>
        </div>
      )}
    </div>
  );
}
