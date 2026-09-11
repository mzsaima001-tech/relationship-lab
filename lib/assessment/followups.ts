import {
  Question, Answer, DimensionScores, SignalMap,
  AssessmentContext, FollowupTrigger,
} from "./types";

// ============================================================
// RAE — Relationship Adaptive Engine V1
// 动态追问选择引擎
// ============================================================

export function chooseFollowups(
  scores: DimensionScores,
  signals: SignalMap,
  context: AssessmentContext,
  allFollowups: Question[],
  answeredIds: string[]
): Question[] {
  // 1. 筛选触发条件匹配的候选追问
  const candidates = allFollowups.filter(q => {
    if (answeredIds.includes(q.id)) return false;
    if (!q.trigger) return false;
    return triggerMatches(q.trigger, scores, signals, context);
  });

  // 2. 计算 information_gain_score
  const scored = candidates.map(q => ({
    question: q,
    score: calculateInformationGain(q, scores, signals, context),
  }));

  // 3. 按分数排序
  scored.sort((a, b) => b.score - a.score);

  // 4. 多样性保证：同一 exclusionGroup 最多 1 道，同一 dimension 最多 2 道
  const selected: Question[] = [];
  const usedExclusionGroups = new Set<string>();
  const dimensionCount: Record<string, number> = {};

  for (const item of scored) {
    if (selected.length >= 4) break;
    const q = item.question;
    if (q.exclusionGroup && usedExclusionGroups.has(q.exclusionGroup)) continue;
    if (dimensionCount[q.dimension] >= 2) continue;

    selected.push(q);
    if (q.exclusionGroup) usedExclusionGroups.add(q.exclusionGroup);
    dimensionCount[q.dimension] = (dimensionCount[q.dimension] || 0) + 1;
  }

  return selected;
}

function triggerMatches(
  trigger: FollowupTrigger,
  scores: DimensionScores,
  signals: SignalMap,
  context: AssessmentContext
): boolean {
  // minScores 检查
  if (trigger.minScores) {
    for (const [dim, val] of Object.entries(trigger.minScores)) {
      if ((scores as any)[dim] < val) return false;
    }
  }
  // maxScores 检查
  if (trigger.maxScores) {
    for (const [dim, val] of Object.entries(trigger.maxScores)) {
      if ((scores as any)[dim] > val) return false;
    }
  }
  // requiredSignals 检查（全部必须满足）
  if (trigger.requiredSignals) {
    for (const sig of trigger.requiredSignals) {
      if (!signals[sig] || !signals[sig].value) return false;
    }
  }
  // anySignals 检查（至少一个满足）
  if (trigger.anySignals && trigger.anySignals.length > 0) {
    const hasAny = trigger.anySignals.some(sig => signals[sig] && signals[sig].value);
    if (!hasAny) return false;
  }
  // relationshipTypes 检查
  if (trigger.relationshipTypes && trigger.relationshipTypes.length > 0) {
    if (!trigger.relationshipTypes.includes(context.relationshipType)) return false;
  }
  // relationshipStages 检查
  if (trigger.relationshipStages && trigger.relationshipStages.length > 0) {
    if (!trigger.relationshipStages.includes(context.relationshipStage)) return false;
  }
  return true;
}

function calculateInformationGain(
  question: Question,
  scores: DimensionScores,
  signals: SignalMap,
  context: AssessmentContext
): number {
  // information_gain_score =
  //   pattern_uncertainty × 0.40
  // + report_impact × 0.30
  // + confidence_gap × 0.20
  // + relationship_relevance × 0.10

  const patternUncertainty = calculatePatternUncertainty(question, scores, signals);
  const reportImpact = question.reportImpact || 50;
  const confidenceGap = calculateConfidenceGap(question, scores);
  const relationshipRelevance = calculateRelationshipRelevance(question, context);

  return patternUncertainty * 0.40 + reportImpact * 0.30 + confidenceGap * 0.20 + relationshipRelevance * 0.10;
}

function calculatePatternUncertainty(
  question: Question,
  scores: DimensionScores,
  signals: SignalMap
): number {
  // 如果维度分数接近边界（60-75之间），不确定性更高
  const dim = question.dimension;
  const score = scores[dim];
  if (score >= 60 && score <= 75) return 90; // 边界区域，追问价值高
  if (score >= 50 && score <= 80) return 70;
  if (score >= 35 || score <= 85) return 50;
  return 30;
}

function calculateConfidenceGap(question: Question, scores: DimensionScores): number {
  // 如果有矛盾信号，追问价值更高
  const dim = question.dimension;
  const score = scores[dim];
  // 检查是否有矛盾：高分但相关维度也高
  if (dim === "response_need" && score >= 70 && scores.space_need >= 65) return 95;
  if (dim === "emotional_sensitivity" && score >= 70 && scores.expression <= 45) return 95;
  if (dim === "space_need" && score >= 70 && scores.response_need >= 65) return 90;
  if (score >= 70 || score <= 35) return 60;
  return 40;
}

function calculateRelationshipRelevance(
  question: Question,
  context: AssessmentContext
): number {
  // 关系类型相关追问价值更高
  if (question.relationshipTypes?.includes(context.relationshipType)) return 90;
  if (question.relationshipStages?.includes(context.relationshipStage)) return 90;
  return 50;
}
