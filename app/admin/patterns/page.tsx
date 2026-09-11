"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PairPattern } from "@/lib/assessment/types";

type Pattern = PairPattern & { active?: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  difference: "差异型",
  similarity: "相似型",
  system: "系统型",
};

export default function PatternsPage() {
  const [items, setItems] = useState<Pattern[]>([]);
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
    fetch(`/api/admin/patterns?${query}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">双人互动模式 <span className="text-sm font-normal text-gray-400">共 {items.length} 组</span></h1>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜索 ID / 名称…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-gray-900"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
        >
          <option value="">全部分类</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading ? (
          <p className="text-sm text-gray-400">加载中…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">没有匹配的模式</p>
        ) : items.map(p => (
          <Link
            key={p.id}
            href={`/admin/patterns/${encodeURIComponent(p.id)}`}
            className={`rounded-xl border bg-white p-4 hover:border-gray-400 transition ${p.active === false ? "border-gray-100 opacity-60" : "border-gray-200"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">{p.id}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{CATEGORY_LABELS[p.category] ?? p.category}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.active !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {p.active !== false ? "启用" : "停用"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">{p.explanation.risk}</p>
            <p className="mt-2 text-xs text-gray-400">优先级 {p.priority} · 最低置信度 {p.minimumConfidence}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
