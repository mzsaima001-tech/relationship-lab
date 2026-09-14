"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PersonalityCard } from "@/lib/personality/cards/PersonalityCard";
import PersonalityQuestionsAdmin from "./PersonalityQuestionsAdmin";
import PendingReviewTable from "./PendingReviewTable";

type PersonalityTestRow = {
  id: string;
  visitorId: string;
  status: "started" | "completed";
  primaryType?: string | null;
  primaryCn?: string | null;
  secondaryType?: string | null;
  hiddenType?: string | null;
  isPaid: boolean;
  polishStatus?: string;
  polishModel?: string;
  polishElapsedMs?: number;
  polishError?: string;
  scores: { social?: number; rationality?: number; planning?: number; risk?: number; dominance?: number; sensitivity?: number };
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
};

type PersonalityOrderRow = {
  id: string;
  order_no: string;
  test_id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  created_at: string;
  paid_at?: string;
};

type ArchetypeDistribution = { type: string; cn: string; count: number };

type ReferralRow = {
  code: string;
  visitorId: string;
  visits: number;
  points: number;
  completedVisitors: string[];
  createdAt: string;
};

type Overview = {
  metrics: {
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    reportsGenerated: number;
    reportsUnlocked: number;
    paidOrders: number;
    revenue: number;
    personalityTotalTests: number;
    personalityCompletedTests: number;
    personalityCompletionRate: number;
    personalityPaidOrders: number;
    personalityRevenue: number;
    personalityAiPolished: number;
  };
  sessions: Array<{
    id: string;
    nickname: string;
    relationshipType: string;
    relationshipStage: string;
    status: string;
    createdAt: string;
    hasResult: boolean;
  }>;
  payments: Array<{
    id: string;
    target_type: string;
    target_id: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
  personality: {
    tests: PersonalityTestRow[];
    orders: PersonalityOrderRow[];
    archetypeDistribution: ArchetypeDistribution[];
  };
  referrals: {
    totalSharers: number;
    totalPoints: number;
    totalVisits: number;
    rows: ReferralRow[];
  };
};

const relationshipLabels: Record<string, string> = {
  ambiguous: "暧昧",
  dating: "恋爱",
  long_term: "长期伴侣",
  friend: "朋友",
};

type TabKey = "couple" | "personality" | "referral";

const polishStatusBadge: Record<string, { label: string; cls: string }> = {
  "ai-polished": { label: "AI 已润色", cls: "bg-emerald-100 text-emerald-700" },
  "local-template": { label: "本地模板", cls: "bg-gray-100 text-gray-600" },
  "local-partial": { label: "本地部分", cls: "bg-amber-100 text-amber-700" },
};

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("couple");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(async response => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error);
        return json;
      })
      .then(setData)
      .catch(err => setError(err.message || "加载失败"));
  }, [refreshTick]);

  const personCards = useMemo(() => {
    if (!data) return [];
    const m = data.metrics;
    return [
      ["人格测试", `${m.personalityCompletedTests} / ${m.personalityTotalTests}`],
      ["完成率", `${m.personalityCompletionRate}%`],
      ["已支付订单", m.personalityPaidOrders],
      ["人格收入", `¥${m.personalityRevenue.toFixed(2)}`],
      ["AI 润色命中", `${m.personalityAiPolished} / ${m.personalityCompletedTests}`],
    ] as const;
  }, [data]);

  if (error) {
    return <main className="flex-1 flex items-center justify-center px-6 text-sm text-[var(--danger)]">{error}</main>;
  }
  if (!data) {
    return <main className="flex-1 flex items-center justify-center px-6 text-sm text-[var(--text-muted)]">正在载入运营数据...</main>;
  }

  const coupleCards = [
    ["测评会话", data.metrics.totalSessions],
    ["完成率", `${data.metrics.completionRate}%`],
    ["报告解锁", data.metrics.reportsUnlocked],
    ["已支付订单", data.metrics.paidOrders],
    ["本地收入", `¥${data.metrics.revenue.toFixed(2)}`],
  ];

  return (
    <main className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="archive-label mb-3">RELATIONSHIP LAB · OPERATIONS</p>
          <h1 className="display-serif text-3xl text-[var(--text-warm)]">V2 运营看板</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">本地开发数据概览，含双人默契测试与人格测试两套业务线。云端部署前请为此页面增加管理员权限控制。</p>
        </div>
        <Link className="btn-ghost text-center" href="/">返回产品首页</Link>
      </header>

      {/* 顶部 Tab 切换 */}
      <div className="flex gap-2 border-b border-[var(--border-dim)] mb-6">
        <button
          type="button"
          onClick={() => setTab("couple")}
          className={`px-4 py-2 text-sm rounded-t-lg border-b-2 -mb-px transition ${
            tab === "couple"
              ? "border-[var(--accent)] text-[var(--text-warm)] font-medium"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-warm)]"
          }`}
        >
          双人默契测试 <span className="ml-1 text-xs text-[var(--text-muted)]">({data.metrics.totalSessions})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("personality")}
          className={`px-4 py-2 text-sm rounded-t-lg border-b-2 -mb-px transition ${
            tab === "personality"
              ? "border-[var(--accent)] text-[var(--text-warm)] font-medium"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-warm)]"
          }`}
        >
          人格测试 <span className="ml-1 text-xs text-[var(--text-muted)]">({data.metrics.personalityTotalTests})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("referral")}
          className={`px-4 py-2 text-sm rounded-t-lg border-b-2 -mb-px transition ${
            tab === "referral"
              ? "border-[var(--accent)] text-[var(--text-warm)] font-medium"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-warm)]"
          }`}
        >
          邀请积分 <span className="ml-1 text-xs text-[var(--text-muted)]">({data.referrals.totalPoints})</span>
        </button>
      </div>

      {tab === "couple" && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
            {coupleCards.map(([label, value]) => (
              <div key={String(label)} className="card p-4">
                <p className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">{label}</p>
                <p className="text-2xl font-mono text-[var(--accent)] mt-2">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid lg:grid-cols-3 gap-6">
            <div className="card p-6 lg:col-span-2 overflow-hidden">
              <div className="flex justify-between items-center mb-5">
                <h2 className="archive-label">最近测评</h2>
                <span className="text-xs text-[var(--text-muted)]">完成 {data.metrics.completedSessions} / {data.metrics.totalSessions}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[560px]">
                  <thead className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase border-b border-[var(--border-dim)]">
                    <tr><th className="pb-3 font-normal">用户</th><th className="pb-3 font-normal">关系</th><th className="pb-3 font-normal">状态</th><th className="pb-3 font-normal">时间</th><th className="pb-3 font-normal">调试</th></tr>
                  </thead>
                  <tbody>
                    {data.sessions.map(session => (
                      <tr key={session.id} className="border-b border-[var(--border-dim)] text-sm">
                        <td className="py-3 text-[var(--text-warm)]">{session.nickname || "匿名用户"}</td>
                        <td className="py-3 text-[var(--text-muted)]">{relationshipLabels[session.relationshipType] || session.relationshipType} · {session.relationshipStage}</td>
                        <td className="py-3"><span className={session.hasResult ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}>{session.hasResult ? "已完成" : session.status}</span></td>
                        <td className="py-3 text-xs text-[var(--text-muted)]">{new Date(session.createdAt).toLocaleString("zh-CN")}</td>
                        <td className="py-3">{session.hasResult && <Link href={`/api/debug/assessments/${session.id}`} className="text-xs text-[var(--accent)]">证据链</Link>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="archive-label mb-5">最近订单</h2>
              <div className="space-y-4">
                {data.payments.length === 0 ? <p className="text-sm text-[var(--text-muted)]">暂无支付订单</p> : data.payments.slice(0, 8).map(payment => (
                  <div key={payment.id} className="border-b border-[var(--border-dim)] pb-3">
                    <div className="flex justify-between gap-3 text-sm"><span className="text-[var(--text-warm)]">{payment.target_type === "pair_report" ? "双人报告" : "单人报告"}</span><span className="font-mono text-[var(--accent)]">¥{payment.amount}</span></div>
                    <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]"><span>{payment.status === "paid" ? "已支付" : payment.status === "pending_review" ? "待复核" : payment.status === "cancelled" ? "已驳回" : "待支付"}</span><span>{new Date(payment.created_at).toLocaleDateString("zh-CN")}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 待复核订单（静态收款码 + 手动确认方案专用） */}
          <section className="card p-6 mt-6">
            <div className="flex justify-between items-center mb-5 gap-4">
              <h2 className="archive-label">待复核订单</h2>
              <button
                type="button"
                onClick={() => setRefreshTick(t => t + 1)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
              >
                ↻ 刷新
              </button>
            </div>
            <PendingReviewTable
              payments={data.payments}
              onChanged={() => setRefreshTick(t => t + 1)}
            />
          </section>
        </>
      )}

      {tab === "personality" && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
            {personCards.map(([label, value]) => (
              <div key={String(label)} className="card p-4">
                <p className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">{label}</p>
                <p className="text-2xl font-mono text-[var(--accent)] mt-2">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid lg:grid-cols-3 gap-6">
            {/* 原型分布 */}
            <div className="card p-6">
              <h2 className="archive-label mb-5">原型分布 (Top3 命中)</h2>
              {data.personality.archetypeDistribution.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">尚未有人格测试完成</p>
              ) : (
                <div className="space-y-3">
                  {data.personality.archetypeDistribution.map((row, idx) => {
                    const max = data.personality.archetypeDistribution[0].count || 1;
                    const pct = Math.round((row.count / max) * 100);
                    return (
                      <div key={row.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[var(--text-warm)]">{idx === 0 && <span className="mr-1">🥇</span>}{idx === 1 && <span className="mr-1">🥈</span>}{idx === 2 && <span className="mr-1">🥉</span>}{row.cn} <span className="text-[var(--text-muted)] text-xs">{row.type}</span></span>
                          <span className="font-mono text-[var(--accent)]">{row.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--border-dim)] overflow-hidden">
                          <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 人格测试列表 */}
            <div className="card p-6 lg:col-span-2 overflow-hidden">
              <div className="flex justify-between items-center mb-5">
                <h2 className="archive-label">人格测试记录</h2>
                <span className="text-xs text-[var(--text-muted)]">完成 {data.metrics.personalityCompletedTests} / {data.metrics.personalityTotalTests}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase border-b border-[var(--border-dim)]">
                    <tr>
                      <th className="pb-3 font-normal">测试</th>
                      <th className="pb-3 font-normal">原型</th>
                      <th className="pb-3 font-normal">付费</th>
                      <th className="pb-3 font-normal">润色状态</th>
                      <th className="pb-3 font-normal">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.personality.tests.length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-sm text-[var(--text-muted)] text-center">尚无测试记录</td></tr>
                    ) : data.personality.tests.map(t => {
                      const ps = t.polishStatus ? polishStatusBadge[t.polishStatus] : null;
                      return (
                        <tr key={t.id} className="border-b border-[var(--border-dim)] text-sm">
                          <td className="py-3">
                            <div className="text-[var(--text-warm)] font-mono text-xs">{t.id}</div>
                            <div className="text-xs text-[var(--text-muted)]">游客 {t.visitorId || "anon"}</div>
                          </td>
                          <td className="py-3">
                            {t.primaryCn ? (
                              <>
                                <div className="text-[var(--accent)]">{t.primaryCn}</div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  次: {t.secondaryType || "-"} · 隐: {t.hiddenType || "-"}
                                </div>
                              </>
                            ) : <span className="text-[var(--text-muted)]">未完成</span>}
                          </td>
                          <td className="py-3">
                            {t.isPaid ? <span className="text-emerald-600 font-medium">已支付</span> : <span className="text-[var(--text-muted)]">未支付</span>}
                          </td>
                          <td className="py-3">
                            {ps ? (
                              <span className={`inline-block text-[11px] px-2 py-0.5 rounded ${ps.cls}`}>{ps.label}</span>
                            ) : <span className="text-xs text-[var(--text-muted)]">-</span>}
                            {t.polishError && <div className="text-xs text-rose-600 mt-1" title={t.polishError}>⚠ {t.polishError.slice(0, 24)}</div>}
                            {t.polishModel && t.polishStatus === "ai-polished" && t.polishElapsedMs != null && (
                              <div className="text-[10px] text-[var(--text-muted)] mt-1">{t.polishModel} · {(t.polishElapsedMs / 1000).toFixed(1)}s</div>
                            )}
                          </td>
                          <td className="py-3 text-xs text-[var(--text-muted)]">
                            {t.completedAt ? new Date(t.completedAt).toLocaleString("zh-CN") : new Date(t.startedAt).toLocaleString("zh-CN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 人格订单 */}
          <section className="card p-6 mt-6">
            <h2 className="archive-label mb-5">人格测试订单</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.personality.orders.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] col-span-full">暂无订单</p>
              ) : data.personality.orders.slice(0, 8).map(order => (
                <div key={order.id} className="border border-[var(--border-dim)] rounded-lg p-3">
                  <div className="flex justify-between gap-3 text-sm mb-1">
                    <span className="text-[var(--text-warm)] font-medium">人格报告</span>
                    <span className="font-mono text-[var(--accent)]">¥{order.amount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span className={order.status === "paid" ? "text-emerald-600" : ""}>{order.status === "paid" ? "已支付" : order.status === "pending" ? "待支付" : order.status}</span>
                    <span>{new Date(order.created_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate" title={order.order_no}>{order.order_no}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 29 张人格原型画廊 — 按月相初一到十五 + 14 过渡型 */}
          <section className="card p-6 mt-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="archive-label">人格原型画廊（共 29 张）</h2>
              <span className="text-[10px] text-[var(--text-muted)]">15 主型 + 14 过渡型</span>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              {([
                // 15 主型，按月序
                "dark_reef", "spark", "departure", "scout", "drifter", "glimmer",
                "strategist", "observer", "guardian", "coordinator", "creator",
                "explorer", "doer", "leader", "whole",
                // 14 过渡型
                "dark_reef__spark", "spark__departure", "departure__scout",
                "scout__drifter", "drifter__glimmer", "glimmer__strategist",
                "strategist__observer", "observer__guardian",
                "guardian__coordinator", "coordinator__creator",
                "creator__explorer", "explorer__doer", "doer__leader",
                "leader__whole",
              ] as const).map(t => {
                const hit = data.personality.archetypeDistribution.find(d => d.type === t)?.count ?? 0;
                return (
                  <div key={t} className="relative">
                    <PersonalityCard
                      type={t as Parameters<typeof PersonalityCard>[0]["type"]}
                      userScores={undefined}
                      showDiff={false}
                      size="sm"
                    />
                    {hit > 0 && (
                      <span className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg-dark)] text-[10px] font-mono shadow">
                        命中 {hit}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 人格题库管理 — CRUD */}
          <section className="mt-6">
            <PersonalityQuestionsAdmin />
          </section>
        </>
      )}
      {tab === "referral" && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
            {([
              ["分享人数", data.referrals.totalSharers],
              ["累计积分（成功邀请）", data.referrals.totalPoints],
              ["链接打开次数", data.referrals.totalVisits],
            ] as const).map(([label, value]) => (
              <div key={String(label)} className="card p-4">
                <p className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">{label}</p>
                <p className="text-2xl font-mono text-[var(--accent)] mt-2">{value}</p>
              </div>
            ))}
          </section>

          <section className="card p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-5">
              <h2 className="archive-label">邀请积分明细</h2>
              <button
                type="button"
                onClick={() => setRefreshTick(t => t + 1)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
              >
                ↻ 刷新
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase border-b border-[var(--border-dim)]">
                  <tr>
                    <th className="pb-3 font-normal">分享人（游客 ID）</th>
                    <th className="pb-3 font-normal">专属码</th>
                    <th className="pb-3 font-normal">积分</th>
                    <th className="pb-3 font-normal">链接打开</th>
                    <th className="pb-3 font-normal">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.rows.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-sm text-[var(--text-muted)] text-center">还没有人生成专属邀请链接</td></tr>
                  ) : data.referrals.rows.map(r => (
                    <tr key={r.code} className="border-b border-[var(--border-dim)] text-sm">
                      <td className="py-3">
                        <span className="font-mono text-xs text-[var(--text-warm)]" title={r.visitorId}>
                          {r.visitorId ? `${r.visitorId.slice(0, 18)}…` : "-"}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs text-[var(--accent)]">{r.code}</td>
                      <td className="py-3">
                        <span className={`font-mono ${r.points > 0 ? "text-emerald-600 font-semibold" : "text-[var(--text-muted)]"}`}>
                          {r.points}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs text-[var(--text-muted)]">{r.visits}</td>
                      <td className="py-3 text-xs text-[var(--text-muted)]">{new Date(r.createdAt).toLocaleString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
