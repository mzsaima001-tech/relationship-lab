// =====================================================
// 人格测试 — 核心类型（V3 数据 + V1 命名共存）
//
// 2026-09-13 内容升级：
//   6 维（语义替换）：社交能量 / 理性决策 / 计划倾向 / 风险倾向 / 主导性 / 情绪感知
//      → 表达力(G) / 应对力(X) / 认可需求(I) / 方向感(F) / 自主性(S) / 情绪觉知(E)
//   题库：36 题李克特 4 选项 + reverse → 5 卷各 36 题情境题（180 题）= 110 唯一母题 + 70 锚题
//   原型：22 archetype（8 主 + 7 月相新主 + 14 过渡）→ 30 张月相卡（P01-P15 + T01-T15）
//   算法：欧氏距离 → 余弦相似度（norm 0-100 同空间）
//
// V1 兼容：旧字段名（social_score / primary_type 等）与 V3 字段名（g_score / top1_card_id 等）
//   共享同一条底层记录；`record.g_score === record.social_score` 等价。
// =====================================================

// ============================================================
// V3 核心维度
// ============================================================

export const PERSONALITY_DIMENSIONS = ["G", "X", "I", "F", "S", "E"] as const;
export type PersonalityDimension = (typeof PERSONALITY_DIMENSIONS)[number];

/** 维度中文名 + 英文名 + 两端描述 */
export const PERSONALITY_DIMENSION_META: Record<
  PersonalityDimension,
  { cn: string; en: string; lowLabel: string; highLabel: string }
> = {
  G: {
    cn: "表达力",
    en: "Expression",
    lowLabel: "想法多半先放在心里，想清楚了再说",
    highLabel: "有想法能当场讲出来，也能说得清楚",
  },
  X: {
    cn: "应对力",
    en: "Adaptability",
    lowLabel: "遇到阻力多半先绕开，等它自己过去",
    highLabel: "遇到阻力会迎上去，把事当面处理掉",
  },
  I: {
    cn: "认可需求",
    en: "Validation Need",
    lowLabel: "心里自己有底，不太需要外界的肯定",
    highLabel: "需要被看见、被肯定，心里才踏实",
  },
  F: {
    cn: "方向感",
    en: "Direction",
    lowLabel: "还没想好要去哪，走一步看一步",
    highLabel: "知道自己要去哪，脚下有路",
  },
  S: {
    cn: "自主性",
    en: "Autonomy",
    lowLabel: "身边有人陪着，日子才过得安稳",
    highLabel: "一个人也能把日子过好",
  },
  E: {
    cn: "情绪觉知",
    en: "Emotional Awareness",
    lowLabel: "难受了，也常常说不清是哪种难受",
    highLabel: "认得清自己的情绪，知道它从哪来",
  },
};

/** band 分档（高/中/低） */
export type PersonalityBand = "high" | "midHigh" | "mid" | "midLow" | "low";

export const PERSONALITY_BAND_LABELS_CN: Record<PersonalityBand, string> = {
  high: "显著",
  midHigh: "中高",
  mid: "中间",
  midLow: "中低",
  low: "收敛",
};

// ============================================================
// V1 兼容层：旧 6 维（社交能量/理性决策/计划倾向/风险倾向/主导性/情绪感知）
// 这些 key 仅作 schema 兼容映射，UI 已统一用 PERSONALITY_DIMENSION_META 渲染。
// ============================================================

/** V1 旧维度 key → V3 维度 key 的映射 */
export const PERSONALITY_V1_TO_V3_DIM: Record<string, PersonalityDimension> = {
  social: "G",
  rationality: "X",
  planning: "F",
  risk: "I",
  dominance: "S",
  sensitivity: "E",
};

/** V3 → V1 反向映射 */
export const PERSONALITY_V3_TO_V1_DIM: Record<PersonalityDimension, string> = {
  G: "social",
  X: "rationality",
  F: "planning",
  I: "risk",
  S: "dominance",
  E: "sensitivity",
};

// ============================================================
// 答题选项
// ============================================================

/** 5 选项（A-E）— 新系统一律 5 选项 */
export const ANSWER_LETTERS = ["A", "B", "C", "D", "E"] as const;
export type AnswerLetter = (typeof ANSWER_LETTERS)[number];

/** @deprecated 旧 4 选项常量，V1 路由 answers/route.ts 仍用 */
export const ANSWER_VALUES: Record<AnswerLetter, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

export function isValidAnswer(x: unknown): x is AnswerLetter {
  return typeof x === "string" && (ANSWER_LETTERS as readonly string[]).includes(x);
}

// ============================================================
// 算法 / 报告 版本号（任何维度/题库/算法升级都要 bump）
// ============================================================

export const PERSONALITY_ALGORITHM_VERSION = "moonphase-2026-09-13";
export const PERSONALITY_REPORT_VERSION = "moonphase";

// ============================================================
// 题库（5 套卷 × 36 题 = 180 题）
// 数据由 ./questionsData 注入；类型定义在此。
// ============================================================

export type PersonalityPaperId = "P1" | "P2" | "P3" | "P4" | "P5";

export interface PersonalityQuestion {
  id: string;
  paper: PersonalityPaperId;
  dimension: PersonalityDimension;
  text: string;
  /** 5 个选项文本（位置即 A/B/C/D/E） */
  options: readonly [string, string, string, string, string];
  /** 5 个选项对应分值（1-5，按 dimension 直加） */
  scores: readonly [number, number, number, number, number];
  /** 母题编号（同一 id 跨卷即同一母题，锚题对照用） */
  mother_question_id: string;
  weight: number;
}

// ============================================================
// 30 张月相卡（P01-P15 主 + T01-T15 过渡）
// ============================================================

export interface PersonalityCard {
  id: string;
  type: "主" | "过渡";
  /** 月相序号 1-30（主 1-15，过渡 0.5/1.5/.../14.5） */
  no: number;
  /** 卡名（4 字） */
  name: string;
  /** 密钥（2 字） */
  key: string;
  /** 判词（一行） */
  line: string;
  /** 月相：朔 / 蛾眉 / 上弦 / 盈凸 / 望 / 亏凸 / 下弦 */
  phase: string;
  phase_en: string;
  /** 6 维中心向量 [G, X, I, F, S, E]，0-100 */
  vec: readonly [number, number, number, number, number, number];
  /** 极性描述（人话） */
  poles: string;
  /** 过渡卡才有：介于哪两张主卡 */
  between: string;
  /** 静态卡 PNG 路径（运行时渲染） */
  png_path: string;
}

// ============================================================
// 匹配结果
// ============================================================

export interface PersonalityMatchResult {
  top1: { card: PersonalityCard; similarity: number };
  top2: { card: PersonalityCard; similarity: number };
  top3: { card: PersonalityCard; similarity: number };
  /** 是否混合型（六个方向都较均衡，无明显主导卡） */
  is_mixed: boolean;
  mixed_note?: string;
}

// ============================================================
// 用户得分（raw + norm 0-100 + z 标准分）
// ============================================================

export interface PersonalityUserScore {
  /** 每卷每维 6 题，得分范围 6-30（直加） */
  raw: Record<PersonalityDimension, number>;
  /** 0-100 归一化（(raw-6)/(30-6)*100） */
  norm: Record<PersonalityDimension, number>;
  /** z-score（用于混合型判定） */
  z: Record<PersonalityDimension, number>;
}

// ============================================================
// DB 记录 — V3 + V1 双字段名（共享同底层值）
// ============================================================

export interface PersonalityTestRecord {
  id: string;
  /** 游客标识 */
  visitor_id: string;
  /** 抽到的卷号（P1-P5，同一用户复测用同一卷） */
  paper_id: PersonalityPaperId;
  status: "started" | "completed";
  started_at: string;
  completed_at?: string;

  // ───── V3 6 维分 ─────
  g_score?: number;
  x_score?: number;
  i_score?: number;
  f_score?: number;
  s_score?: number;
  e_score?: number;

  // ───── V1 兼容字段（同 g/x/i/f/s/e_score）─────
  /** @deprecated alias of g_score */
  social_score?: number;
  /** @deprecated alias of x_score */
  rationality_score?: number;
  /** @deprecated alias of i_score */
  risk_score?: number;
  /** @deprecated alias of f_score */
  planning_score?: number;
  /** @deprecated alias of s_score */
  dominance_score?: number;
  /** @deprecated alias of e_score */
  sensitivity_score?: number;

  // ───── V3 Top3 卡 ─────
  top1_card_id?: string;
  top2_card_id?: string;
  top3_card_id?: string;
  top1_sim?: number;
  top2_sim?: number;
  top3_sim?: number;

  // ───── V1 兼容字段（同 top1/2/3_card_id）─────
  /** @deprecated alias of top1_card_id */
  primary_type?: string;
  /** @deprecated alias of top2_card_id */
  secondary_type?: string;
  /** @deprecated alias of top3_card_id */
  hidden_type?: string;

  /** V3 混合型 */
  is_mixed?: boolean;
  mixed_note?: string;

  /** 付费状态 */
  is_paid: boolean;
  paid_at?: string;

  /** 分享奖励 */
  share_code?: string;
  shares_count?: number;
  unlocked_via_share?: boolean;
  referred_by_code?: string;

  /** 算法 / 报告 版本号 */
  algorithm_version: string;
  report_version: string;

  /** 报告快照缓存 */
  full_report_cache?: PersonalityFullReport;
  free_report_cache?: PersonalityFreeReport;
  polish_status?: "local-template" | "local-partial" | "ai-polished";
  polish_model?: string;
  polish_prompt_version?: string;
  polish_elapsed_ms?: number;
  polish_error?: string;

  created_at: string;
  updated_at: string;
}

/** 单题答案记录 */
export interface PersonalityAnswerRecord {
  id: string;
  test_id: string;
  question_id: string;
  paper_id: PersonalityPaperId;
  /** V3 字段 */
  option_index: 0 | 1 | 2 | 3 | 4;
  /** V3 字段：所选选项的 score */
  score: number;
  /** @deprecated V1 字段（保存 letter，A-E）；新系统已不依赖 */
  answer_letter?: AnswerLetter;
  answered_at_ms: number;
  created_at: string;
}

// ============================================================
// 报告类型（免费版 + 完整版）
// V3 新结构 + V1 兼容字段并存
// ============================================================

/** V3 免费版报告 */
export interface PersonalityFreeReport {
  /** V3：主卡 */
  main_card: PersonalityCard;
  /** V3：Top3 */
  top3: { card_id: string; similarity: number; card: PersonalityCard }[];
  /** V3：6 维解读 */
  dimension_summary: Record<
    PersonalityDimension,
    { score: number; band: PersonalityBand; note: string }
  >;
  /** V3：综合叙事 */
  narrative: string;
  report_version: string;
  generated_at: string;

  // ───── V1 兼容字段（同步填充，便于老代码消费）─────
  /** @deprecated alias of main_card.name */
  primaryTagline?: string;
  /** @deprecated V1 dim shape */
  scores?: Record<string, number>;
  /** @deprecated V1 top dim list */
  topDimensions?: Array<{ key: string; score: number; summary: string }>;
  /** @deprecated V1 core strength */
  coreStrength?: { title: string; description: string };
}

/** V3 完整版报告 */
export interface PersonalityFullReport {
  main_card: PersonalityCard;
  secondary?: PersonalityCard;
  hidden?: PersonalityCard;
  top3: { card_id: string; similarity: number; card: PersonalityCard }[];
  dimension_summary: Record<
    PersonalityDimension,
    { score: number; band: PersonalityBand; note: string }
  >;
  narrative: string;
  report_version: string;
  polish_status?: string;
  polish_model?: string;
  polish_prompt_version?: string;
  polish_elapsed_ms?: number;
  polish_error?: string;
  generated_at: string;
}

/** 人格测试订单 */
export interface PersonalityOrderRecord {
  id: string;
  order_no: string;
  test_id: string;
  amount: number;
  payment_id: string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  created_at: string;
  paid_at?: string;
}

// ============================================================
// 价格 / 分享阈值配置
// ============================================================

export const PERSONALITY_REPORT_PRICE = (() => {
  const v = process.env.PERSONALITY_REPORT_PRICE;
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 9.9;
})();

export const PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK = 5;

// ============================================================
// V1 兼容层：22 archetype 字典（admin / 老 API 仍 import）
// 这些 key 既是历史 archetype 名，也是 V3 card.id
// ============================================================

/** V1 archetype 名 = V3 card.id (P01-P15 / T01-T15) */
export type PersonalityType = PersonalityCard["id"];

/** 仅作为 V1 admin overview 类型推导用（顶层 require 顶层 schema 列存在性） */
export const PERSONALITY_TYPE_META: Record<string, { cn: string; en: string; tagline: string }> = {};
