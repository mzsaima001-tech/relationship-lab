"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PERSONALITY_CARDS } from "@/lib/personality/cards";
import {
  PERSONALITY_DIMENSION_META,
  PERSONALITY_DIMENSIONS,
} from "@/lib/personality/types";
import { PersonalityCard } from "@/lib/personality/cards/PersonalityCard";

const TYPE_LABELS = {
  主: "主型 · Principal",
  过渡: "过渡 · Transit",
} as const;

const TYPE_BADGE = {
  主: "bg-amber-50 text-amber-700 border-amber-200",
  过渡: "bg-indigo-50 text-indigo-700 border-indigo-200",
} as const;

const TYPE_FILTERS = [
  { key: "all", label: "全部 30" },
  { key: "主", label: "主型 15" },
  { key: "过渡", label: "过渡 15" },
] as const;

export default function CardsAdminPage() {
  const [filter, setFilter] = useState<"all" | "主" | "过渡">("all");
  const [preview, setPreview] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? [...PERSONALITY_CARDS]
        : PERSONALITY_CARDS.filter(c => c.type === filter),
    [filter],
  );

  // ESC 关闭预览
  useEffect(() => {
    if (!preview) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [preview]);

  return (
    <div className="space-y-6">
      {/* 顶部 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">月相卡牌</h1>
          <p className="mt-1 text-sm text-gray-500">
            共 {PERSONALITY_CARDS.length} 张 · 主型 {PERSONALITY_CARDS.filter(c => c.type === "主").length} · 过渡 {PERSONALITY_CARDS.filter(c => c.type === "过渡").length}
            <span className="mx-2 text-gray-300">|</span>
            <span>PNG 同步在 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">public/personality/cards/</code></span>
          </p>
        </div>
        <div className="flex gap-2">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                filter === f.key
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* PNG 预览缺失警告 */}
      <MissingPngChecker />

      {/* 卡片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(card => (
          <CardItem key={card.id} cardId={card.id} onPreview={() => setPreview(card.png_path)} />
        ))}
      </div>

      {/* 预览弹层 */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm fade-in"
          role="dialog"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-h-[92vh] max-w-[92vw] rounded-sm border border-amber-300/30 bg-gray-950/40 p-4 shadow-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="月相卡预览"
              className="max-h-[82vh] max-w-[80vw] object-contain"
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-gray-900 shadow-lg hover:bg-amber-200"
              aria-label="关闭"
            >
              ✕
            </button>
            <p className="mt-3 text-center text-xs text-amber-200/80">
              {preview.replace("/personality/cards/", "")} · 按 ESC 或点击空白处关闭
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== 单卡组件 ======

function CardItem({ cardId, onPreview }: { cardId: string; onPreview: () => void }) {
  const card = PERSONALITY_CARDS.find(c => c.id === cardId)!;
  const isMain = card.type === "主";

  return (
    <div
      onClick={onPreview}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-3 transition hover:border-amber-300 hover:shadow-md"
    >
      {/* 缩略卡 */}
      <div className="mb-2.5 flex justify-center">
        <PersonalityCard card={card} size="sm" theme="dark" label={isMain ? "primary" : "secondary"} />
      </div>

      {/* 标题行 */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate font-mono text-xs text-gray-500">{card.id}</p>
        <span
          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] ${
            TYPE_BADGE[card.type as keyof typeof TYPE_BADGE] || "border-gray-200 bg-gray-50 text-gray-500"
          }`}
        >
          {card.phase} · {card.no}
        </span>
      </div>

      <p className="truncate text-sm font-semibold text-gray-900">{card.name}</p>
      <p className="truncate text-[11px] text-gray-400">{card.phase_en}</p>

      {/* 判词 */}
      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-gray-600">
        「{card.line}」
      </p>

      {/* 6 维 mini bar */}
      <div className="mt-2.5 space-y-1">
        {PERSONALITY_DIMENSIONS.map((d, i) => {
          const v = card.vec[i];
          return (
            <div key={d} className="flex items-center gap-1.5">
              <span className="w-3 shrink-0 font-mono text-[9px] text-gray-400">{d}</span>
              <div className="flex-1 h-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full ${v >= 60 ? "bg-amber-500" : v <= 40 ? "bg-slate-400" : "bg-gray-400"}`}
                  style={{ width: `${v}%` }}
                />
              </div>
              <span className="w-5 shrink-0 text-right font-mono text-[9px] text-gray-500">{v}</span>
            </div>
          );
        })}
      </div>

      {/* poles 标签 */}
      {card.poles && (
        <p className="mt-2 font-mono text-[10px] text-amber-700">{card.poles}</p>
      )}
    </div>
  );
}

// ====== PNG 缺失检测 ======

function MissingPngChecker() {
  const [missing, setMissing] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const results = await Promise.all(
        PERSONALITY_CARDS.map(async c => {
          try {
            const res = await fetch(c.png_path, { method: "HEAD" });
            return res.ok ? null : c.id;
          } catch {
            return c.id;
          }
        }),
      );
      setMissing(results.filter(Boolean) as string[]);
      setDone(true);
    })();
  }, []);

  if (!done || missing.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <p className="font-semibold">⚠ {missing.length} 张卡片 PNG 缺失</p>
      <p className="mt-1 text-xs text-red-600">
        缺失 ID：<code className="font-mono">{missing.join(", ")}</code>
      </p>
      <p className="mt-1 text-xs">
        把 PNG 放到 <code className="rounded bg-red-100 px-1 font-mono">public/personality/cards/{missing[0]}.png</code> 等位置即可。
      </p>
    </div>
  );
}