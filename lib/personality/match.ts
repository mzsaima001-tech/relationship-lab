// =====================================================
// 人格测试 v3 — 配卡（余弦相似度 + 混合型判定）
//
// 输入：用户 norm 向量（0-100）+ 30 张卡
// 输出：Top3（按相似度降序）+ 混合型判定
//
// 算法（参考上级 对接指南.md + matching_reference.py）：
//   1. 余弦相似度：cos(u, c) = (u · c) / (||u|| × ||c||)
//      —— 注意：用户向量和卡 vec 都在 0-100 同空间，直接算
//      （z-score 模式会因空间不一致导致反序匹配，详见 Python 实验）
//   2. 排序取 Top3
//   3. 混合型判定：用户 norm 平均偏离 50 < 18 且 top1-top2 < 0.03
//
// 实测（2000 人 × 5 卷 = 10000 次评估，交付方数据）：
//   - 99.89% 落到唯一主卡，0.11% 为混合型
//   - 30/30 张卡全部可达，无死卡
//   - 命中分布：最高 5.94% / 最低 1.25%
// =====================================================

import type { PersonalityDimension, PersonalityCard, PersonalityMatchResult } from "./types";
import { PERSONALITY_DIMENSIONS } from "./types";
import { PERSONALITY_CARDS } from "./cards";

/** 余弦相似度（z-score 已经标准化，可直接算） */
export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[]
): number {
  if (a.length !== b.length) throw new Error("cosine: dimension mismatch");
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 混合型阈值（用户在六维上偏中性 + top1 与 top2 太接近） */
const MIXED_NORM_DEV_MAX = 18;     // 用户 6 维 norm 平均 |x-50| < 此值 → 用户偏中性
const MIXED_TOP_DELTA = 0.03;      // top1 与 top2 相似度差 < 此值 → 无明显主导

/** 主匹配函数 */
export function matchCards(
  userNorm: readonly number[],  // 长度 6，顺序 G,X,I,F,S,E，0-100
  cards: readonly PersonalityCard[] = PERSONALITY_CARDS
): PersonalityMatchResult {
  if (userNorm.length !== 6) throw new Error("userNorm 长度必须是 6 (G,X,I,F,S,E)");

  // 算所有卡相似度并排序
  const scored = cards
    .map(card => ({ card, sim: cosineSimilarity(userNorm, card.vec) }))
    .sort((a, b) => b.sim - a.sim);

  const [top1, top2, top3] = scored;
  if (!top1 || !top2 || !top3) throw new Error("cards 不能为空");

  // 混合型判定：用户 6 维偏离 50 的程度 + top1 与 top2 差距
  const meanDev = PERSONALITY_DIMENSIONS.reduce((s, _d, i) => s + Math.abs(userNorm[i] - 50), 0) / 6;
  const topDelta = top1.sim - top2.sim;
  const isMixed = meanDev < MIXED_NORM_DEV_MAX && topDelta < MIXED_TOP_DELTA;

  return {
    top1: { card: top1.card, similarity: round(top1.sim) },
    top2: { card: top2.card, similarity: round(top2.sim) },
    top3: { card: top3.card, similarity: round(top3.sim) },
    is_mixed: isMixed,
    mixed_note: isMixed
      ? "你在六个方向上都很均衡，没有一张卡能完整描述你——这是你的特点，不是缺陷。"
      : undefined,
  };
}

function round(n: number, digits = 4): number {
  const k = 10 ** digits;
  return Math.round(n * k) / k;
}

/** 排序用的辅助：top1 与 top2 距离（debug / 监控） */
export function matchDelta(result: PersonalityMatchResult): number {
  return round(result.top1.similarity - result.top2.similarity, 4);
}

/** 6 维数组填充工具：从 Record 转 array（保证顺序） */
export function vecFromRecord(rec: Record<PersonalityDimension, number>): readonly number[] {
  return PERSONALITY_DIMENSIONS.map(d => rec[d]);
}