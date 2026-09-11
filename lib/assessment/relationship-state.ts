import type { Answer, AssessmentContext, DimensionScores, SignalMap } from "./types";

// ============================================================
// 关系状态引擎 V2.0
// 仅在 relationshipStage = tense / drifting 时，优先为 RRE 提供
// 「关系当前状态」而非把六维分数误读为固定人格。
// ============================================================

export type RelationshipStateMetrics = Record<string, number>;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[], fallback: number): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
}

function toPercent(value: number | undefined, reverse = false): number | undefined {
  if (value === undefined) return undefined;
  const normalized = (value - 1) * 25;
  return reverse ? 100 - normalized : normalized;
}

function getSignalStrength(signals: SignalMap, key: string): number | undefined {
  const signal = signals[key];
  if (!signal || !signal.value) return undefined;
  if (typeof signal.value === "number") return clamp(signal.value);
  return clamp(signal.confidence || 70);
}

function answerStrength(answerMap: Map<string, number>, ids: string[], reverse = false): number[] {
  return ids
    .map(id => toPercent(answerMap.get(id), reverse))
    .filter((value): value is number => value !== undefined);
}

export function deriveRelationshipState(
  context: AssessmentContext,
  scores: DimensionScores,
  signals: SignalMap,
  answers: Answer[]
): RelationshipStateMetrics {
  if (context.relationshipStage !== "tense" && context.relationshipStage !== "drifting") {
    return {};
  }

  const answerMap = new Map(answers.map(answer => [answer.questionId, answer.value]));
  const exhaustionEvidence = [
    ...answerStrength(answerMap, ["TEN-RP-01"]),
    getSignalStrength(signals, "repair_fatigue"),
    getSignalStrength(signals, "repeated_pattern_erosion"),
  ].filter((value): value is number => value !== undefined);

  const withdrawalEvidence = [
    ...answerStrength(answerMap, ["TEN-SP-01"]),
    getSignalStrength(signals, "sharing_withdrawal"),
  ].filter((value): value is number => value !== undefined);

  const disconnectionEvidence = [
    ...answerStrength(answerMap, ["TEN-SP-01"]),
    getSignalStrength(signals, "relief_in_disconnection"),
  ].filter((value): value is number => value !== undefined);

  const communicationFutilityEvidence = [
    ...answerStrength(answerMap, ["TEN-EX-01"]),
    getSignalStrength(signals, "communication_futility"),
  ].filter((value): value is number => value !== undefined);

  const relationshipExhaustion = clamp(average(exhaustionEvidence, Math.max(45, 100 - scores.repair_orientation * 0.6)));
  const sharingWithdrawal = clamp(average(withdrawalEvidence, 100 - scores.repair_orientation * 0.45));
  const reliefInDisconnection = clamp(average(disconnectionEvidence, Math.max(0, scores.space_need - 5)));
  const communicationFutility = clamp(average(communicationFutilityEvidence, 100 - scores.expression * 0.55));

  // 修复意愿本身是资源；但疲劳高时修复能力会被折损。
  const repairCapacity = clamp(scores.repair_orientation * 0.65 + (100 - relationshipExhaustion) * 0.35);
  const connectionRemaining = clamp(
    scores.repair_orientation * 0.45 +
    scores.response_need * 0.2 +
    (100 - reliefInDisconnection) * 0.2 +
    (100 - sharingWithdrawal) * 0.15
  );
  const trustStability = clamp(
    100 - (
      getSignalStrength(signals, "repeated_pattern_erosion") || 0
    ) * 0.45 - communicationFutility * 0.35 - relationshipExhaustion * 0.2
  );
  const mutuality = clamp(100 - (getSignalStrength(signals, "repair_labor_imbalance") || 0));

  return {
    connection_remaining: connectionRemaining,
    trust_stability: trustStability,
    repair_capacity: repairCapacity,
    relationship_exhaustion: relationshipExhaustion,
    mutuality,
    sharing_withdrawal: sharingWithdrawal,
    relief_in_disconnection: reliefInDisconnection,
    communication_futility: communicationFutility,
    // 没有 FU-TEN-02 时，保守估算并保持为辅助信号；动态追问的答案会在后续覆盖。
    desire_after_problem_resolution: clamp(connectionRemaining * 0.6 + repairCapacity * 0.4),
    baseline_respect_remaining: clamp((connectionRemaining + trustStability) / 2),
  };
}
