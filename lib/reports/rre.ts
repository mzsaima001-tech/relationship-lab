import type {
  AssessmentContext,
  AssessmentResult,
  DetectedPairPattern,
  Dimension,
  DimensionResult,
  DimensionResults,
  DimensionScores,
  ReportFact,
  ReportFacts,
  ReportRule,
  ResponseQuality,
  RuleCondition,
  SignalEntry,
  SignalMap,
} from "@/lib/assessment/types";
import { getReportRules } from "@/lib/content/store";

type Primitive = boolean | number | string;
type SignalLike = Primitive | SignalEntry | { value: Primitive; confidence?: number; supportingQuestionIds?: string[] };
type StateValue = Primitive | { value: Primitive; confidence?: number; supportingQuestionIds?: string[] };

export interface ReportRuleEngineInput {
  result?: Pick<AssessmentResult, "scores" | "dimensionResults" | "signals" | "responseQuality">;
  scores?: Partial<DimensionScores>;
  dimensions?: Partial<Record<Dimension, number | DimensionResult>>;
  dimensionResults?: Partial<DimensionResults>;
  signals?: SignalMap | Record<string, SignalLike>;
  pairPatterns?: readonly (string | DetectedPairPattern)[] | Record<string, number | boolean>;
  quality?: Partial<ResponseQuality> & { confidence?: number };
  responseQuality?: Partial<ResponseQuality> & { confidence?: number };
  context?: Partial<AssessmentContext> & Record<string, unknown>;
  relationshipState?: Record<string, StateValue>;
  relationship_state?: Record<string, StateValue>;
  confidence?: number;
}

export interface EvaluatedReportRule extends ReportFact {
  /** 命中的原始规则，供审计与 A/B 测试记录使用。 */
  rule: ReportRule;
  contextDependency: number;
}

interface ResolvedValue {
  value: unknown;
  confidence?: number;
  evidence: string[];
  contextDependency?: number;
}

const DIMENSION_KEYS: readonly Dimension[] = [
  "response_need",
  "expression",
  "space_need",
  "emotional_sensitivity",
  "conflict_urgency",
  "repair_orientation",
];

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

function isValueObject(value: unknown): value is {
  value: Primitive;
  confidence?: number;
  supportingQuestionIds?: string[];
} {
  return typeof value === "object" && value !== null && "value" in value;
}

function getDimensionResult(input: ReportRuleEngineInput, key: string): DimensionResult | undefined {
  if (!DIMENSION_KEYS.includes(key as Dimension)) return undefined;
  const dimension = key as Dimension;
  const direct = input.dimensionResults?.[dimension] ?? input.result?.dimensionResults[dimension];
  if (direct) return direct;
  const mixed = input.dimensions?.[dimension];
  return typeof mixed === "object" && mixed !== null ? mixed : undefined;
}

function getDimensionScore(input: ReportRuleEngineInput, key: string): number | undefined {
  if (!DIMENSION_KEYS.includes(key as Dimension)) return undefined;
  const dimension = key as Dimension;
  const mixed = input.dimensions?.[dimension];
  if (typeof mixed === "number") return mixed;
  if (typeof mixed === "object" && mixed !== null) return mixed.score;
  return input.scores?.[dimension] ?? input.result?.scores[dimension];
}

function getSignals(input: ReportRuleEngineInput): Record<string, SignalLike> {
  return (input.signals ?? input.result?.signals ?? {}) as Record<string, SignalLike>;
}

function getQuality(input: ReportRuleEngineInput): (Partial<ResponseQuality> & { confidence?: number }) | undefined {
  return input.quality ?? input.responseQuality ?? input.result?.responseQuality;
}

function globalConfidence(input: ReportRuleEngineInput): number {
  if (typeof input.confidence === "number") return clamp(input.confidence);
  const quality = getQuality(input);
  if (typeof quality?.confidence === "number") return clamp(quality.confidence);

  const confidences = DIMENSION_KEYS
    .map((key) => getDimensionResult(input, key)?.confidence)
    .filter((value): value is number => typeof value === "number");
  if (confidences.length > 0) {
    return clamp(confidences.reduce((sum, value) => sum + value, 0) / confidences.length);
  }
  if (typeof quality?.rqi === "number") return clamp(quality.rqi);
  return 100;
}

function resolvePairPattern(input: ReportRuleEngineInput, key: string): ResolvedValue {
  const patterns = input.pairPatterns;
  if (!patterns) return { value: undefined, evidence: [] };
  if (!Array.isArray(patterns)) {
    const record = patterns as Record<string, number | boolean>;
    return { value: record[key], confidence: typeof record[key] === "number" ? record[key] as number : undefined, evidence: record[key] === undefined ? [] : [key] };
  }

  const normalizedKey = key.toUpperCase();
  const match = patterns.find((item) => {
    const id = typeof item === "string" ? item : item.pattern;
    const normalized = id.toUpperCase();
    return normalized === normalizedKey || normalized.includes(normalizedKey);
  });
  if (!match) return { value: undefined, evidence: [] };
  return {
    value: true,
    confidence: typeof match === "string" ? undefined : match.confidence,
    evidence: [typeof match === "string" ? match : match.pattern],
  };
}

function resolveConditionValue(condition: RuleCondition, input: ReportRuleEngineInput): ResolvedValue {
  const { source, key } = condition;
  if (source === "dimension") {
    const result = getDimensionResult(input, key);
    const score = getDimensionScore(input, key);
    return {
      value: score,
      confidence: result?.confidence ?? globalConfidence(input),
      evidence: result?.evidence ?? (score === undefined ? [] : [key]),
      contextDependency: result?.contextDependency,
    };
  }

  if (source === "signal") {
    const entry = getSignals(input)[key];
    if (isValueObject(entry)) {
      return {
        value: entry.value,
        confidence: entry.confidence ?? globalConfidence(input),
        evidence: entry.supportingQuestionIds ?? [key],
      };
    }
    return { value: entry, confidence: entry === undefined ? undefined : globalConfidence(input), evidence: entry === undefined ? [] : [key] };
  }

  if (source === "pair_pattern") return resolvePairPattern(input, key);

  if (source === "quality") {
    if (key === "confidence") return { value: globalConfidence(input), confidence: globalConfidence(input), evidence: ["confidence"] };
    const value = getQuality(input)?.[key as keyof ResponseQuality];
    return { value, confidence: typeof getQuality(input)?.rqi === "number" ? getQuality(input)?.rqi : globalConfidence(input), evidence: value === undefined ? [] : [key] };
  }

  if (source === "context") {
    const value = input.context?.[key];
    return { value, confidence: globalConfidence(input), evidence: value === undefined ? [] : [key] };
  }

  const state = input.relationshipState ?? input.relationship_state ?? {};
  const stateEntry = state[key] ?? getSignals(input)[key];
  if (isValueObject(stateEntry)) {
    return {
      value: stateEntry.value,
      confidence: stateEntry.confidence ?? globalConfidence(input),
      evidence: stateEntry.supportingQuestionIds ?? [key],
    };
  }
  return { value: stateEntry, confidence: stateEntry === undefined ? undefined : globalConfidence(input), evidence: stateEntry === undefined ? [] : [key] };
}

function comparable(value: unknown): unknown {
  if (value === true) return 1;
  if (value === false) return 0;
  return value;
}

/** 评估单一条件。between 为闭区间；exists 只检查值是否存在，不把 false 当作缺失。 */
export function evaluateCondition(condition: RuleCondition, input: ReportRuleEngineInput): boolean {
  const actual = comparable(resolveConditionValue(condition, input).value);
  const expected = comparable(condition.value);

  switch (condition.operator) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "==":
      return actual === expected;
    case "!=":
      return actual !== undefined && actual !== null && actual !== expected;
    case ">":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case ">=":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "<":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "<=":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "between": {
      if (typeof actual !== "number" || !Array.isArray(condition.value)) return false;
      const [minimum, maximum] = condition.value;
      return actual >= minimum && actual <= maximum;
    }
  }
}

function ruleAppliesToContext(rule: ReportRule, input: ReportRuleEngineInput): boolean {
  const relationshipType = input.context?.relationshipType;
  const relationshipStage = input.context?.relationshipStage;
  if (rule.relationshipTypes && (!relationshipType || !rule.relationshipTypes.includes(relationshipType as AssessmentContext["relationshipType"]))) return false;
  if (rule.relationshipStages && (!relationshipStage || !rule.relationshipStages.includes(relationshipStage as AssessmentContext["relationshipStage"]))) return false;
  return true;
}

function getRuleMetrics(rule: ReportRule, input: ReportRuleEngineInput): {
  confidence: number;
  evidence: string[];
  contextDependency: number;
} {
  const resolved = rule.conditions.map((item) => resolveConditionValue(item, input));
  const evidenceConfidence = resolved
    .map((item) => item.confidence)
    .filter((value): value is number => typeof value === "number");
  const rqi = getQuality(input)?.rqi;
  const confidenceValues = [
    ...(evidenceConfidence.length > 0 ? evidenceConfidence : [globalConfidence(input)]),
    ...(typeof rqi === "number" ? [rqi] : []),
  ];
  const contextDependencies = resolved
    .map((item) => item.contextDependency)
    .filter((value): value is number => typeof value === "number");
  return {
    confidence: clamp(Math.min(...confidenceValues)),
    evidence: [...new Set([...rule.output.evidence, ...resolved.flatMap((item) => item.evidence)])],
    contextDependency: contextDependencies.length > 0 ? clamp(Math.max(...contextDependencies)) : 0,
  };
}

/** 返回程序化的结论强度前缀。低于 55 时只能作为辅助观察。 */
export function getConfidenceLanguage(confidence: number): string {
  if (confidence >= 85) return "你的回答很明显地显示";
  if (confidence >= 70) return "你的回答比较明显地呈现出";
  if (confidence >= 55) return "你的部分回答显示";
  return "这一点目前只能作为辅助观察";
}

function contextualizeHeadline(headline: string, contextDependency: number): string {
  if (contextDependency < 70) return headline;
  return `这个倾向会随情境变化：${headline}`;
}

function qualifyMeaning(meaning: string, confidence: number, contextDependency: number, safety: boolean): string {
  if (safety) return meaning;
  const contextText = contextDependency >= 70
    ? "你的相关需求很依赖具体情境；关系明确时可能更放松，变化突然且缺少解释时则可能明显升高。"
    : "";
  return `${getConfidenceLanguage(confidence)}：${contextText}${meaning}`;
}

function toFact(rule: ReportRule, input: ReportRuleEngineInput, metrics = getRuleMetrics(rule, input)): ReportFact {
  const safety = rule.semanticGroup === "safety_priority_mode";
  return {
    id: rule.semanticGroup ?? rule.id,
    ruleId: rule.id,
    semanticGroup: rule.semanticGroup ?? rule.id,
    category: rule.category,
    priority: rule.priority,
    confidence: metrics.confidence,
    headline: contextualizeHeadline(rule.output.headline, metrics.contextDependency),
    evidence: metrics.evidence,
    meaning: qualifyMeaning(rule.output.meaning, metrics.confidence, metrics.contextDependency, safety),
    ...(rule.output.risk ? { risk: rule.output.risk } : {}),
    ...(rule.output.strength ? { strength: rule.output.strength } : {}),
    ...(rule.output.recommendationIds ? { recommendationIds: rule.output.recommendationIds } : {}),
    ...(rule.output.scriptIds ? { scriptIds: rule.output.scriptIds } : {}),
  };
}

/**
 * 对规则集做纯函数求值。返回值按优先级、置信度、规则 ID 稳定排序，便于审计与测试。
 * suppression 规则也会返回，由 buildReportFacts 负责执行其抑制策略。
 */
export function evaluateReportRules(
  input: ReportRuleEngineInput,
  rules: readonly ReportRule[] = getReportRules(),
): EvaluatedReportRule[] {
  return rules
    .filter((rule) => ruleAppliesToContext(rule, input))
    .filter((rule) => rule.conditions.every((item) => evaluateCondition(item, input)))
    .filter((rule) => !rule.exclusions?.some((item) => evaluateCondition(item, input)))
    .map((rule) => ({ rule, metrics: getRuleMetrics(rule, input) }))
    .filter(({ rule, metrics }) => rule.minConfidence === undefined || metrics.confidence >= rule.minConfidence)
    .map(({ rule, metrics }) => ({
      ...toFact(rule, input, metrics),
      rule,
      contextDependency: metrics.contextDependency,
    }))
    .sort((left, right) =>
      right.priority - left.priority ||
      right.confidence - left.confidence ||
      left.rule.id.localeCompare(right.rule.id),
    );
}

function emptyReportFacts(): ReportFacts {
  return {
    primary_needs: [],
    secondary_needs: [],
    strengths: [],
    internal_tensions: [],
    stress_patterns: [],
    relationship_patterns: [],
    risk_patterns: [],
    repair_resources: [],
    recommendations: [],
    communication_scripts: [],
    suppressed_findings: [],
  };
}

function deduplicateBySemanticGroup(items: readonly EvaluatedReportRule[]): EvaluatedReportRule[] {
  const retained = new Map<string, EvaluatedReportRule>();
  for (const item of items) {
    if (!retained.has(item.semanticGroup)) retained.set(item.semanticGroup, item);
  }
  return [...retained.values()];
}

function isDetailedPersonalityFact(fact: ReportFact): boolean {
  return ["need", "tension", "stress", "strength", "repair"].includes(fact.category);
}

function factSort(left: ReportFact, right: ReportFact): number {
  return right.priority - left.priority || right.confidence - left.confidence || left.ruleId.localeCompare(right.ruleId);
}

/** 构造叙事层唯一允许读取的固定 ReportFacts 结构。 */
export function buildReportFacts(
  input: ReportRuleEngineInput,
  rules: readonly ReportRule[] = getReportRules(),
): ReportFacts {
  const output = emptyReportFacts();
  const evaluated = evaluateReportRules(input, rules);
  const suppressionIds = new Set(
    evaluated.filter((item) => item.rule.category === "suppression").map((item) => item.rule.id),
  );
  const safetyMode = evaluated.some((item) => item.semanticGroup === "safety_priority_mode");
  const rqi = getQuality(input)?.rqi ?? 100;
  const candidates = deduplicateBySemanticGroup(
    evaluated.filter((item) => item.rule.category !== "suppression"),
  );

  const retained: EvaluatedReportRule[] = [];
  for (const item of candidates) {
    let suppressed = item.priority < 50 || item.confidence < 55;

    if (suppressionIds.has("SUPPRESS-01") && item.semanticGroup === "high_space_need") suppressed = true;
    if (rqi < 55 && isDetailedPersonalityFact(item)) suppressed = true;
    if (safetyMode && item.semanticGroup !== "safety_priority_mode") suppressed = true;

    if (suppressed) output.suppressed_findings.push(item);
    else retained.push(item);
  }

  for (const fact of retained) {
    switch (fact.category) {
      case "need":
        (fact.priority >= 80 ? output.primary_needs : output.secondary_needs).push(fact);
        break;
      case "strength":
        output.strengths.push(fact);
        break;
      case "tension":
        output.internal_tensions.push(fact);
        break;
      case "stress":
        output.stress_patterns.push(fact);
        break;
      case "pair_pattern":
      case "relationship_state":
        output.relationship_patterns.push(fact);
        break;
      case "risk":
        output.risk_patterns.push(fact);
        break;
      case "repair":
        output.repair_resources.push(fact);
        break;
      case "recommendation":
        output.recommendations.push(fact);
        break;
      case "script":
        output.communication_scripts.push(fact.headline);
        break;
    }
  }

  output.primary_needs.sort(factSort);
  output.secondary_needs.sort(factSort);
  output.strengths.sort(factSort);
  output.internal_tensions.sort(factSort);
  output.stress_patterns.sort(factSort);
  output.relationship_patterns.sort(factSort);
  output.risk_patterns.sort(factSort);
  output.repair_resources.sort(factSort);
  output.recommendations.sort(factSort);
  output.suppressed_findings.sort(factSort);
  output.communication_scripts = [...new Set(output.communication_scripts)];

  return output;
}
