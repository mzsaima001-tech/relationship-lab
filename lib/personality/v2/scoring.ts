// =====================================================
// 人格测试 v5 — 计分
// 按对接指南「四、计分规则」：
//  1) 每题 5 个选项自带 score（1-5），按维度累加（不再 reverse）
//  2) 单维度 6 题 × score 1-5 → [6, 30]
//  3) z-score = (raw - mean) / std，方便跨卡匹配
// =====================================================

import type { V2Dimension, V2RawScoreVector, V2ZScoreVector } from "./types";
import { V2_DIMENSIONS, V2_DIM_INDEX, V2_DIM_MAX, V2_DIM_MIN } from "./dimensions";
import type { V2Paper } from "./papers";

/**
 * 输入：answers = { questionId: optionIndex(0..4) }
 * 输出：6 维原始分向量（[6,30]）
 *
 * 注意：optionIndex 是用户点击的选项序号（0=第一项）
 * 这里从前端的 answers（map<questionId, optionIndex>）查论文后 score 累加
 */
export function computeRawScores(
  paper: V2Paper,
  answers: Record<string, number>
): V2RawScoreVector {
  const sums: Record<V2Dimension, number> = {
    G: 0, X: 0, I: 0, F: 0, S: 0, E: 0,
  };
  for (const q of paper.questions) {
    const optIdx = answers[q.id];
    if (typeof optIdx !== "number" || optIdx < 0 || optIdx >= q.options.length) {
      continue; // 容错：缺失用 0（极保守，下方会归一化）
    }
    sums[q.dim] += q.options[optIdx].score;
  }
  return sums;
}

/**
 * 把原始分转 z-score
 * 经验分布：单维 6 题 × score 1-5 → 期望均值 18（=3×6）、理论值域 [6,30]、理论方差（5-1）/2 = 4 → 公式 σ=√(6 × 4)=~4.9
 * 但因为维度被刻意打散，这里不用理论分布，直接用「线性映射到 [-2.5, +2.5]」做归一化（z 期望落在 [-2, +2]）
 *
 * @returns z 向量（每维典型落在 [-2.5, +2.5]）
 */
export function normalizeZScores(raw: V2RawScoreVector): V2ZScoreVector {
  const z = {} as V2ZScoreVector;
  const MID = (V2_DIM_MAX + V2_DIM_MIN) / 2; // 18
  const RANGE = (V2_DIM_MAX - V2_DIM_MIN) / 2 / 2.5; // (30-6)/2 / 2.5 = 4.8
  // 说明：把 [MID-2.5*RANGE, MID+2.5*RANGE] = [6, 30] 映射到 [-2.5, +2.5]
  // 即 z = (raw - MID) / RANGE
  for (const d of V2_DIMENSIONS) {
    z[d] = (raw[d] - MID) / RANGE;
  }
  return z;
}

/** 把 z-score 转回 0-100（用于雷达图渲染，每维 50=中性） */
export function zToHundred(z: V2ZScoreVector): Record<V2Dimension, number> {
  const out = {} as Record<V2Dimension, number>;
  for (const d of V2_DIMENSIONS) {
    // z=-2.5→0, z=0→50, z=+2.5→100
    const v = 50 + z[d] * 20;
    out[d] = Math.max(0, Math.min(100, Math.round(v)));
  }
  return out;
}

/** 用于报告里的分档标签（基于 raw score，理论值域 6-30） */
export type V2Band = "high" | "midHigh" | "mid" | "midLow" | "low";

export function rawBandOf(raw: number): V2Band {
  if (raw >= 25) return "high";
  if (raw >= 22) return "midHigh";
  if (raw >= 16) return "mid";
  if (raw >= 13) return "midLow";
  return "low";
}

export const V2_BAND_LABELS: Record<V2Band, string> = {
  high: "高",
  midHigh: "中高",
  mid: "中等",
  midLow: "中低",
  low: "低",
};

/** 把 6 维按 |z| 降序取前 2 */
export function pickTopDimensions(z: V2ZScoreVector) {
  return V2_DIMENSIONS
    .map((d) => ({ key: d, z: z[d], absZ: Math.abs(z[d]) }))
    .sort((a, b) => b.absZ - a.absZ)
    .slice(0, 2);
}

/** 取 vec[] 在 6 维上的 raw 中心点（用于人话文案） */
export function dimIndex(d: V2Dimension): number {
  return V2_DIM_INDEX[d];
}
