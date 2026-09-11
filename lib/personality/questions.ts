// =====================================================
// 我到底什么性格 — 36 题题库
// 来源：PRD 第九节，逐字照抄
// 配置化存储：未来可在后台调整题目/维度/正反向，无需改代码。
// =====================================================

import type { PersonalityDimension } from "./types";

export interface PersonalityQuestion {
  /** 题号（Q01-Q36） */
  id: string;
  /** 顺序 1-36 */
  order: number;
  question: string;
  dimension: PersonalityDimension;
  /** true = 反向题（4-3-2-1 倒置计分） */
  reverse: boolean;
  active: boolean;
}

/**
 * 36 题初始种子，仅作为 .local-db/content/personality-questions.json
 * 首次写盘内容。运行时应通过 lib/content/store.ts 的
 * getActivePersonalityQuestions / getPersonalityQuestionById 读取，
 * 后台改动后无需重启即可生效。
 */
export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  // ---- 社交能量 SOCIAL ----
  {
    id: "Q01",
    order: 1,
    question: "参加一个大部分人都不认识的聚会时，我通常能够比较自然地和陌生人开始交流。",
    dimension: "social",
    reverse: false,
    active: true,
  },
  {
    id: "Q02",
    order: 2,
    question: "连续参加几天社交活动后，我通常还愿意继续和别人见面。",
    dimension: "social",
    reverse: false,
    active: true,
  },
  {
    id: "Q03",
    order: 3,
    question: "当一个群聊非常活跃时，我通常愿意主动参与讨论。",
    dimension: "social",
    reverse: false,
    active: true,
  },
  {
    id: "Q04",
    order: 4,
    question: "相比参加多人活动，我经常更期待一个人安静地待着。",
    dimension: "social",
    reverse: true,
    active: true,
  },
  {
    id: "Q05",
    order: 5,
    question: "认识新朋友通常不会让我感到特别累。",
    dimension: "social",
    reverse: false,
    active: true,
  },
  {
    id: "Q06",
    order: 6,
    question: "在人很多的环境里待久了，我通常很想尽快离开。",
    dimension: "social",
    reverse: true,
    active: true,
  },

  // ---- 理性决策 RATIONALITY ----
  {
    id: "Q07",
    order: 7,
    question: "遇到重大决定时，我通常会先分析利弊，而不是先考虑自己的感觉。",
    dimension: "rationality",
    reverse: false,
    active: true,
  },
  {
    id: "Q08",
    order: 8,
    question: "即使我很喜欢某个选择，只要数据证明它不合理，我通常也会放弃。",
    dimension: "rationality",
    reverse: false,
    active: true,
  },
  {
    id: "Q09",
    order: 9,
    question: "与别人意见冲突时，我更关注谁的理由合理，而不是谁和我的关系更好。",
    dimension: "rationality",
    reverse: false,
    active: true,
  },
  {
    id: "Q10",
    order: 10,
    question: "做决定的时候，我经常因为不想伤害别人而改变原本的判断。",
    dimension: "rationality",
    reverse: true,
    active: true,
  },
  {
    id: "Q11",
    order: 11,
    question: "面对复杂问题，我通常喜欢先搜集信息再下结论。",
    dimension: "rationality",
    reverse: false,
    active: true,
  },
  {
    id: "Q12",
    order: 12,
    question: "有时候即使没有充分理由，我也会因为「感觉对了」就做决定。",
    dimension: "rationality",
    reverse: true,
    active: true,
  },

  // ---- 计划倾向 PLANNING ----
  {
    id: "Q13",
    order: 13,
    question: "做重要事情以前，我习惯提前安排大致步骤。",
    dimension: "planning",
    reverse: false,
    active: true,
  },
  {
    id: "Q14",
    order: 14,
    question: "旅行之前，我通常希望提前知道行程、住宿和重要安排。",
    dimension: "planning",
    reverse: false,
    active: true,
  },
  {
    id: "Q15",
    order: 15,
    question: "如果计划突然发生很大变化，我通常会觉得有些不舒服。",
    dimension: "planning",
    reverse: false,
    active: true,
  },
  {
    id: "Q16",
    order: 16,
    question: "我经常一边做事情，一边再决定下一步怎么办。",
    dimension: "planning",
    reverse: true,
    active: true,
  },
  {
    id: "Q17",
    order: 17,
    question: "有明确期限的事情，我通常不会拖到最后一刻才处理。",
    dimension: "planning",
    reverse: false,
    active: true,
  },
  {
    id: "Q18",
    order: 18,
    question: "只要最后能完成，我并不太在意过程是否有计划。",
    dimension: "planning",
    reverse: true,
    active: true,
  },

  // ---- 风险倾向 RISK ----
  {
    id: "Q19",
    order: 19,
    question: "只要潜在回报足够高，我愿意接受一定程度的不确定性。",
    dimension: "risk",
    reverse: false,
    active: true,
  },
  {
    id: "Q20",
    order: 20,
    question: "面对一个没有人尝试过的新机会，我通常愿意先研究，而不是直接拒绝。",
    dimension: "risk",
    reverse: false,
    active: true,
  },
  {
    id: "Q21",
    order: 21,
    question: "相比稳定但普通的选择，我有时会更想尝试可能性更大的机会。",
    dimension: "risk",
    reverse: false,
    active: true,
  },
  {
    id: "Q22",
    order: 22,
    question: "即使一个机会看起来不错，只要风险比较大，我通常宁愿不参与。",
    dimension: "risk",
    reverse: true,
    active: true,
  },
  {
    id: "Q23",
    order: 23,
    question: "发现原来的道路发展有限时，我愿意重新开始。",
    dimension: "risk",
    reverse: false,
    active: true,
  },
  {
    id: "Q24",
    order: 24,
    question: "我比较喜欢生活保持可预测，不希望发生太多突然变化。",
    dimension: "risk",
    reverse: true,
    active: true,
  },

  // ---- 主导性 DOMINANCE ----
  {
    id: "Q25",
    order: 25,
    question: "团队讨论很久却没有结论时，我经常想主动推动大家做决定。",
    dimension: "dominance",
    reverse: false,
    active: true,
  },
  {
    id: "Q26",
    order: 26,
    question: "如果我认为自己的方案明显更好，我通常会努力说服别人采用。",
    dimension: "dominance",
    reverse: false,
    active: true,
  },
  {
    id: "Q27",
    order: 27,
    question: "遇到重要事情时，我更愿意自己掌握关键决定权。",
    dimension: "dominance",
    reverse: false,
    active: true,
  },
  {
    id: "Q28",
    order: 28,
    question: "在团队里，只要别人愿意负责，我通常不介意让别人做最终决定。",
    dimension: "dominance",
    reverse: true,
    active: true,
  },
  {
    id: "Q29",
    order: 29,
    question: "面对混乱的局面，我经常会自然地开始安排事情。",
    dimension: "dominance",
    reverse: false,
    active: true,
  },
  {
    id: "Q30",
    order: 30,
    question: "发生意见冲突时，即使我不同意，我有时也会选择不表达。",
    dimension: "dominance",
    reverse: true,
    active: true,
  },

  // ---- 情绪感知 SENSITIVITY ----
  {
    id: "Q31",
    order: 31,
    question: "别人语气发生细微变化时，我通常比较容易察觉。",
    dimension: "sensitivity",
    reverse: false,
    active: true,
  },
  {
    id: "Q32",
    order: 32,
    question: "与重要的人发生矛盾以后，即使事情结束了，我有时还会想很久。",
    dimension: "sensitivity",
    reverse: false,
    active: true,
  },
  {
    id: "Q33",
    order: 33,
    question: "我比较容易感受到一个环境里是否存在紧张或者尴尬。",
    dimension: "sensitivity",
    reverse: false,
    active: true,
  },
  {
    id: "Q34",
    order: 34,
    question: "别人对我的评价通常不会在我脑子里停留太久。",
    dimension: "sensitivity",
    reverse: true,
    active: true,
  },
  {
    id: "Q35",
    order: 35,
    question: "我有时候能够察觉到别人没有直接说出来的情绪。",
    dimension: "sensitivity",
    reverse: false,
    active: true,
  },
  {
    id: "Q36",
    order: 36,
    question: "即使周围人的情绪比较激烈，我通常也不会受到太大影响。",
    dimension: "sensitivity",
    reverse: true,
    active: true,
  },
];

/** 获取启用中的题目（按 order 升序） */
export function getActiveQuestions(): PersonalityQuestion[] {
  return PERSONALITY_QUESTIONS.filter((q) => q.active).sort(
    (a, b) => a.order - b.order
  );
}

/** 校验答案合法性 */
export function isValidAnswer(letter: string): letter is "A" | "B" | "C" | "D" {
  return letter === "A" || letter === "B" || letter === "C" || letter === "D";
}