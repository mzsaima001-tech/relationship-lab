"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/assessment/types";
import { BANK_GROUPS, questionBank, bankLabel } from "@/lib/admin/banks";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/assessment/types";

const PHASES = [
  { value: "core", label: "核心测量" },
  { value: "relationship", label: "关系场景" },
  { value: "life_stage", label: "生活阶段" },
  { value: "followup", label: "动态追问" },
  { value: "consistency", label: "一致性校验" },
];

const KINDS = [
  { value: "likert", label: "量表" },
  { value: "scenario", label: "情境" },
  { value: "forced_choice", label: "双极选择" },
  { value: "classifier", label: "分类" },
];

const PAGE_SIZE = 30;

export default function QuestionsPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ bank: "", phase: "", kind: "", dimension: "", active: "", q: "" });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [filters, page]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/questions?${query}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => { setItems(data.items); setTotal(data.total); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [query]);

  function setFilter(key: string, value: string) {
    setPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectCls = "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-gray-900";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">题库管理 <span className="text-sm font-normal text-gray-400">共 {total} 道</span></h1>
        <Link href="/admin/questions/new" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          + 新增题目
        </Link>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <input
          value={filters.q}
          onChange={e => setFilter("q", e.target.value)}
          placeholder="搜索 ID / 题干…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs w-48 focus:outline-none focus:border-gray-900"
        />
        <select value={filters.bank} onChange={e => setFilter("bank", e.target.value)} className={selectCls}>
          <option value="">全部题库</option>
          {BANK_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={filters.phase} onChange={e => setFilter("phase", e.target.value)} className={selectCls}>
          <option value="">全部阶段</option>
          {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filters.kind} onChange={e => setFilter("kind", e.target.value)} className={selectCls}>
          <option value="">全部题型</option>
          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <select value={filters.dimension} onChange={e => setFilter("dimension", e.target.value)} className={selectCls}>
          <option value="">全部维度</option>
          {DIMENSIONS.map(d => <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>)}
        </select>
        <select value={filters.active} onChange={e => setFilter("active", e.target.value)} className={selectCls}>
          <option value="">全部状态</option>
          <option value="true">启用中</option>
          <option value="false">已停用</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium w-32">ID</th>
                <th className="px-4 py-3 font-medium">题干</th>
                <th className="px-4 py-3 font-medium w-28">题库</th>
                <th className="px-4 py-3 font-medium w-24">维度</th>
                <th className="px-4 py-3 font-medium w-20">状态</th>
                <th className="px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">加载中…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">没有匹配的题目</td></tr>
              ) : items.map(q => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{q.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 max-w-md">
                    <p className="truncate" title={q.text}>{q.text}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{bankLabel(questionBank(q))}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{q.dimension ? DIMENSION_LABELS[q.dimension].slice(0, 4) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${q.active !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {q.active !== false ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/questions/${encodeURIComponent(q.id)}`} className="text-xs text-gray-900 underline underline-offset-2">
                      编辑
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>第 {page} / {totalPages} 页</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            上一页
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
