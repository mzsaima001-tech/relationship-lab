// =====================================================
// 人格测试 v5 — 匹配算法
// 按对接指南「五、匹配算法」：
//   user vec (z-score 6 维) → cosine similarity to 30 cards.vec → 排序取 Top3
//   混合型判定：|max(z)| < 0.50 且 top1 - top2 < THRESHOLD → 无明显主导卡
// =====================================================

import type { V2Dimension, V2ZScoreVector, V2MatchResult } from "./types";
import { V2_DIMENSIONS } from "./dimensions";
import { V2_CARDS } from "./cards";

/** 余弦相似度（user vec [a,b,c,d,e,f] vs card vec [a',b',c',d',e',f']） */
function cosine(a: V2ZScoreVector, cardVec: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < V2_DIMENSIONS.length; i++) {
    const ai = a[V2_DIMENSIONS[i]];
    const bi = cardVec[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 把 6 维展开成长度 6 的数值数组（与 cards.vec 顺序对齐）
 * 注意：保持 G/X/I/F/S/E 顺序
 */
export function zToVecArray(z: V2ZScoreVector): number[] {
  return V2_DIMENSIONS.map((d) => z[d]);
}

/** 计算最大 |z| —— 用于混合型判定 */
export function maxAbsZ(z: V2ZScoreVector): number {
  let m = 0;
  for (const d of V2_DIMENSIONS) {
    m = Math.max(m, Math.abs(z[d]));
  }
  return m;
}

/**
 * 30 卡 Top1 距离阈值经验值（来自对接指南 99.89% 落到唯一主卡实测）
 * 当 Top1 与 Top2 余弦差 < THRESHOLD 且 user 整体偏中性 → 算混合型
 */
const MIXED_TOP_THRESHOLD = 0.08;
const MIXED_MAX_ABS_Z = 0.50;

/** 主匹配函数 */
export function matchTop3(z: V2ZScoreVector): V2MatchResult {
  // 1. 算 30 张卡的余弦相似度
  const scored = V2_CARDS.map((card) => ({
    card,
    sim: cosine(z, card.vec),
  })).sort((a, b) => b.sim - a.sim);

  // 2. 取 Top3
  const [top1, top2, top3] = scored;

  // 3. 混合型判定
  const isMixed =
    maxAbsZ(z) < MIXED_MAX_ABS_Z &&
    top1.sim - top2.sim < MIXED_TOP_THRESHOLD;

  return {
    top1: { card: top1.card, sim: top1.sim },
    top2: { card: top2.card, sim: top2.sim },
    top3: { card: top3.card, sim: top3.sim },
    isMixed,
    mixedNote: isMixed
      ? "你在六个方向上都很均衡，没有被任何一张主卡独占——这是少见的「在中间」的状态。"
      : undefined,
  };
}

/** hash(userId + testId) % 5 → paper_id */
export function pickPaperId(userKey: string): "P1" | "P2" | "P3" | "P4" | "P5" {
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < userKey.length; i++) {
    hash ^= userKey.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  const idx = hash % 5;
  return (["P1", "P2", "P3", "P4", "P5"] as const)[idx];
}
