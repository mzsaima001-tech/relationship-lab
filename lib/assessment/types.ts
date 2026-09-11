// ============================================================
// 默契研究所 V2.0 — 核心类型定义
// ============================================================

export const DIMENSIONS = [
  "response_need",
  "expression",
  "space_need",
  "emotional_sensitivity",
  "conflict_urgency",
  "repair_orientation",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  response_need: "回应与确定感需求",
  expression: "主动表达与沟通",
  space_need: "自主与空间需求",
  emotional_sensitivity: "情绪感知与关系敏感度",
  conflict_urgency: "冲突处理节奏",
  repair_orientation: "关系修复与韧性",
};

// ============================================================
// 关系类型与阶段
// ============================================================

export type RelationshipType =
  | "ambiguous"
  | "dating"
  | "long_term"
  | "friend";

export type RelationshipStage =
  | "just_met"
  | "getting_closer"
  | "new_relationship"
  | "stable"
  | "long_distance"
  | "tense"
  | "considering_future"
  | "drifting";

export type AgeBand =
  | "under_18"
  | "18_24"
  | "25_34"
  | "35_44"
  | "45_plus";

export type LifeStage =
  | "student"
  | "early_career"
  | "career_intensive"
  | "cohabiting"
  | "newly_married"
  | "parent_infant"
  | "parent_school_age"
  | "caregiver_for_parents"
  | "dual_career"
  | "empty_nest"
  | "career_transition"
  | "long_distance"
  | "living_apart_together";

export type Gender =
  | "male"
  | "female"
  | "other"
  | "prefer_not";

// ============================================================
// 题目阶段与题型
// ============================================================

export type QuestionPhase =
  | "core"
  | "relationship"
  | "life_stage"
  | "followup"
  | "consistency";

export type QuestionKind =
  | "likert"        // S 量表
  | "scenario"     // C 情境题
  | "forced_choice" // B 双极选择
  | "classifier";   // 分类选择（追问题中用于区分）

export type ScoreDirection = "positive" | "reverse";
export type EffectType = "score" | "signal" | "classifier";

// ============================================================
// 题目选项
// ============================================================

export interface QuestionOption {
  id: string;
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
}

// ============================================================
// 追问题触发规则
// ============================================================

export interface FollowupTrigger {
  minScores?: Partial<DimensionScores>;
  maxScores?: Partial<DimensionScores>;
  requiredSignals?: string[];
  anySignals?: string[];
  relationshipTypes?: RelationshipType[];
  relationshipStages?: RelationshipStage[];
}

// ============================================================
// 题目 (V2.0 扩展)
// ============================================================

export interface Question {
  id: string;
  motherQuestionId?: string;      // 母题 ID（场景变体题指向母题）
  phase: QuestionPhase;
  dimension: Dimension;
  kind: QuestionKind;
  text: string;
  options?: QuestionOption[];
  reverse?: boolean;              // 是否反向计分
  scoreDirection?: ScoreDirection;
  weight?: number;
  version?: string;
  active?: boolean;
  signalTags?: string[];          // 答题后生成的信号
  exclusionGroup?: string;        // 互斥组
  priority?: number;
  // 追问题专属
  trigger?: FollowupTrigger;
  resolves?: string[];            // 追问题消除的歧义
  reportImpact?: number;          // 0-100
  effectType?: EffectType;
  // 关系类型/阶段筛选
  relationshipTypes?: RelationshipType[];
  relationshipStages?: RelationshipStage[];
  ageBands?: AgeBand[];
  lifeStages?: LifeStage[];
  // 元数据
  metadata?: {
    notes?: string;
    coreDistinction?: string;
    reportValue?: string;
  };
}

// ============================================================
// 上下文
// ============================================================

export interface AssessmentContext {
  nickname: string;
  ageBand: AgeBand;
  lifeStage?: LifeStage;
  gender: Gender;
  partnerGender?: Gender;
  relationshipType: RelationshipType;
  relationshipStage: RelationshipStage;
  duration:
    | "under_1_month"
    | "1_6_months"
    | "6_12_months"
    | "1_3_years"
    | "3_plus_years";
  currentFeeling:
    | "comfortable"
    | "mostly_good"
    | "unclear"
    | "frequent_friction"
    | "thinking_seriously";
}

// ============================================================
// 答题记录 (含 timing)
// ============================================================

export interface Answer {
  questionId: string;
  value: number;
  shownAt?: number;    // 题目展示时间戳
  answeredAt?: number; // 回答时间戳
  responseTimeMs?: number;
}

// ============================================================
// 分数与维度结果
// ============================================================

export type DimensionScores = Record<Dimension, number>;

export interface DimensionResult {
  score: number;
  confidence: number;           // 0-100
  contextDependency: number;    // 0-100
  evidenceCount: number;
  evidenceContextCount: number;
  evidence: string[];           // 题目 ID 列表
  consistency: "high" | "moderate" | "low";
  interpretation?: string;
}

export type DimensionResults = Record<Dimension, DimensionResult>;

// ============================================================
// 信号系统
// ============================================================

export interface SignalEntry {
  value: boolean | number;
  confidence: number;          // 0-100
  supportingQuestionIds?: string[];
  contradictingQuestionIds?: string[];
}

export type SignalMap = Record<string, SignalEntry>;

// ============================================================
// 一致性校验
// ============================================================

export interface ConsistencyPair {
  id: string;
  questionA: string;
  questionB: string;
  relationship: "same_direction" | "opposite_direction" | "contextual";
  expectedTolerance: number;
  severityWeight: number;
}

export interface ConsistencyResult {
  pairs: Array<{
    pairId: string;
    questionA: string;
    questionB: string;
    valueA: number;
    valueB: number;
    adjustedB: number;
    difference: number;
    relationship: string;
    severity: "none" | "acceptable" | "notable" | "strong_conflict";
  }>;
  semanticConsistency: number;     // 0-100
  contextCoherence: number;         // 0-100
}

// ============================================================
// 回答质量 (RQI)
// ============================================================

export interface ResponseQuality {
  rqi: number;                      // 0-100
  level: "high_confidence" | "good_confidence" | "moderate_confidence" | "low_confidence";
  semanticConsistency: number;      // 0-100
  attentionQuality: number;         // 0-100
  responseVariabilityQuality: number; // 0-100
  timingQuality: number;            // 0-100
  contextCoherence: number;         // 0-100
  straightLiningScore: number;      // longest run of same answer
  rapidAnsweringFlag: boolean;
  extremeResponseRatio: number;     // 0-1
  midpointResponseRatio: number;    // 0-1
  socialDesirabilityScore: number;  // 0-100
  lateTestFatigue: boolean;
}

// ============================================================
// 评估结果 (完整 V2.0)
// ============================================================

export interface AssessmentResult {
  scores: DimensionScores;
  dimensionResults: DimensionResults;
  signals: SignalMap;
  archetype: string;
  tags: string[];
  responseQuality: ResponseQuality;
  consistency: ConsistencyResult;
}

// ============================================================
// 双人模式 (V2.0 扩展)
// ============================================================

export interface PairPatternTrigger {
  // 维度条件
  aMin?: Partial<DimensionScores>;
  aMax?: Partial<DimensionScores>;
  bMin?: Partial<DimensionScores>;
  bMax?: Partial<DimensionScores>;
  // 信号条件
  aRequiredSignals?: string[];
  bRequiredSignals?: string[];
  aAnySignals?: string[];
  bAnySignals?: string[];
  // 差异条件
  minDifference?: Partial<DimensionScores>;
  // 关系类型
  relationshipTypes?: RelationshipType[];
  relationshipStages?: RelationshipStage[];
}

export interface PairPatternExplanation {
  personAExperience: string;
  personBExperience: string;
  cycle: string[];
  strength: string;
  risk: string;
  whenHealthy: string;
  amplificationConditions: string[];
  adviceA: string[];
  adviceB: string[];
  sharedScript: string;
}

export interface PairPattern {
  id: string;
  name: string;
  category: "difference" | "similarity" | "system";
  trigger: PairPatternTrigger;
  priority: number;
  minimumConfidence: number;
  explanation: PairPatternExplanation;
}

export interface DetectedPairPattern {
  pattern: string;
  name: string;
  category: string;
  confidence: number;
  severity: number;
  direction?: Record<string, string>;
  isPrimary: boolean;
}

export interface PairScore {
  overall: number;
  dimensions: DimensionScores;
  patterns: DetectedPairPattern[];
  strengths: string[];
}

// ============================================================
// 报告规则引擎 (RRE)
// ============================================================

export interface RuleCondition {
  source: "dimension" | "signal" | "pair_pattern" | "quality" | "context" | "relationship_state";
  key: string;
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=" | "exists" | "between";
  value?: number | string | [number, number];
}

export interface ReportFactTemplate {
  headline: string;
  evidence: string[];
  meaning: string;
  risk?: string;
  strength?: string;
  recommendationIds?: string[];
  scriptIds?: string[];
}

export interface ReportRule {
  id: string;
  version: string;
  category: "need" | "strength" | "tension" | "stress" | "pair_pattern" | "risk" | "repair" | "recommendation" | "script" | "suppression" | "relationship_state";
  priority: number;
  conditions: RuleCondition[];
  exclusions?: RuleCondition[];
  minConfidence?: number;
  relationshipTypes?: RelationshipType[];
  relationshipStages?: RelationshipStage[];
  semanticGroup?: string;
  output: ReportFactTemplate;
}

export interface ReportFact {
  id: string;
  ruleId: string;
  semanticGroup: string;
  category: string;
  priority: number;
  confidence: number;
  headline: string;
  evidence: string[];
  meaning: string;
  risk?: string;
  strength?: string;
  recommendationIds?: string[];
  scriptIds?: string[];
}

export interface ReportFacts {
  primary_needs: ReportFact[];
  secondary_needs: ReportFact[];
  strengths: ReportFact[];
  internal_tensions: ReportFact[];
  stress_patterns: ReportFact[];
  relationship_patterns: ReportFact[];
  risk_patterns: ReportFact[];
  repair_resources: ReportFact[];
  recommendations: ReportFact[];
  communication_scripts: string[];
  suppressed_findings: ReportFact[];
}

// ============================================================
// 积分与付费系统
// ============================================================

export interface CreditsAccount {
  sessionId: string;
  balance: number;          // 当前积分余额
  totalEarned: number;       // 累计获得
  totalSpent: number;       // 累计消费
  shares: number;            // 分享次数
  reportUnlocked: boolean;   // 单人报告是否已解锁
  pairReportUnlocked: boolean; // 双人报告是否已解锁
  transactions: CreditTransaction[];
}

export interface CreditTransaction {
  type: "earn_share" | "earn_signup" | "earn_bonus" | "spend_report" | "admin_grant";
  amount: number;
  description: string;
  timestamp: string;
}

// 单人报告价格（元；分享所得积分按 1:1 抵扣）
export const SINGLE_REPORT_PRICE = 3.9;
// 双人报告价格 (元)
export const PAIR_REPORT_PRICE = 19.9;
// 分享奖励
export const SHARE_REWARD = 1;
// 免费解锁完整报告所需的有效分享人数（好友通过你的分享海报完成测评，才算 1 位）
export const VALID_SHARES_FOR_FREE_UNLOCK = 5;

// ============================================================
// 常量表
// ============================================================

export const LIKERT_OPTIONS = [
  { id: "1", label: "非常不像我", value: 1 },
  { id: "2", label: "比较不像我", value: 2 },
  { id: "3", label: "说不清", value: 3 },
  { id: "4", label: "比较像我", value: 4 },
  { id: "5", label: "非常像我", value: 5 },
] as const;

export const SCENARIO_OPTIONS = [
  { id: "1", label: "", value: 1 },
  { id: "2", label: "", value: 2 },
  { id: "3", label: "", value: 3 },
  { id: "4", label: "", value: 4 },
  { id: "5", label: "", value: 5 },
] as const;
