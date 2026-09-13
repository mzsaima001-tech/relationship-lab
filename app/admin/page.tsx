"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  questions: {
    total: number;
    active: number;
    inactive: number;
    byPhase: Record<string, number>;
    byBank: { bank: string; label: string; count: number }[];
    byDimension: { dimension: string; label: string; count: number }[];
  };
  rules: { total: number; active: number; byCategory: Record<string, number> };
  patterns: { total: number; active: number; byCategory: Record<string, number> };
  archetypes: { total: number; byKind: Record<string, number> };
  personality: {
    total: number;
    version: string;
    mothers: number;
    cards: number;
    byPaper: { paper: string; count: number }[];
    byDimension: { dimension: string; label: string; count: number }[];
  };
  versions: { questionBank: string; reportRules: string; pairEngine: string; personalityBank?: string };
  updatedAt: { questions: string; rules: string; patterns: string };
}

const PHASE_LABELS: Record<string, string> = {
  core: "核心测量",
  relationship: "关系场景",
  life_stage: "生活阶段",
  followup: "动态追问",
  consistency: "一致性校验",
};

const CATEGORY_LABELS: Record<string, string> = {
  need: "需求", strength: "优势", tension: "内部矛盾", stress: "压力模式",
  pair_pattern: "双人模式", risk: "风险", repair: "修复资源",
  recommendation: "建议", script: "沟通话术", suppression: "抑制",
  relationship_state: "关系状态",
  difference: "差异型", similarity: "相似型", system: "系统型",
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setStats)
      .catch(() => setError("加载统计失败"));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <p className="text-sm text-gray-400">加载中…</p>;

  const cards = [
    { label: "题库总量", value: stats.questions.total, sub: `启用 ${stats.questions.active} / 停用 ${stats.questions.inactive}`, href: "/admin/questions" },
    { label: "人格题库", value: stats.personality.total, sub: `${stats.personality.mothers} 母题 · ${stats.personality.cards} 月相卡`, href: "/admin/personality-v2-questions", accent: true },
    { label: "报告规则", value: stats.rules.total, sub: `启用 ${stats.rules.active}`, href: "/admin/rules" },
    { label: "双人模式", value: stats.patterns.total, sub: `启用 ${stats.patterns.active}`, href: "/admin/patterns" },
    {
      label: "原型卡牌",
      value: stats.archetypes.total,
      sub: `精品 ${stats.archetypes.byKind.premium ?? 0} · 组合 ${stats.archetypes.byKind.combo ?? 0} · 单极 ${stats.archetypes.byKind.single ?? 0} · 兜底 ${stats.archetypes.byKind.fallback ?? 0}`,
      href: "/admin/archetypes",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">数据看板</h1>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="rounded bg-gray-100 px-2 py-1">默契题库 {stats.versions.questionBank}</span>
          <span className="rounded bg-gray-100 px-2 py-1">规则 {stats.versions.reportRules}</span>
          <span className="rounded bg-gray-100 px-2 py-1">模式 {stats.versions.pairEngine}</span>
          {stats.versions.personalityBank && (
            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">人格题库 {stats.versions.personalityBank}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl border p-5 transition ${
              (card as any).accent
                ? "border-amber-300 bg-amber-50 hover:border-amber-500"
                : "border-gray-200 bg-white hover:border-gray-400"
            }`}
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${
              (card as any).accent ? "text-amber-700" : "text-gray-900"
            }`}>{card.value}</p>
            <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
          <h2 className="text-sm font-semibold text-amber-900 mb-4">人格题库 V3 — 六维 + 卷分布</h2>
          <div className="space-y-2">
            {stats.personality.byDimension.map(d => {
              const max = Math.max(...stats.personality.byDimension.map(x => x.count), 1);
              return (
                <div key={d.dimension} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs text-amber-900">{d.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs text-amber-700">{d.count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.personality.byPaper.map(p => (
              <span key={p.paper} className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
                {p.paper} · {p.count} 题
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">默契题库分布</h2>
          <div className="space-y-2">
            {stats.questions.byBank.map(b => (
              <div key={b.bank} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-gray-600">{b.label}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gray-800"
                    style={{ width: `${stats.questions.total ? (b.count / stats.questions.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-gray-500">{b.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(stats.questions.byPhase).map(([phase, count]) => (
              <span key={phase} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                {PHASE_LABELS[phase] ?? phase} {count}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">默契六维覆盖</h2>
          <div className="space-y-2">
            {stats.questions.byDimension.map(d => {
              const max = Math.max(...stats.questions.byDimension.map(x => x.count), 1);
              return (
                <div key={d.dimension} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-gray-600">{d.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gray-800" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs text-gray-500">{d.count}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">报告规则分类</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.rules.byCategory).map(([cat, count]) => (
              <span key={cat} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                {CATEGORY_LABELS[cat] ?? cat} {count}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">双人模式分类</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.patterns.byCategory).map(([cat, count]) => (
              <span key={cat} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                {CATEGORY_LABELS[cat] ?? cat} {count}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400">
            最近更新：默契题库 {fmtTime(stats.updatedAt.questions)} · 规则 {fmtTime(stats.updatedAt.rules)} · 模式 {fmtTime(stats.updatedAt.patterns)}
          </p>
        </section>
      </div>
    </div>
  );
}
