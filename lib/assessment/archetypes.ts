import type { Dimension, DimensionScores } from "./types";

// ============================================================
// 原型扩展系统（V3.0）
// 11 个精品手写原型（保留在 score.ts 规则中优先命中）
//   + 12 极性 × 组合命名（覆盖全部 60 种双极组合）
//   + 12 个单极原型（仅一个维度显著时）
// 总计 74 种原型，让更多人得到不同的结果。
// ============================================================

/** 极性 ID：维度 + 高/低侧 */
export type PoleId =
  | "rn_hi" | "rn_lo"
  | "ex_hi" | "ex_lo"
  | "sp_hi" | "sp_lo"
  | "es_hi" | "es_lo"
  | "cu_hi" | "cu_lo"
  | "rp_hi" | "rp_lo";

export interface PoleMeta {
  id: PoleId;
  dim: Dimension;
  side: "hi" | "lo";
  /** 极性中文短语（用于 essence 模板） */
  short: string;
  /** 极性英文（用于牌面英文名组合） */
  en: string;
  /** 主极为该极性时复用的底图 slug（public/tarot/<slug>.jpg） */
  slug: string;
  /** 该极性的一句牌义（组合牌 motto 取主极） */
  motto: string;
}

export const POLES: Record<PoleId, PoleMeta> = {
  rn_hi: { id: "rn_hi", dim: "response_need", side: "hi", short: "高回应需求", en: "Echo", slug: "approach-confirmer", motto: "每一声回响，都是安心的证据。" },
  rn_lo: { id: "rn_lo", dim: "response_need", side: "lo", short: "低回应需求", en: "Anchor", slug: "at-ease-independent", motto: "锚在自己手里，风浪就不算风浪。" },
  ex_hi: { id: "ex_hi", dim: "expression", side: "hi", short: "高表达", en: "Flame", slug: "direct-actor", motto: "心里的话，要让它见到光。" },
  ex_lo: { id: "ex_lo", dim: "expression", side: "lo", short: "低表达", en: "Deep", slug: "keen-observer", motto: "深水无声，却把一切都记得清楚。" },
  sp_hi: { id: "sp_hi", dim: "space_need", side: "hi", short: "高空间需求", en: "Orbit", slug: "self-sufficient", motto: "各自的轨道转得好，相遇才有光。" },
  sp_lo: { id: "sp_lo", dim: "space_need", side: "lo", short: "低空间需求", en: "Hearth", slug: "bridge-restorer", motto: "人间烟火，要两个人一起升起来。" },
  es_hi: { id: "es_hi", dim: "emotional_sensitivity", side: "hi", short: "高情绪敏感", en: "Antenna", slug: "sensitive-perceiver", motto: "风还没起，她已经听见了风声。" },
  es_lo: { id: "es_lo", dim: "emotional_sensitivity", side: "lo", short: "低情绪敏感", en: "Bedrock", slug: "calm-withdrawer", motto: "磐石不问浪，浪自会退。" },
  cu_hi: { id: "cu_hi", dim: "conflict_urgency", side: "hi", short: "即时解决", en: "Spark", slug: "certainty-seeker", motto: "问题不过夜，火星不燎原。" },
  cu_lo: { id: "cu_lo", dim: "conflict_urgency", side: "lo", short: "暂停处理", en: "Ember", slug: "calm-withdrawer", motto: "让情绪先落灰，话才有温度。" },
  rp_hi: { id: "rp_hi", dim: "repair_orientation", side: "hi", short: "高修复", en: "Weaver", slug: "resilient-independent", motto: "裂痕出现时，她已经在穿针引线。" },
  rp_lo: { id: "rp_lo", dim: "repair_orientation", side: "lo", short: "低修复", en: "Drifter", slug: "balance-adapter", motto: "等风把云吹散，天自己会晴。" },
};

/** 规范化组合键（与顺序无关） */
export function pairKey(a: PoleId, b: PoleId): string {
  return [a, b].sort().join("+");
}

/** 双极组合 → 原型名（覆盖全部未被精品规则占用的 51 种组合） */
export const COMBO_NAMES: Record<string, string> = {
  // —— 精品规则同款组合（阈值放宽后仍命中精品名） ——
  [pairKey("es_hi", "ex_lo")]: "敏锐观察者",
  [pairKey("rn_hi", "sp_hi")]: "确定感追求者",
  [pairKey("sp_hi", "rn_lo")]: "独立自足者",
  [pairKey("ex_hi", "cu_hi")]: "直接行动者",
  [pairKey("rn_hi", "cu_hi")]: "靠近确认者",
  [pairKey("sp_hi", "rp_hi")]: "韧性独立者",
  [pairKey("es_hi", "ex_hi")]: "敏感觉察者",
  [pairKey("cu_lo", "sp_hi")]: "沉稳退避者",
  [pairKey("rp_hi", "ex_hi")]: "修复桥梁",
  // 回应需求 × 表达
  [pairKey("rn_hi", "ex_hi")]: "热线追踪者",
  [pairKey("rn_hi", "ex_lo")]: "默语守望者",
  [pairKey("rn_lo", "ex_hi")]: "自如表达者",
  [pairKey("rn_lo", "ex_lo")]: "深潭静水者",
  // 回应需求 × 空间
  [pairKey("rn_hi", "sp_lo")]: "双栖共生者",
  [pairKey("rn_lo", "sp_lo")]: "恒温相伴者",
  // 回应需求 × 敏感
  [pairKey("rn_hi", "es_hi")]: "心潮共振者",
  [pairKey("rn_hi", "es_lo")]: "理性索证者",
  [pairKey("rn_lo", "es_hi")]: "细腻自持者",
  [pairKey("rn_lo", "es_lo")]: "磐石安然者",
  // 回应需求 × 冲突
  [pairKey("rn_hi", "cu_lo")]: "悬心等待者",
  [pairKey("rn_lo", "cu_hi")]: "冷静拆解者",
  [pairKey("rn_lo", "cu_lo")]: "从容缓行者",
  // 回应需求 × 修复
  [pairKey("rn_hi", "rp_hi")]: "安心织网者",
  [pairKey("rn_hi", "rp_lo")]: "灯塔期盼者",
  [pairKey("rn_lo", "rp_hi")]: "无声守护者",
  [pairKey("rn_lo", "rp_lo")]: "松涛自洽者",
  // 表达 × 空间
  [pairKey("ex_hi", "sp_hi")]: "坦诚边界者",
  [pairKey("ex_hi", "sp_lo")]: "无界畅言者",
  [pairKey("ex_lo", "sp_hi")]: "缄默独行者",
  [pairKey("ex_lo", "sp_lo")]: "静默依偎者",
  // 表达 × 敏感
  [pairKey("ex_hi", "es_lo")]: "爽直清风者",
  [pairKey("ex_lo", "es_lo")]: "厚土藏金者",
  // 表达 × 冲突
  [pairKey("ex_hi", "cu_lo")]: "慢语深思者",
  [pairKey("ex_lo", "cu_hi")]: "寡言实干者",
  [pairKey("ex_lo", "cu_lo")]: "深海潜水者",
  // 表达 × 修复
  [pairKey("ex_hi", "rp_lo")]: "直言快语者",
  [pairKey("ex_lo", "rp_hi")]: "无声缝补者",
  [pairKey("ex_lo", "rp_lo")]: "蚌壳自闭者",
  // 空间 × 敏感
  [pairKey("sp_hi", "es_hi")]: "结界感知者",
  [pairKey("sp_hi", "es_lo")]: "冷月独行者",
  [pairKey("sp_lo", "es_hi")]: "涟漪同频者",
  [pairKey("sp_lo", "es_lo")]: "温巢安居者",
  // 空间 × 冲突
  [pairKey("sp_hi", "cu_hi")]: "界限明朗者",
  [pairKey("sp_lo", "cu_hi")]: "直面亲密者",
  [pairKey("sp_lo", "cu_lo")]: "慢火相融者",
  // 空间 × 修复
  [pairKey("sp_hi", "rp_lo")]: "孤峰自持者",
  [pairKey("sp_lo", "rp_hi")]: "织巢筑巢者",
  [pairKey("sp_lo", "rp_lo")]: "顺水推舟者",
  // 敏感 × 冲突
  [pairKey("es_hi", "cu_hi")]: "风暴捕手",
  [pairKey("es_hi", "cu_lo")]: "暗涌承压者",
  [pairKey("es_lo", "cu_hi")]: "定海处置者",
  [pairKey("es_lo", "cu_lo")]: "古松缓语者",
  // 敏感 × 修复
  [pairKey("es_hi", "rp_hi")]: "柔心缝合者",
  [pairKey("es_hi", "rp_lo")]: "玻璃收藏者",
  [pairKey("es_lo", "rp_hi")]: "恒温修护者",
  [pairKey("es_lo", "rp_lo")]: "山岩自稳者",
  // 冲突 × 修复
  [pairKey("cu_hi", "rp_hi")]: "破冰先锋",
  [pairKey("cu_hi", "rp_lo")]: "快刀斩麻者",
  [pairKey("cu_lo", "rp_hi")]: "文火慢炖者",
  [pairKey("cu_lo", "rp_lo")]: "落叶归根者",
};

/** 单极原型（只有一个维度显著时） */
export const SINGLE_NAMES: Record<PoleId, string> = {
  rn_hi: "回声追寻者",
  rn_lo: "静水自安者",
  ex_hi: "心声外放者",
  ex_lo: "沉默深海者",
  sp_hi: "边界漫步者",
  sp_lo: "相拥取暖者",
  es_hi: "微风易感者",
  es_lo: "恒温磐石者",
  cu_hi: "当下破局者",
  cu_lo: "慢火沉淀者",
  rp_hi: "温柔修补者",
  rp_lo: "静待天晴者",
};

/** 由原型名反查极性组成（牌面映射/文案生成用）；精品原型返回 null */
export function polesForName(name: string): { primary: PoleMeta; secondary: PoleMeta | null } | null {
  for (const [key, n] of Object.entries(COMBO_NAMES)) {
    if (n === name) {
      const [a, b] = key.split("+") as [PoleId, PoleId];
      return { primary: POLES[a], secondary: POLES[b] };
    }
  }
  const single = Object.entries(SINGLE_NAMES).find(([, n]) => n === name);
  if (single) return { primary: POLES[single[0] as PoleId], secondary: null };
  return null;
}

/** 极性显著阈值：分数 ≥58 为高侧显著，≤42 为低侧显著 */
const HI = 58;
const LO = 42;

export interface ComboArchetype {
  name: string;
  primary: PoleMeta;
  secondary: PoleMeta | null;
}

/**
 * 由六维分数解析组合原型。
 * 取偏离 50 最多的两个显著极（|score-50| 降序），查组合表命名；
 * 只有一个显著极时用单极原型；无显著极返回 null（由调用方回退「平衡适应者」）。
 */
export function resolveComboArchetype(scores: DimensionScores): ComboArchetype | null {
  const candidates: { pole: PoleMeta; dev: number }[] = [];
  for (const pole of Object.values(POLES)) {
    const s = scores[pole.dim];
    if (pole.side === "hi" && s >= HI) candidates.push({ pole, dev: s - 50 });
    if (pole.side === "lo" && s <= LO) candidates.push({ pole, dev: 50 - s });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.dev - a.dev);
  const [first, second] = candidates;

  if (second) {
    const name = COMBO_NAMES[pairKey(first.pole.id, second.pole.id)];
    if (name) return { name, primary: first.pole, secondary: second.pole };
    // 组合被精品规则占用但分数未达其阈值：用主极单极原型兜底
  }
  return { name: SINGLE_NAMES[first.pole.id], primary: first.pole, secondary: null };
}
