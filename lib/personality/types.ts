// =====================================================
// 我到底什么性格 — 人格测试核心类型
// 与原「双人默契测试」业务数据完全隔离。
// =====================================================

/** 六大维度 key（与 PRD 第十一节评分算法一一对应） */
export const PERSONALITY_DIMENSIONS = [
  "social",
  "rationality",
  "planning",
  "risk",
  "dominance",
  "sensitivity",
] as const;

export type PersonalityDimension = (typeof PERSONALITY_DIMENSIONS)[number];

/** 维度中文名 + 英文名 + 范围说明（用于报告页面渲染） */
export const PERSONALITY_DIMENSION_META: Record<
  PersonalityDimension,
  { cn: string; en: string; lowLabel: string; highLabel: string }
> = {
  social: {
    cn: "社交能量",
    en: "Social Energy",
    lowLabel: "更喜欢独处和小范围深度交流",
    highLabel: "更容易从人群、交流和社交中获得能量",
  },
  rationality: {
    cn: "理性决策",
    en: "Rationality",
    lowLabel: "更重视感觉、关系和直觉",
    highLabel: "更重视逻辑、证据、效率和结果",
  },
  planning: {
    cn: "计划倾向",
    en: "Planning",
    lowLabel: "灵活、即兴、随机应变",
    highLabel: "喜欢规划、秩序、确定性",
  },
  risk: {
    cn: "风险倾向",
    en: "Risk",
    lowLabel: "稳定、谨慎、安全优先",
    highLabel: "探索、冒险、接受不确定性",
  },
  dominance: {
    cn: "主导性",
    en: "Dominance",
    lowLabel: "更愿意协调、配合和倾听",
    highLabel: "更愿意决定、推动和掌控",
  },
  sensitivity: {
    cn: "情绪感知",
    en: "Sensitivity",
    lowLabel: "情绪相对稳定、钝感",
    highLabel: "对环境、关系、情绪变化更加敏锐",
  },
};

/** 分档标签（用于报告中的"高/中/低"展示） */
export type PersonalityBand = "high" | "midHigh" | "mid" | "midLow" | "low";

/** 中国阴历十五月相对应 15 种核心人格原型 + 14 种过渡原型 = 29 总数
 *  维度维持 6 维（PRD 第十一节固定），不再循环扩展。
 *  月相序：初一(1)→十五(15)，对应新月→满月的盈亏过程
 *  原 8 种（strategist/leader/observer/creator/explorer/doer/coordinator/guardian）
 *  沿用原文案不变；新增 7 种补齐初一~初六 + 十五满月
 *  14 过渡型：每两个相邻主型间生成一个过渡型，6 维向量 = (前+后)/2
 */
export const PERSONALITY_TYPES = [
  // ---- 主 15 型（按月序 1-15 排）----
  "dark_reef",      // 初一 朔月 — 暗礁
  "spark",          // 初二 极细娥眉 — 引子
  "departure",      // 初三 娥眉月 — 启程
  "scout",          // 初四 渐盈娥眉 — 探路
  "drifter",        // 初五 上蛾眉月 — 漫游
  "glimmer",        // 初六 盈眉月 — 微光
  "strategist",     // 初七 上弦月
  "observer",       // 初八 盈凸月
  "guardian",       // 初九 凸月
  "coordinator",    // 初十 渐满凸月
  "creator",        // 十一 接近满月
  "explorer",       // 十二 凸圆月
  "doer",           // 十三 微亏凸月
  "leader",         // 十四 亏凸月
  "whole",          // 十五 满月 — 全貌
  // ---- 14 过渡型（按月序 0.5/1.5/.../14.5 排，命名 <前>__<后>）----
  "dark_reef__spark",        // 0.5 暗礁→引子
  "spark__departure",        // 1.5 引子→启程
  "departure__scout",        // 2.5 启程→探路
  "scout__drifter",          // 3.5 探路→漫游
  "drifter__glimmer",        // 4.5 漫游→微光
  "glimmer__strategist",     // 5.5 微光→战略家
  "strategist__observer",    // 6.5 战略家→观察者
  "observer__guardian",      // 7.5 观察者→守护者
  "guardian__coordinator",   // 8.5 守护者→协调者
  "coordinator__creator",    // 9.5 协调者→创造者
  "creator__explorer",       // 10.5 创造者→探索者
  "explorer__doer",          // 11.5 探索者→行动派
  "doer__leader",            // 12.5 行动派→掌控者
  "leader__whole",           // 13.5 掌控者→全貌
] as const;

export type PersonalityType = (typeof PERSONALITY_TYPES)[number];

export const PERSONALITY_TYPE_META: Record<
  PersonalityType,
  { cn: string; en: string; tagline: string }
> = {
  // ---- 原 8 种（文案不动）----
  strategist: {
    cn: "战略家",
    en: "STRATEGIST",
    tagline: "你不是不需要别人，而是更习惯先依靠自己的判断。",
  },
  explorer: {
    cn: "探索者",
    en: "EXPLORER",
    tagline: "比起稳定，更让你兴奋的是「还没走过的那条路」。",
  },
  leader: {
    cn: "掌控者",
    en: "LEADER",
    tagline: "你习惯把方向握在自己手里，而不是等别人来定义。",
  },
  observer: {
    cn: "观察者",
    en: "OBSERVER",
    tagline: "你看得很多、说得很稳，因为你更相信观察的力量。",
  },
  creator: {
    cn: "创造者",
    en: "CREATOR",
    tagline: "你没办法对「和别人一样」这件事保持长久的热情。",
  },
  coordinator: {
    cn: "协调者",
    en: "COORDINATOR",
    tagline: "你擅长让不同的人在同一个目标下各自舒服。",
  },
  guardian: {
    cn: "守护者",
    en: "GUARDIAN",
    tagline: "你愿意为了一个值得的人或事，把自己放在第二位。",
  },
  doer: {
    cn: "行动派",
    en: "DOER",
    tagline: "比起想清楚再动，你更相信「先动起来再调整」。",
  },
  // ---- 新增 7 种（按月相初一到初六 + 十五）----
  dark_reef: {
    cn: "暗礁",
    en: "DARK REEF",
    tagline: "你低调的存在，是别人在水下看不见的那块支点。",
  },
  spark: {
    cn: "引子",
    en: "SPARK",
    tagline: "再小的一个动作，也可以点燃后来的一整片天。",
  },
  departure: {
    cn: "启程者",
    en: "DEPARTURE",
    tagline: "比起说走就走，你更擅长把第一步走得稳稳当当。",
  },
  scout: {
    cn: "探路者",
    en: "SCOUT",
    tagline: "你很少站在最前面，但你总是知道路在哪里。",
  },
  drifter: {
    cn: "漫游者",
    en: "DRIFTER",
    tagline: "你不在一个世界里，而是站在几片世界的边缘。",
  },
  glimmer: {
    cn: "微光",
    en: "GLIMMER",
    tagline: "你不需要大声，也能照到别人没注意到的角落。",
  },
  whole: {
    cn: "全貌者",
    en: "WHOLE",
    tagline: "你看见的是整件事的来龙去脉，不只是当下这一刻。",
  },
  // ---- 14 过渡型 META（按月序 0.5/1.5/.../14.5 排）----
  // 命名：cn = "<前>与<后>之间"，en = "<前>_<后>"，tagline = 自动合成的中间状态描述
  // 向量由 archetypes.ts 程序合成（(前 + 后) / 2）
  dark_reef__spark: {
    cn: "暗礁·引子",
    en: "REEF_SPARK",
    tagline: "你是一块暗礁，但某天也会被一个微小的动作点燃——这是一个还没发生的过渡。",
  },
  spark__departure: {
    cn: "引子·启程",
    en: "SPARK_DEPARTURE",
    tagline: "你手里已经握着一个引子，第一步也即将迈出——还差一点点勇气。",
  },
  departure__scout: {
    cn: "启程·探路",
    en: "DEPARTURE_SCOUT",
    tagline: "你已经在路上，但也开始用理性的眼光审视地图——这是行与思的中间态。",
  },
  scout__drifter: {
    cn: "探路·漫游",
    en: "SCOUT_DRIFTER",
    tagline: "你既看得清路，又被几条路分别吸引——选择自由但不愿意放弃任何一条。",
  },
  drifter__glimmer: {
    cn: "漫游·微光",
    en: "DRIFT_GLIMMER",
    tagline: "你站在几片世界之间，但你慢慢学会用一束微光照到属于自己的角落。",
  },
  glimmer__strategist: {
    cn: "微光·战略家",
    en: "GLIMMER_STRATEGIST",
    tagline: "你的直觉得到结构的支撑——你开始把那些微光连成一张可以走的地图。",
  },
  strategist__observer: {
    cn: "战略家·观察者",
    en: "STRATEGIST_OBSERVER",
    tagline: "你会先判断，但你也会先看着——这是判断与等待的中间型。",
  },
  observer__guardian: {
    cn: "观察者·守护者",
    en: "OBSERVER_GUARDIAN",
    tagline: "你看见得更多，你也开始为一些值得的人和事，把自己放在第二位。",
  },
  guardian__coordinator: {
    cn: "守护者·协调者",
    en: "GUARDIAN_COORDINATOR",
    tagline: "你为某人守，现在开始把几个值得的人调到同一个频道上。",
  },
  coordinator__creator: {
    cn: "协调者·创造者",
    en: "COORDINATOR_CREATOR",
    tagline: "你擅长让人舒服，但你开始无法对「和别人一样」保持长久的热情。",
  },
  creator__explorer: {
    cn: "创造者·探索者",
    en: "CREATOR_EXPLORER",
    tagline: "你的原创冲动遇上还没走过的那条路——这是制造与发现的中间型。",
  },
  explorer__doer: {
    cn: "探索者·行动派",
    en: "EXPLORER_DOER",
    tagline: "你爱那条没走过的路，你也相信「先动起来再调整」——两条冲动并轨。",
  },
  doer__leader: {
    cn: "行动派·掌控者",
    en: "DOER_LEADER",
    tagline: "你先动起来，也开始把方向握在自己手里——这是执行与掌舵的中间型。",
  },
  leader__whole: {
    cn: "掌控者·全貌",
    en: "LEADER_WHOLE",
    tagline: "你握住方向，也开始看见整件事的来龙去脉——这是驾驭与理解的汇合。",
  },
};

/** 题目选项分值（标准计分；reverse=true 时由 scoring.ts 反转） */
export const ANSWER_VALUES = {
  A: 4, // 非常符合我
  B: 3, // 比较符合我
  C: 2, // 不太符合我
  D: 1, // 完全不像我
} as const;

export type AnswerLetter = keyof typeof ANSWER_VALUES;

/** 数据库记录 — 与 .local-db/personality-tests.json 对应 */
export interface PersonalityTestRecord {
  id: string;
  /** 游客标识，便于 localStorage 恢复草稿 */
  visitor_id: string;
  status: "started" | "completed";
  started_at: string;
  completed_at?: string;

  /** 6 维 0-100 分（完成时填写） */
  social_score?: number;
  rationality_score?: number;
  planning_score?: number;
  risk_score?: number;
  dominance_score?: number;
  sensitivity_score?: number;

  /** Top3 人格原型（欧氏距离排序） */
  primary_type?: PersonalityType;
  secondary_type?: PersonalityType;
  hidden_type?: PersonalityType;

  /** 付费状态 */
  is_paid: boolean;
  paid_at?: string;

  /**
   * 分享奖励（与默契测试 credit 体系隔离，保持独立）
   * - shareCode：当前测试的分享码（test 创建/复用）
   * - sharesCount：有效访客完成测评的人数上限 5
   * - unlockedViaShare：集齐 5 人后自动解锁（is_paid=true 时一并写入）
   * - referredByCode：本测试进入时带的 ref（用于给推荐人 +1）
   */
  share_code?: string;
  shares_count?: number;
  unlocked_via_share?: boolean;
  referred_by_code?: string;

  /** 算法版本号（避免算法升级后历史报告突变） */
  algorithm_version: string;
  report_version: string;

  /** 报告快照缓存（complete 时生成，结果页直接读取，避免重复 build+polish） */
  full_report_cache?: import("./content/report").PersonalityFullReport;
  free_report_cache?: import("./content/report").PersonalityFreeReport;
  /** AI 润色状态：admin 排查 + 后续按版本回滚用 */
  polish_status?: "local-template" | "local-partial" | "ai-polished";
  /** LLM 模型名（已应用时） */
  polish_model?: string;
  /** prompt 版本（人格版独立） */
  polish_prompt_version?: string;
  /** 润色耗时（毫秒），便于监测网关变慢 */
  polish_elapsed_ms?: number;
  /** 润色失败原因（仅失败/部分场景记录） */
  polish_error?: string;

  created_at: string;
  updated_at: string;
}

/** 单题答案记录 */
export interface PersonalityAnswerRecord {
  id: string;
  test_id: string;
  question_id: string;
  /** 原始答案（A/B/C/D） */
  answer_letter: AnswerLetter;
  /** 反向处理后的实际分值（1-4） */
  calculated_score: number;
  /** 客户端提交时间戳（毫秒） */
  answered_at_ms: number;
  created_at: string;
}

/** 报告快照（生成后写库，is_paid=true 时全量下发） */
export interface PersonalityReportRecord {
  test_id: string;
  /** 完整报告内容（仅 is_paid=true 时下发） */
  full_report: import("./content/report").PersonalityFullReport;
  /** 免费版内容（始终下发） */
  free_report: import("./content/report").PersonalityFreeReport;
  report_version: string;
  /** AI 润色状态：admin 排查 + 后续按版本回滚用 */
  polish_status?: "local-template" | "local-partial" | "ai-polished";
  /** LLM 模型名（已应用时） */
  polish_model?: string;
  /** prompt 版本（人格版独立） */
  polish_prompt_version?: string;
  /** 润色耗时（毫秒），便于监测网关变慢 */
  polish_elapsed_ms?: number;
  /** 润色失败原因（仅失败/部分场景记录） */
  polish_error?: string;
  generated_at: string;
}

/** 人格测试订单（与现有 assessments/single 订单表隔离） */
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

/** 人格完整报告价格（默认 ¥9.9，可被环境变量覆盖） */
export const PERSONALITY_REPORT_PRICE = (() => {
  const v = process.env.PERSONALITY_REPORT_PRICE;
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 9.9;
})();

/** 免费解锁人格完整报告所需的有效分享人数（好友通过你的海报完成测评，才算 1 位） */
export const PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK = 5;