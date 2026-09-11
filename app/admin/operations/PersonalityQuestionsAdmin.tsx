"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PERSONALITY_DIMENSIONS,
  type PersonalityDimension,
} from "@/lib/personality/types";

type PersonalityQuestion = {
  id: string;
  order: number;
  question: string;
  dimension: PersonalityDimension;
  reverse: boolean;
  active: boolean;
};

const DIM_LABEL: Record<PersonalityDimension, string> = {
  social: "社交能量",
  rationality: "理性决策",
  planning: "计划倾向",
  risk: "风险倾向",
  dominance: "主导性",
  sensitivity: "情绪感知",
};

const DIM_COLOR: Record<PersonalityDimension, string> = {
  social: "bg-rose-100 text-rose-700",
  rationality: "bg-sky-100 text-sky-700",
  planning: "bg-amber-100 text-amber-700",
  risk: "bg-orange-100 text-orange-700",
  dominance: "bg-purple-100 text-purple-700",
  sensitivity: "bg-emerald-100 text-emerald-700",
};

type DraftQuestion = Omit<PersonalityQuestion, "id"> & { id: string };

const BLANK: DraftQuestion = {
  id: "",
  order: 0,
  question: "",
  dimension: "social",
  reverse: false,
  active: true,
};

export default function PersonalityQuestionsAdmin() {
  const [items, setItems] = useState<PersonalityQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterDimension, setFilterDimension] = useState<string>("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DraftQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const PAGE_SIZE = 30;
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filterDimension) p.set("dimension", filterDimension);
    if (filterActive) p.set("active", filterActive);
    if (search.trim()) p.set("q", search.trim());
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    return p.toString();
  }, [filterDimension, filterActive, search, page]);

  useEffect(() => {
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
  }, [query]);

  function refresh() {
    setPage(p => p);
    setLoading(true);
    fetch(`/api/admin/personality/questions?${query}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  function openNew() {
    setEditing({ ...BLANK, order: total + 1 });
    setCreating(true);
  }

  function openEdit(q: PersonalityQuestion) {
    setEditing({ ...q });
    setCreating(false);
  }

  function closeEditor() {
    setEditing(null);
    setCreating(false);
    setError("");
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.id.trim() || !editing.question.trim() || !editing.dimension) {
      setError("题号 / 题干 / 维度 都必须填写");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = creating
        ? "/api/admin/personality/questions"
        : `/api/admin/personality/questions/${encodeURIComponent(editing.id)}`;
      const method = creating ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "保存失败");
        return;
      }
      setMessage(creating ? "已新增" : "已保存");
      setTimeout(() => setMessage(""), 2000);
      closeEditor();
      refresh();
    } catch (e) {
      setError("网络错误：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`确定删除题目 ${id}？建议停用而不是删除（PUT active=false）。`)) return;
    const res = await fetch(
      `/api/admin/personality/questions/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMessage("已删除");
      setTimeout(() => setMessage(""), 2000);
      refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "删除失败");
    }
  }

  async function toggleActive(q: PersonalityQuestion) {
    const next = { ...q, active: !q.active };
    const res = await fetch(
      `/api/admin/personality/questions/${encodeURIComponent(q.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }
    );
    if (res.ok) refresh();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "切换状态失败");
    }
  }

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
          <h2 className="archive-label">人格测试题库</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            共 {total} 题 · 6 维度 · 维度分布用于反作弊校验
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg-dark)] hover:opacity-90"
        >
          + 新增题目
        </button>
      </div>

      {/* 维度计数 */}
      <div className="flex flex-wrap gap-2">
        {PERSONALITY_DIMENSIONS.map(d => (
          <span
            key={d}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${DIM_COLOR[d]}`}
            title={DIM_LABEL[d]}
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
        <select
          value={filterActive}
          onChange={e => {
            setPage(1);
            setFilterActive(e.target.value);
          }}
          className={selectCls}
        >
          <option value="">全部状态</option>
          <option value="true">启用中</option>
          <option value="false">已停用</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="rounded-xl border border-[var(--border-dim)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[var(--border-dim)]/40 text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
              <tr>
                <th className="px-4 py-3 font-normal w-20">题号</th>
                <th className="px-4 py-3 font-normal w-16">顺序</th>
                <th className="px-4 py-3 font-normal">题干</th>
                <th className="px-4 py-3 font-normal w-28">维度</th>
                <th className="px-4 py-3 font-normal w-16">反向</th>
                <th className="px-4 py-3 font-normal w-24">状态</th>
                <th className="px-4 py-3 font-normal w-28"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                    加载中…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
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
                      {q.order}
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
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {q.reverse ? "反向" : "正向"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(q)}
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] cursor-pointer transition ${
                          q.active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        {q.active ? "启用" : "停用"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <button
                        onClick={() => openEdit(q)}
                        className="text-[var(--accent)] hover:underline mr-2"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-rose-500 hover:underline"
                      >
                        删除
                      </button>
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

      {/* 编辑/新增 modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-dim)] bg-[var(--bg-card)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="archive-label">
              {creating ? "新增人格测试题目" : `编辑 ${editing.id}`}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  题号 ID
                </label>
                <input
                  disabled={!creating}
                  value={editing.id}
                  onChange={e => setEditing({ ...editing, id: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-dim)] bg-[var(--bg-dark)] px-3 py-2 text-sm disabled:opacity-50"
                  placeholder="如 Q37"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  顺序
                </label>
                <input
                  type="number"
                  value={editing.order}
                  onChange={e =>
                    setEditing({ ...editing, order: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-[var(--border-dim)] bg-[var(--bg-dark)] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                维度
              </label>
              <select
                value={editing.dimension}
                onChange={e =>
                  setEditing({
                    ...editing,
                    dimension: e.target.value as PersonalityDimension,
                  })
                }
                className="w-full rounded-lg border border-[var(--border-dim)] bg-[var(--bg-dark)] px-3 py-2 text-sm"
              >
                {PERSONALITY_DIMENSIONS.map(d => (
                  <option key={d} value={d}>
                    {DIM_LABEL[d]} ({d})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                题干
              </label>
              <textarea
                value={editing.question}
                onChange={e =>
                  setEditing({ ...editing, question: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-[var(--border-dim)] bg-[var(--bg-dark)] px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-[var(--text-warm)]">
                <input
                  type="checkbox"
                  checked={editing.reverse}
                  onChange={e =>
                    setEditing({ ...editing, reverse: e.target.checked })
                  }
                />
                <span>反向计分</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-warm)]">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={e =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />
                <span>启用</span>
              </label>
            </div>

            {error && (
              <p className="text-xs text-rose-500">{error}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-dim)]">
              <button
                onClick={closeEditor}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-warm)] px-3 py-1.5"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[var(--bg-dark)] hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
