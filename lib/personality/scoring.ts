// =====================================================
// 人格测试计分
//
// V3 主路径：scoreAnswers(paper, answers[]) → PersonalityUserScore
// V1 兼容：computeDimensionScores(answerMap, questions) → {social, rationality, ...}
//           applyScoresToTest(test, scores) → 填充 V3+V1 双轨字段
// =====================================================

import type { PersonalityDimension, PersonalityQuestion, PersonalityTestRecord } from "./types";
import { PERSONALITY_DIMENSIONS } from "./types";
import type { PaperId } from "./questionsData";
import { PERSONALITY_QUESTIONS_1, PERSONALITY_QUESTIONS_2, PERSONALITY_QUESTIONS_3, PERSONALITY_QUESTIONS_4, PERSONALITY_QUESTIONS_5 } from "./questionsData";
import { PERSONALITY_V3_TO_V1_DIM } from "./types";

/** 给定 paper + 36 道答案（optionIndex 0-4），返回每维得分 */
export function scoreAnswers(
  paper: PaperId,
  answers: { questionId: string; optionIndex: number }[],
): {
  raw: Record<PersonalityDimension, number>;
  norm: Record<PersonalityDimension, number>;
  z: Record<PersonalityDimension, number>;
} {
  const list = paper === "P1" ? PERSONALITY_QUESTIONS_1 :
    paper === "P2" ? PERSONALITY_QUESTIONS_2 :
      paper === "P3" ? PERSONALITY_QUESTIONS_3 :
        paper === "P4" ? PERSONALITY_QUESTIONS_4 : PERSONALITY_QUESTIONS_5;

  const raw = { G: 0, X: 0, I: 0, F: 0, S: 0, E: 0 } as Record<PersonalityDimension, number>;

  for (const a of answers) {
    const q = list.find(x => x.id === a.questionId);
    if (!q) continue;
    const idx = Math.max(0, Math.min(4, a.optionIndex | 0)) as 0 | 1 | 2 | 3 | 4;
    raw[q.dimension] += q.scores[idx];
  }

  // norm: 6 题 × 1-5 分 → 6-30 归一到 0-100 整数（Math.round 防止 41.6666...）
  const norm = {} as Record<PersonalityDimension, number>;
  for (const d of PERSONALITY_DIMENSIONS) {
    norm[d] = Math.round(((raw[d] - 6) / (30 - 6)) * 100);
  }

  // z: 6 维标准化（理论分布：单卷每维 6 题 score 1-5 均值 18，std sqrt(12)≈3.464）
  const dimMean = 18;
  const dimStd = Math.sqrt(12);
  const z = {} as Record<PersonalityDimension, number>;
  for (const d of PERSONALITY_DIMENSIONS) {
    z[d] = (raw[d] - dimMean) / dimStd;
  }

  return { raw, norm, z };
}

/** 单题得分 */
export function scoreOf(question: PersonalityQuestion, optionIndex: 0 | 1 | 2 | 3 | 4): number {
  return question.scores[optionIndex];
}

/** band 分档 */
export function dimensionBand(norm: number): "high" | "midHigh" | "mid" | "midLow" | "low" {
  if (norm >= 75) return "high";
  if (norm >= 60) return "midHigh";
  if (norm >= 40) return "mid";
  if (norm >= 25) return "midLow";
  return "low";
}

// ============================================================
// V1 兼容层
// ============================================================

/**
 * V1 兼容：computeDimensionScores(answerMap, questions)
 * answerMap: { [questionId]: "A"|"B"|"C"|"D"|"E" }
 * questions: PersonalityQuestion[]
 * 返回: { social, rationality, planning, risk, dominance, sensitivity }（按 V1 dim key，0-100）
 */
export function computeDimensionScores(
  answerMap: Record<string, "A" | "B" | "C" | "D" | "E">,
  questions?: PersonalityQuestion[],
): Record<string, number> {
  const list = questions ?? PERSONALITY_QUESTIONS_1;
  const raw = { G: 0, X: 0, I: 0, F: 0, S: 0, E: 0 } as Record<PersonalityDimension, number>;

  for (const q of list) {
    const letter = answerMap[q.id];
    if (!letter) continue;
    const idx = "ABCDE".indexOf(letter);
    if (idx < 0) continue;
    raw[q.dimension] += q.scores[idx as 0 | 1 | 2 | 3 | 4];
  }

  const v1: Record<string, number> = {};
  for (const d of PERSONALITY_DIMENSIONS) {
    const norm = Math.round(((raw[d] - 6) / (30 - 6)) * 100);
    v1[PERSONALITY_V3_TO_V1_DIM[d]] = norm;
  }
  return v1;
}

/**
 * 把分数写入 PersonalityTestRecord（同时填充 V3 + V1 双字段）
 * 输入 scores: V1 dim key 字典 或 V3 dim key 字典 都接受
 */
export function applyScoresToTest(
  test: PersonalityTestRecord,
  scores: Record<string, number>,
): Partial<PersonalityTestRecord> {
  // 接受 V1 / V3 两种 key
  const norm = (k: PersonalityDimension) =>
    typeof scores[k] === "number" ? scores[k]! :
      typeof scores[PERSONALITY_V3_TO_V1_DIM[k]] === "number" ? scores[PERSONALITY_V3_TO_V1_DIM[k]]! :
        undefined;

  const g = norm("G");
  const x = norm("X");
  const i = norm("I");
  const f = norm("F");
  const s = norm("S");
  const e = norm("E");

  return {
    g_score: g, x_score: x, i_score: i, f_score: f, s_score: s, e_score: e,
    social_score: g, rationality_score: x, risk_score: i,
    planning_score: f, dominance_score: s, sensitivity_score: e,
    updated_at: new Date().toISOString(),
  };
}
