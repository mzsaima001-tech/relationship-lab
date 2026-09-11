"use client";

import { useEffect, useMemo, useState } from "react";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/assessment/types";
import type { ArchetypeCatalogItem } from "@/lib/admin/archetype-catalog";

const KIND_LABELS: Record<string, string> = {
  premium: "精品规则",
  combo: "双极组合",
  single: "单极原型",
  fallback: "平衡兜底",
};

const KIND_BADGE: Record<string, string> = {
  premium: "bg-amber-50 text-amber-700",
  combo: "bg-indigo-50 text-indigo-700",
  single: "bg-teal-50 text-teal-700",
  fallback: "bg-gray-100 text-gray-500",
};

const COPY_SECTIONS = [
  { key: "essence", label: "核心本质" },
  { key: "portrait", label: "关系画像" },
  { key: "recentTendency", label: "最近的倾向" },
  { key: "gift", label: "关系天赋" },
  { key: "blindSpot", label: "潜在盲区" },
] as const;

export default function ArchetypesPage() {
  const [items, setItems] = useState<ArchetypeCatalogItem[]>([]);
  const [byKind, setByKind] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("");
  const [dim, setDim] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ArchetypeCatalogItem | null>(null);

  useEffect(() => {
    fetch("/api/admin/archetypes")
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        setItems(data.items);
        setByKind(data.byKind ?? {});
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Esc 关闭详情弹层
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return items.filter(it => {
      if (kind && it.kind !== kind) return false;
      if (dim && !it.poles.some(p => p.dim === dim)) return false;
      if (kw) {
        const hay = `${it.name} ${it.tarot.cardTitle} ${it.tarot.cardTitleEn} ${it.poles.map(p => p.short).join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [items, kind, dim, q]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          原型卡牌 <span className="text-sm font-normal text-gray-400">共 {items.length} 种</span>
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(byKind).map(([k, n]) => (
            <span key={k} className={`rounded-full px-3 py-1 text-xs ${KIND_BADGE[k] ?? "bg-gray-100 text-gray-500"}`}>
              {KIND_LABELS[k] ?? k} {n}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜索原型名 / 牌名 / 极性…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-gray-900"
        />
        <select
          value={kind}
          onChange={e => setKind(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
        >
          <option value="">全部类型</option>
          {Object.entries(KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={dim}
          onChange={e => setDim(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
        >
          <option value="">全部维度</option>
          {DIMENSIONS.map(d => <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">没有匹配的原型</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(it => (
            <button
              key={it.name}
              onClick={() => setSelected(it)}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left hover:border-gray-400 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.tarot.image} alt={it.name} loading="lazy" className="h-40 w-full object-cover object-top" />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{it.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${KIND_BADGE[it.kind]}`}>{it.kindLabel}</span>
                </div>
                <p className="mt-1 truncate text-xs text-gray-400">{it.tarot.cardTitle} · {it.tarot.cardTitleEn}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {it.poles.length > 0 ? it.poles.map(p => (
                    <span key={p.id} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{p.short}</span>
                  )) : (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-400">六维均衡</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500 line-clamp-2">{it.tarot.motto}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row">
              <div className="shrink-0 bg-gray-50 md:w-60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.tarot.image}
                  alt={selected.name}
                  className="h-56 w-full object-cover object-top md:h-full md:min-h-[420px]"
                />
              </div>
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {selected.tarot.cardTitle} · {selected.tarot.cardTitleEn}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    关闭
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${KIND_BADGE[selected.kind]}`}>{selected.kindLabel}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {selected.copySource === "handwritten" ? "手写精修文案" : "极性组合生成"}
                  </span>
                  {selected.poles.map(p => (
                    <span key={p.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {p.dimLabel} · {p.short}
                    </span>
                  ))}
                </div>

                <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                  {selected.rule}
                </p>
                <p className="mt-3 text-sm italic text-gray-600">「{selected.tarot.motto}」</p>

                {selected.copy && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                    {COPY_SECTIONS.map(s => (
                      <div key={s.key}>
                        <p className="text-xs font-semibold text-gray-400">{s.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-700">{selected.copy![s.key]}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-300">底图复用：/tarot/{selected.tarot.slug}.jpg</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
