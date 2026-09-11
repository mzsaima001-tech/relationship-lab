import {
  Dimension, DimensionScores, DimensionResults,
  Answer, Question,
} from "./types";
import { resolveComboArchetype } from "./archetypes";

// ============================================================
// 评分引擎 V2.0
// 含 confidence, contextDependency, evidenceCount
// ============================================================

// 1-5 Likert -> 0-100
export function likertToScore(raw: number, reverse: boolean): number {
  const adjusted = reverse ? 6 - raw : raw;
  return Math.round(((adjusted - 1) / 4) * 100);
}

export function calculateScores(
  questions: Question[],
  answers: Answer[]
): DimensionScores {
  const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
  const scores: DimensionScores = {
    response_need: 0,
    expression: 0,
    space_need: 0,
    emotional_sensitivity: 0,
    conflict_urgency: 0,
    repair_orientation: 0,
  };

  const counts: Record<Dimension, { sum: number; n: number }> = {
    response_need: { sum: 0, n: 0 },
    expression: { sum: 0, n: 0 },
    space_need: { sum: 0, n: 0 },
    emotional_sensitivity: { sum: 0, n: 0 },
    conflict_urgency: { sum: 0, n: 0 },
    repair_orientation: { sum: 0, n: 0 },
  };

  for (const q of questions) {
    const raw = answerMap.get(q.id);
    if (raw === undefined) continue;
    // RP-06 和 RP-09 不进入主维度分数
    if (q.weight === 0) continue;
    const reverse = q.scoreDirection === "reverse" || q.reverse;
    const score = likertToScore(raw, Boolean(reverse));
    counts[q.dimension].sum += score;
    counts[q.dimension].n += 1;
  }

  for (const dim of Object.keys(counts) as Dimension[]) {
    const { sum, n } = counts[dim];
    scores[dim] = n > 0 ? Math.round(sum / n) : 50;
  }

  return scores;
}

// ============================================================
// 维度结果（含 confidence, contextDependency）
// ============================================================

export function calculateDimensionResults(
  questions: Question[],
  answers: Answer[]
): DimensionResults {
  const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
  const scores = calculateScores(questions, answers);

  const results: DimensionResults = {} as DimensionResults;

  for (const dim of Object.keys(scores) as Dimension[]) {
    const dimQuestions = questions.filter(q => q.dimension === dim && q.weight !== 0);
    const dimAnswers = dimQuestions
      .map(q => ({ q, val: answerMap.get(q.id) }))
      .filter(x => x.val !== undefined);

    const evidence = dimAnswers.map(x => x.q.id);
    const evidenceCount = evidence.length;

    // 收集不同场景的证据
    const evidenceContexts = new Set<string>();
    for (const x of dimAnswers) {
      if (x.q.kind === "scenario") evidenceContexts.add("scenario");
      else if (x.q.kind === "forced_choice") evidenceContexts.add("forced_choice");
      else evidenceContexts.add("likert");
      if (x.q.motherQuestionId) evidenceContexts.add(x.q.motherQuestionId);
      if (x.q.phase === "relationship") evidenceContexts.add("relationship");
      if (x.q.phase === "life_stage") evidenceContexts.add("life_stage");
    }

    // confidence: 基于证据数量和多样性
    let confidence = 50;
    if (evidenceCount >= 4) confidence += 20;
    else if (evidenceCount >= 3) confidence += 15;
    else if (evidenceCount >= 2) confidence += 10;
    if (evidenceContexts.size >= 3) confidence += 15;
    else if (evidenceContexts.size >= 2) confidence += 8;
    confidence = Math.min(confidence, 95);

    // contextDependency: 基于同维度不同场景的答案差异
    const rawScores = dimAnswers.map(x => {
      const reverse = x.q.scoreDirection === "reverse" || x.q.reverse;
      return likertToScore(x.val!, Boolean(reverse));
    });
    const variance = rawScores.length > 1
      ? calculateVariance(rawScores)
      : 0;
    const contextDependency = Math.min(Math.round(variance * 1.5), 100);

    // consistency
    const consistency = contextDependency < 30 ? "high" : contextDependency < 60 ? "moderate" : "low";

    results[dim] = {
      score: scores[dim],
      confidence,
      contextDependency,
      evidenceCount,
      evidenceContextCount: evidenceContexts.size,
      evidence,
      consistency,
    };
  }

  return results;
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// ============================================================
// 原型分类
// ============================================================

export function determineArchetype(scores: DimensionScores): string {
  const rn = scores.response_need;
  const ex = scores.expression;
  const sp = scores.space_need;
  const es = scores.emotional_sensitivity;
  const cu = scores.conflict_urgency;
  const rp = scores.repair_orientation;

  if (es >= 70 && ex <= 45) return "敏锐观察者";
  if (rn >= 70 && sp >= 65) return "确定感追求者";
  if (sp >= 70 && rn <= 45) return "独立自足者";
  if (ex >= 70 && cu >= 70) return "直接行动者";
  if (rn >= 65 && cu >= 65) return "靠近确认者";
  if (sp >= 65 && rp >= 65) return "韧性独立者";
  if (es >= 65 && ex >= 65) return "敏感觉察者";
  if (cu <= 40 && sp >= 60) return "沉稳退避者";
  if (rp >= 70 && ex >= 60) return "修复桥梁";
  if (rn <= 40 && sp >= 60 && es <= 50) return "自在独立者";
  // V3.0：精品规则未命中时，按极性组合解析（60 组合 + 12 单极，共 74 种原型）
  const combo = resolveComboArchetype(scores);
  if (combo) return combo.name;
  return "平衡适应者";
}

export function generateTags(scores: DimensionScores): string[] {
  const tags: string[] = [];
  if (scores.response_need >= 70) tags.push("高回应需求");
  if (scores.response_need <= 35) tags.push("低回应需求");
  if (scores.expression >= 70) tags.push("高表达");
  if (scores.expression <= 40) tags.push("低表达");
  if (scores.space_need >= 70) tags.push("高空间需求");
  if (scores.space_need <= 35) tags.push("低空间需求");
  if (scores.emotional_sensitivity >= 70) tags.push("高情绪敏感");
  if (scores.emotional_sensitivity <= 40) tags.push("低情绪敏感");
  if (scores.conflict_urgency >= 70) tags.push("即时解决型");
  if (scores.conflict_urgency <= 40) tags.push("暂停处理型");
  if (scores.repair_orientation >= 70) tags.push("高修复韧性");
  if (scores.repair_orientation <= 40) tags.push("低修复韧性");
  return tags;
}
