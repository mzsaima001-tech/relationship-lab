"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReportRule } from "@/lib/assessment/types";

type Rule = ReportRule & { active?: boolean };

const CATEGORIES = [
  { value: "need", label: "需求" }, { value: "strength", label: "优势" },
  { value: "tension", label: "内部矛盾" }, { value: "stress", label: "压力模式" },
  { value: "pair_pattern", label: "双人模式" }, { value: "risk", label: "风险" },
  { value: "repair", label: "修复资源" }, { value: "recommendation", label: "建议" },
  { value: "script", label: "沟通话术" }, { value: "suppression", label: "抑制" },
  { value: "relationship_state", label: "关系状态" },
];

export const categoryLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;

export default function RulesPage() {
  const [items, setItems] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    return params.toString();
  }, [category, q]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/rules?${query}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">报告规则 <span className="text-sm font-normal text-gray-400">共 {items.length} 条</span></h1>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜索 ID / 标题 / 语义组…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-gray-900"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
        >
          <option value="">全部分类</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium w-32">ID</th>
                <th className="px-4 py-3 font-medium">结论标题</th>
                <th className="px-4 py-3 font-medium w-24">分类</th>
                <th className="px-4 py-3 font-medium w-20">优先级</th>
                <th className="px-4 py-3 font-medium w-20">状态</th>
                <th className="px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">加载中…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">没有匹配的规则</td></tr>
              ) : items.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 max-w-md">
                    <p className="truncate" title={r.output.headline}>{r.output.headline}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{categoryLabel(r.category)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.priority}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${r.active !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {r.active !== false ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/rules/${encodeURIComponent(r.id)}`} className="text-xs text-gray-900 underline underline-offset-2">编辑</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
