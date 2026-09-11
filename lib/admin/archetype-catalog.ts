// ============================================================
// 原型卡牌目录（后台管理只读视图）
// 聚合 lib/assessment/archetypes + lib/reports/copybook + lib/reports/tarot
// 注意：PREMIUM_RULES 阈值文案与 lib/assessment/score.ts
//       determineArchetype 一一对应，改阈值时需同步此处。
// ============================================================

import {
  COMBO_NAMES,
  SINGLE_NAMES,
  POLES,
  polesForName,
  type PoleId,
} from "@/lib/assessment/archetypes";
import { ARCHETYPE_COPY, type ArchetypeCopy } from "@/lib/reports/copybook";
import { tarotFor, tarotImage, type TarotCardAsset } from "@/lib/reports/tarot";
import { DIMENSION_LABELS, type Dimension } from "@/lib/assessment/types";

export type ArchetypeKind = "premium" | "combo" | "single" | "fallback";

export const ARCHETYPE_KIND_LABELS: Record<ArchetypeKind, string> = {
  premium: "精品规则",
  combo: "双极组合",
  single: "单极原型",
  fallback: "平衡兜底",
};

/** 精品规则命中条件（与 score.ts determineArchetype 阈值对应） */
export const PREMIUM_RULES: Record<string, string> = {
  "敏锐观察者": "情绪敏感 ≥ 70 且 主动表达 ≤ 45",
  "确定感追求者": "回应需求 ≥ 70 且 空间需求 ≥ 65",
  "独立自足者": "空间需求 ≥ 70 且 回应需求 ≤ 45",
  "直接行动者": "主动表达 ≥ 70 且 冲突处理 ≥ 70",
  "靠近确认者": "回应需求 ≥ 65 且 冲突处理 ≥ 65",
  "韧性独立者": "空间需求 ≥ 65 且 修复韧性 ≥ 65",
  "敏感觉察者": "情绪敏感 ≥ 65 且 主动表达 ≥ 65",
  "沉稳退避者": "冲突处理 ≤ 40 且 空间需求 ≥ 60",
  "修复桥梁": "修复韧性 ≥ 70 且 主动表达 ≥ 60",
  "自在独立者": "回应需求 ≤ 40 且 空间需求 ≥ 60 且 情绪敏感 ≤ 50",
};

export const FALLBACK_ARCHETYPE = "平衡适应者";

export interface ArchetypePoleView {
  id: PoleId;
  dim: Dimension;
  dimLabel: string;
  side: "hi" | "lo";
  short: string;
  en: string;
}

export interface ArchetypeCatalogItem {
  name: string;
  kind: ArchetypeKind;
  kindLabel: string;
  /** 命中条件说明 */
  rule: string;
  /** 文案来源：精品手写 / 极性组合生成 */
  copySource: "handwritten" | "generated";
  poles: ArchetypePoleView[];
  copy: ArchetypeCopy | null;
  tarot: TarotCardAsset & { image: string };
}

export interface ArchetypeCatalog {
  total: number;
  byKind: Record<ArchetypeKind, number>;
  items: ArchetypeCatalogItem[];
}

function poleView(id: PoleId): ArchetypePoleView {
  const p = POLES[id];
  return {
    id: p.id,
    dim: p.dim,
    dimLabel: DIMENSION_LABELS[p.dim],
    side: p.side,
    short: p.short,
    en: p.en,
  };
}

export function buildArchetypeCatalog(): ArchetypeCatalog {
  const items: ArchetypeCatalogItem[] = [];
  const byKind: Record<ArchetypeKind, number> = { premium: 0, combo: 0, single: 0, fallback: 0 };

  const push = (name: string, kind: ArchetypeKind, poleIds: PoleId[], rule: string) => {
    byKind[kind]++;
    const tarot = tarotFor(name);
    items.push({
      name,
      kind,
      kindLabel: ARCHETYPE_KIND_LABELS[kind],
      rule,
      copySource: kind === "combo" || kind === "single" ? "generated" : "handwritten",
      poles: poleIds.map(poleView),
      copy: ARCHETYPE_COPY[name] ?? null,
      tarot: { ...tarot, image: tarotImage(tarot.slug) },
    });
  };

  // 精品规则（10 个，score.ts 优先命中）
  for (const [name, rule] of Object.entries(PREMIUM_RULES)) {
    const poles = polesForName(name);
    const poleIds: PoleId[] = poles
      ? [poles.primary.id, ...(poles.secondary ? [poles.secondary.id] : [])]
      : name === "自在独立者"
        ? ["rn_lo", "sp_hi"] // 三条件规则，极性仅作展示
        : [];
    push(name, "premium", poleIds, `精品规则优先命中：${rule}`);
  }

  // 双极组合（60 组合中除 9 个精品同名外的 51 个）
  for (const [key, name] of Object.entries(COMBO_NAMES)) {
    if (name in PREMIUM_RULES) continue;
    const [a, b] = key.split("+") as [PoleId, PoleId];
    push(
      name,
      "combo",
      [a, b],
      `显著极性组合：${POLES[a].short} × ${POLES[b].short}（取偏离 50 最多的两个显著极，阈值 ≥58 / ≤42）`
    );
  }

  // 单极原型（12 个）
  for (const [id, name] of Object.entries(SINGLE_NAMES)) {
    const pid = id as PoleId;
    push(name, "single", [pid], `仅「${POLES[pid].short}」一个显著极性（其余五维均在 42–58 之间）`);
  }

  // 平衡兜底
  push(FALLBACK_ARCHETYPE, "fallback", [], "六维均在 42–58 之间、无任何显著极性时的平衡兜底");

  return { total: items.length, byKind, items };
}
