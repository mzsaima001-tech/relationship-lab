"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PERSONALITY_DIMENSIONS,
  PERSONALITY_DIMENSION_META,
  type PersonalityDimension,
} from "@/lib/personality/types";

type PersonalityQuestion = {
  id: string;
  order: number;
  question: string;
  dimension: PersonalityDimension;
  reverse: false;
  active: true;
  paper_id?: "P1" | "P2" | "P3" | "P4" | "P5";
  mother_question_id?: string;
};

const DIM_LABEL: Record<PersonalityDimension, string> = {
  G: "表达力",
  X: "应对力",
  I: "认可需求",
  F: "方向感",
  S: "自主性",
  E: "情绪觉知",
};

const DIM_COLOR: Record<PersonalityDimension, string> = {
  G: "bg-sky-100 text-sky-700",
  X: "bg-amber-100 text-amber-700",
  I: "bg-rose-100 text-rose-700",
  F: "bg-emerald-100 text-emerald-700",
  S: "bg-violet-100 text-violet-700",
  E: "bg-orange-100 text-orange-700",
};

type DraftQuestion = Omit<PersonalityQuestion, "id"> & { id: string };

const BLANK: DraftQuestion = {
  id: "",
  order: 0,
  question: "",
  dimension: "G",
  reverse: false,
  active: true,
};

export default function PersonalityQuestionsAdmin() {
  const [items, setItems] = useState<PersonalityQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterDimension, setFilterDimension] = useState<string>("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const PAGE_SIZE = 30;
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filterDimension) p.set("dimension", filterDimension);
    if (search.trim()) p.set("q", search.trim());
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    return p.toString();
  }, [filterDimension, search, page]);

  function refresh() {
    setLoading(true);
    fetch(`/api/admin/personality/questions?${query}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [query]);

  // V3 题库为只读 TS seed → 增删改全部禁用
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectCls =
    "rounded-lg border border-[var(--border-dim)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-warm)] focus:outline-none focus:border-[var(--accent)]";

  // 维度计数
  const dimCount = useMemo(() => {
    const m = new Map<PersonalityDimension, number>();
    PERSONALITY_DIMENSIONS.forEach(d => m.set(d, 0));
    items.forEach(q => m.set(q.dimension, (m.get(q.dimension) ?? 0) + 1));
    return m;
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="archive-label">人格测试题库（V3 · 只读）</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            共 {total} 题 · 5 套卷 × 36 题 · V3 算法 · G/X/I/F/S/E 六维
          </p>
        </div>
        <span className="rounded-lg border border-amber-200/40 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
          题库为 TS seed，编辑需在 lib/personality/questionsData.ts 改后通过版本号升级
        </span>
      </div>

      {/* 维度计数 */}
      <div className="flex flex-wrap gap-2">
        {PERSONALITY_DIMENSIONS.map(d => (
          <span
            key={d}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${DIM_COLOR[d]}`}
            title={PERSONALITY_DIMENSION_META[d].en}
          >
            {DIM_LABEL[d]} · {dimCount.get(d) ?? 0}
          </span>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border-dim)] bg-[var(--bg-card)] p-3">
        <input
          value={search}
          onChange={e => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="搜索题号 / 题干…"
          className="rounded-lg border border-[var(--border-dim)] bg-[var(--bg-dark)] px-3 py-1.5 text-xs text-[var(--text-warm)] w-56 focus:outline-none focus:border-[var(--accent)]"
        />
        <select
          value={filterDimension}
          onChange={e => {
            setPage(1);
            setFilterDimension(e.target.value);
          }}
          className={selectCls}
        >
          <option value="">全部维度</option>
          {PERSONALITY_DIMENSIONS.map(d => (
            <option key={d} value={d}>
              {DIM_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      {/* 列表 */}
      <div className="rounded-xl border border-[var(--border-dim)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[var(--border-dim)]/40 text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
              <tr>
                <th className="px-4 py-3 font-normal w-20">题号</th>
                <th className="px-4 py-3 font-normal w-16">卷</th>
                <th className="px-4 py-3 font-normal">题干</th>
                <th className="px-4 py-3 font-normal w-28">维度</th>
                <th className="px-4 py-3 font-normal w-24">状态</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                    加载中…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                    没有匹配的题目
                  </td>
                </tr>
              ) : (
                items.map(q => (
                  <tr
                    key={q.id}
                    className="border-t border-[var(--border-dim)]/50 hover:bg-[var(--border-dim)]/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[var(--accent)]">
                      {q.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {(q as any).paper_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-warm)] max-w-md">
                      <p className="truncate" title={q.question}>
                        {q.question}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${DIM_COLOR[q.dimension]}`}
                      >
                        {DIM_LABEL[q.dimension]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-block rounded-full px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-700">
                        启用
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          第 {page} / {totalPages} 页 · 共 {total} 题
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-[var(--border-dim)] px-3 py-1.5 disabled:opacity-40"
          >
            上一页
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-[var(--border-dim)] px-3 py-1.5 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>

      {(message || error) && (
        <p
          className={`text-xs ${error ? "text-rose-500" : "text-emerald-500"}`}
        >
          {error || message}
        </p>
      )}
    </div>
  );
}
