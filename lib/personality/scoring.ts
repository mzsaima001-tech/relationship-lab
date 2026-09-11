// =====================================================
// 我到底什么性格 — 评分算法
// PRD 第十一节：6 维 0-100 分计算
// =====================================================

import {
  PERSONALITY_DIMENSIONS,
  type AnswerLetter,
  type PersonalityBand,
  type PersonalityDimension,
  type PersonalityTestRecord,
} from "./types";
import { ANSWER_VALUES } from "./types";
import type { PersonalityQuestion } from "./questions";

/** 单题反向处理 + 转 0-100 分 */
export function scoreAnswer(
  question: PersonalityQuestion,
  letter: AnswerLetter
): number {
  // 原始分 1-4
  const raw = ANSWER_VALUES[letter];
  // 反向题：4-3-2-1 倒置 → 5-raw
  const normalized = question.reverse ? 5 - raw : raw;
  // 每维 6 题：最低 6（= 1×6），最高 24（= 4×6）
  // 单题贡献：(normalized - 1) / 3，区间 [0,1]
  return (normalized - 1) / 3;
}

/**
 * 6 维原始 0-100 分。
 * inputs：每题答案（{questionId: letter}）+ 题库。
 * 缺题按 2.5（中性）处理（容错，避免作废）。
 */
export function computeDimensionScores(
  answers: Record<string, AnswerLetter>,
  questions: PersonalityQuestion[]
): Record<PersonalityDimension, number> {
  const scores = {} as Record<PersonalityDimension, number>;
  for (const dim of PERSONALITY_DIMENSIONS) {
    const dimQuestions = questions.filter((q) => q.dimension === dim);
    if (dimQuestions.length === 0) {
      scores[dim] = 50;
      continue;
    }
    let sum = 0;
    for (const q of dimQuestions) {
      const letter = answers[q.id] ?? "C"; // 缺题中性
      sum += scoreAnswer(q, letter);
    }
    const avg = sum / dimQuestions.length; // [0, 1]
    const pct = Math.round(avg * 100);
    scores[dim] = Math.max(0, Math.min(100, pct));
  }
  return scores;
}

/** 分档标签 */
export function bandOf(score: number): PersonalityBand {
  if (score >= 75) return "high";
  if (score >= 60) return "midHigh";
  if (score >= 40) return "mid";
  if (score >= 25) return "midLow";
  return "low";
}

/** 分档中文标签（用于报告展示） */
export const BAND_LABELS_CN: Record<PersonalityBand, string> = {
  high: "高",
  midHigh: "中高",
  mid: "中等",
  midLow: "中低",
  low: "低",
};

/** 将分数写入测试记录 */
export function applyScoresToTest(
  test: PersonalityTestRecord,
  scores: Record<PersonalityDimension, number>
): PersonalityTestRecord {
  return {
    ...test,
    social_score: scores.social,
    rationality_score: scores.rationality,
    planning_score: scores.planning,
    risk_score: scores.risk,
    dominance_score: scores.dominance,
    sensitivity_score: scores.sensitivity,
  };
}