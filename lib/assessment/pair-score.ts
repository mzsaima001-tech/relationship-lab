import type {
  DetectedPairPattern,
  Dimension,
  DimensionScores,
  PairPattern,
  PairPatternTrigger,
  PairScore,
  RelationshipStage,
  RelationshipType,
} from "./types";
import { getPairPatterns } from "@/lib/content/store";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function similarity(a: number, b: number): number {
  return Math.max(30, Math.round(100 - Math.abs(a - b) * 0.7));
}

export interface PairScores {
  attention: number;
  communication: number;
  distanceRhythm: number;
  conflictRepair: number;
  longTermComfort: number;
  overall: number;
}

/** 保留 V1 页面依赖的评分结构。 */
export function calculatePairScores(a: DimensionScores, b: DimensionScores): PairScores {
  const attention = Math.round(
    (similarity(a.response_need, b.response_need) + similarity(a.emotional_sensitivity, b.emotional_sensitivity)) / 2
  );
  const communication = Math.round(
    (similarity(a.expression, b.expression) + similarity(a.conflict_urgency, b.conflict_urgency)) / 2
  );
  const distanceRhythm = Math.round(
    (similarity(a.space_need, b.space_need) + similarity(a.response_need, b.response_need)) / 2
  );
  const conflictRepair = Math.round(
    (similarity(a.conflict_urgency, b.conflict_urgency) + similarity(a.repair_orientation, b.repair_orientation)) / 2
  );
  const longTermComfort = Math.round(
    attention * 0.2 + communication * 0.25 + distanceRhythm * 0.2 + conflictRepair * 0.35
  );
  const overall = Math.round(
    attention * 0.2 + communication * 0.25 + distanceRhythm * 0.2 + conflictRepair * 0.2 + longTermComfort * 0.15
  );
  return { attention, communication, distanceRhythm, conflictRepair, longTermComfort, overall };
}

export type PairSignalValue =
  | boolean
  | number
  | string
  | { value: boolean | number | string; confidence?: number };
export type PairSignals = Readonly<Record<string, PairSignalValue | undefined>>;

export interface PairDetectionOptions {
  aSignals?: PairSignals;
  bSignals?: PairSignals;
  /** aliases convenient for API payloads */
  signalsA?: PairSignals;
  signalsB?: PairSignals;
  relationshipType?: RelationshipType;
  relationshipStage?: RelationshipStage;
  /** 0-100, or a per-pattern value. Defaults to a neutral 50. */
  recurrence?: number | Readonly<Record<string, number>>;
  /** 0-100, or a per-pattern value. Defaults to pattern priority. */
  reportRelevance?: number | Readonly<Record<string, number>>;
}

interface MatchResult {
  confidence: number;
  intensity: number;
}

const dimensions: readonly Dimension[] = [
  "response_need",
  "expression",
  "space_need",
  "emotional_sensitivity",
  "conflict_urgency",
  "repair_orientation",
];

function signalStrength(signals: PairSignals, key: string, scores: DimensionScores): number {
  if (key === "space_need_high") return scores.space_need;
  const raw = signals[key];
  if (raw === undefined) return 0;
  if (typeof raw === "boolean") return raw ? 100 : 0;
  if (typeof raw === "number") return clamp(raw);
  if (typeof raw === "string") {
    const normalized = raw.toLowerCase();
    return normalized === "false" || normalized === "low" || normalized === "none" || normalized === "0" ? 0 : 100;
  }
  const value = raw.value;
  const active = typeof value === "boolean"
    ? value
    : typeof value === "number"
      ? value >= 50
      : !["false", "low", "none", "0"].includes(value.toLowerCase());
  return active ? clamp(raw.confidence ?? (typeof value === "number" ? value : 100)) : 0;
}

function thresholdEvidence(
  scores: DimensionScores,
  thresholds: Partial<DimensionScores> | undefined,
  mode: "min" | "max",
  confidenceEvidence: number[],
  intensityEvidence: number[]
): boolean {
  if (!thresholds) return true;
  for (const dimension of dimensions) {
    const threshold = thresholds[dimension];
    if (threshold === undefined) continue;
    const value = scores[dimension];
    if ((mode === "min" && value < threshold) || (mode === "max" && value > threshold)) return false;
    const margin = mode === "min" ? value - threshold : threshold - value;
    confidenceEvidence.push(clamp(75 + margin));
    intensityEvidence.push(mode === "min" ? value : 100 - value);
  }
  return true;
}

function signalEvidence(
  scores: DimensionScores,
  signals: PairSignals,
  required: string[] | undefined,
  any: string[] | undefined,
  confidenceEvidence: number[],
  intensityEvidence: number[]
): boolean {
  if (required) {
    for (const key of required) {
      const strength = signalStrength(signals, key, scores);
      if (strength < 50) return false;
      confidenceEvidence.push(strength);
      intensityEvidence.push(strength);
    }
  }
  if (any?.length) {
    const strength = Math.max(...any.map((key) => signalStrength(signals, key, scores)));
    if (strength < 50) return false;
    confidenceEvidence.push(strength);
    intensityEvidence.push(strength);
  }
  return true;
}

function matchesTrigger(
  trigger: PairPatternTrigger,
  a: DimensionScores,
  b: DimensionScores,
  aSignals: PairSignals,
  bSignals: PairSignals,
  options: PairDetectionOptions
): MatchResult | null {
  if (trigger.relationshipTypes?.length) {
    if (!options.relationshipType || !trigger.relationshipTypes.includes(options.relationshipType)) return null;
  }
  if (trigger.relationshipStages?.length) {
    if (!options.relationshipStage || !trigger.relationshipStages.includes(options.relationshipStage)) return null;
  }

  const confidenceEvidence: number[] = [];
  const intensityEvidence: number[] = [];
  if (!thresholdEvidence(a, trigger.aMin, "min", confidenceEvidence, intensityEvidence)) return null;
  if (!thresholdEvidence(a, trigger.aMax, "max", confidenceEvidence, intensityEvidence)) return null;
  if (!thresholdEvidence(b, trigger.bMin, "min", confidenceEvidence, intensityEvidence)) return null;
  if (!thresholdEvidence(b, trigger.bMax, "max", confidenceEvidence, intensityEvidence)) return null;

  if (trigger.minDifference) {
    for (const dimension of dimensions) {
      const requiredGap = trigger.minDifference[dimension];
      if (requiredGap === undefined) continue;
      const gap = Math.abs(a[dimension] - b[dimension]);
      if (gap < requiredGap) return null;
      confidenceEvidence.push(clamp(70 + gap - requiredGap));
      intensityEvidence.push(gap);
    }
  }

  if (!signalEvidence(a, aSignals, trigger.aRequiredSignals, trigger.aAnySignals, confidenceEvidence, intensityEvidence)) return null;
  if (!signalEvidence(b, bSignals, trigger.bRequiredSignals, trigger.bAnySignals, confidenceEvidence, intensityEvidence)) return null;

  if (trigger.relationshipTypes?.length || trigger.relationshipStages?.length) confidenceEvidence.push(100);
  if (!confidenceEvidence.length) return null;
  return {
    confidence: clamp(confidenceEvidence.reduce((sum, value) => sum + value, 0) / confidenceEvidence.length),
    intensity: clamp(intensityEvidence.reduce((sum, value) => sum + value, 0) / Math.max(1, intensityEvidence.length)),
  };
}

function optionValue(
  value: number | Readonly<Record<string, number>> | undefined,
  patternId: string,
  fallback: number
): number {
  if (typeof value === "number") return clamp(value);
  return clamp(value?.[patternId] ?? fallback);
}

function directionFor(patternId: string, reversed: boolean): Record<string, string> | undefined {
  const a = reversed ? "B" : "A";
  const b = reversed ? "A" : "B";
  switch (patternId) {
    case "APPROACH_WITHDRAW": return { approacher: a, withdrawer: b };
    case "HIGH_LOW_SENSITIVITY": return { highSensitivity: a, lowSensitivity: b };
    case "DIRECT_INDIRECT": return { direct: a, indirect: b };
    case "SOLVE_NOW_PAUSE": return { solveNow: a, pause: b };
    case "REPAIR_MISMATCH": return { highRepair: a, lowRepair: b };
    case "WORDS_ACTIONS": return { words: a, actions: b };
    case "RITUAL_MISMATCH": return { highRitual: a, lowRitual: b };
    case "PRIVACY_TRANSPARENCY": return { privacy: a, transparency: b };
    case "PRIORITY_EXPECTATION_GAP": return { highPriorityExpectation: a, lowPriorityExpectation: b };
    case "INTEGRATION_AUTONOMY": return { integration: a, autonomy: b };
    case "FUTURE_CLARITY_GAP": return { highClarityNeed: a, lowClarityNeed: b };
    case "EMOTIONAL_LABOR_IMBALANCE": return { supportProvider: a, emotionalOutput: b };
    case "REPAIR_LABOR_GAP": return { repairInitiator: a, partner: b };
    default: return patternId === "JEALOUS_BUT_TRUSTING" ? { person: a } : undefined;
  }
}

function approachWithdrawSeverity(
  a: DimensionScores,
  b: DimensionScores,
  recurrence: number
): number {
  return clamp(
    a.response_need * 0.25 +
    b.space_need * 0.25 +
    a.conflict_urgency * 0.15 +
    (100 - b.conflict_urgency) * 0.15 +
    recurrence * 0.2
  );
}

interface RankedPattern {
  detected: DetectedPairPattern;
  rank: number;
}

/**
 * 检测并排序核心互动模式。运行时返回 DetectedPairPattern[]；交叉数组类型仅让尚未迁移的
 * V1 报告调用点继续通过类型检查，新代码应按 DetectedPairPattern[] 使用。
 */
export function detectPairPatterns(
  a: DimensionScores,
  b: DimensionScores,
  options: PairDetectionOptions = {}
): DetectedPairPattern[] & string[] {
  const aSignals = options.aSignals ?? options.signalsA ?? {};
  const bSignals = options.bSignals ?? options.signalsB ?? {};
  const ranked: RankedPattern[] = [];

  for (const pattern of getPairPatterns()) {
    let reversed = false;
    let match = matchesTrigger(pattern.trigger, a, b, aSignals, bSignals, options);
    if (!match && pattern.category !== "similarity") {
      match = matchesTrigger(pattern.trigger, b, a, bSignals, aSignals, options);
      reversed = Boolean(match);
    }
    if (!match || match.confidence < pattern.minimumConfidence) continue;

    const recurrence = optionValue(options.recurrence, pattern.id, 50);
    const reportRelevance = optionValue(options.reportRelevance, pattern.id, pattern.priority);
    const severity = pattern.id === "APPROACH_WITHDRAW"
      ? reversed
        ? approachWithdrawSeverity(b, a, recurrence)
        : approachWithdrawSeverity(a, b, recurrence)
      : clamp(match.intensity * 0.8 + recurrence * 0.2);
    const rank = match.confidence * 0.3 + severity * 0.35 + recurrence * 0.2 + reportRelevance * 0.15;
    ranked.push({
      detected: {
        pattern: pattern.id,
        name: pattern.name,
        category: pattern.category,
        confidence: match.confidence,
        severity,
        direction: directionFor(pattern.id, reversed),
        isPrimary: false,
      },
      rank,
    });
  }

  ranked.sort((left, right) => right.rank - left.rank);
  const selected = ranked.slice(0, 4).map(({ detected }, index) => ({ ...detected, isPrimary: index === 0 }));
  return selected as DetectedPairPattern[] & string[];
}

/** 兼容只消费模式代码的旧逻辑。 */
export function detectPairPatternCodes(
  a: DimensionScores,
  b: DimensionScores,
  options: PairDetectionOptions = {}
): string[] {
  return detectPairPatterns(a, b, options).map((pattern) => pattern.pattern);
}

const legacyPatternIds: Readonly<Record<string, string>> = {
  A_APPROACH_B_WITHDRAW: "APPROACH_WITHDRAW",
  B_APPROACH_A_WITHDRAW: "APPROACH_WITHDRAW",
  A_SOLVE_NOW_B_NEEDS_PAUSE: "SOLVE_NOW_PAUSE",
  B_SOLVE_NOW_A_NEEDS_PAUSE: "SOLVE_NOW_PAUSE",
  A_SENSES_B_SILENT: "DIRECT_INDIRECT",
  B_SENSES_A_SILENT: "DIRECT_INDIRECT",
};

export function getPatternDescriptions(
  patterns: readonly (string | DetectedPairPattern)[]
): string[] {
  return patterns.flatMap((item) => {
    const id = typeof item === "string" ? (legacyPatternIds[item] ?? item) : item.pattern;
    const pattern = getPairPatterns().find(p => p.id === id);
    if (!pattern) return [];
    return [`${pattern.explanation.risk}${pattern.explanation.whenHealthy}`];
  });
}

function hasSignal(signals: PairSignals, key: string, scores: DimensionScores): boolean {
  return signalStrength(signals, key, scores) >= 50;
}

/** 最多返回两项可直接进入双人报告的共同优势。 */
export function detectPairStrengths(
  a: DimensionScores,
  b: DimensionScores,
  options: PairDetectionOptions = {}
): string[] {
  const aSignals = options.aSignals ?? options.signalsA ?? {};
  const bSignals = options.bSignals ?? options.signalsB ?? {};
  const strengths: string[] = [];

  if (a.repair_orientation >= 70 && b.repair_orientation >= 70) {
    strengths.push("你们关系里一个很明显的优势，是双方都没有把冲突自动理解成关系结束。");
  }
  const complementarySensitivity =
    (a.emotional_sensitivity >= 75 && b.emotional_sensitivity <= 40) ||
    (b.emotional_sensitivity >= 75 && a.emotional_sensitivity <= 40);
  if (complementarySensitivity && a.expression >= 70 && b.expression >= 70) {
    strengths.push("一个人能注意细节，一个人能够降低情绪波动；双方愿意表达时，这种差异反而可能互补。");
  }
  if (
    a.space_need >= 70 && b.space_need >= 70 &&
    hasSignal(aSignals, "future_commitment_high", a) && hasSignal(bSignals, "future_commitment_high", b)
  ) {
    strengths.push("你们可能很适合独立但稳定的关系结构。");
  }
  if (!strengths.length && a.expression >= 70 && b.expression >= 70) {
    strengths.push("双方都愿意把感受说出来，这是减少猜测、共同解决问题的重要资源。");
  }
  if (strengths.length < 2 && a.response_need >= 70 && b.response_need >= 70) {
    strengths.push("双方都愿意主动维护联系，关系中的连接动力较强。");
  }
  return strengths.slice(0, 2);
}

/** 新 API 可一次取得总体分、维度均值、核心模式与共同优势。 */
export function calculatePairAssessment(
  a: DimensionScores,
  b: DimensionScores,
  options: PairDetectionOptions = {}
): PairScore {
  const legacy = calculatePairScores(a, b);
  const averagedDimensions = Object.fromEntries(
    dimensions.map((dimension) => [dimension, Math.round((a[dimension] + b[dimension]) / 2)])
  ) as DimensionScores;
  return {
    overall: legacy.overall,
    dimensions: averagedDimensions,
    patterns: detectPairPatterns(a, b, options) as DetectedPairPattern[],
    strengths: detectPairStrengths(a, b, options),
  };
}

export type { PairPattern };
