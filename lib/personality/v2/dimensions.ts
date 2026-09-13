// =====================================================
// 人格测试 v5 — 6 维度定义
// 按对接指南「三、六维定义」：旧名（沟通表达/冲突处理/亲密需求/未来规划/独立空间/情感表达）已废弃
// 这里只用一组新维度码：G / X / I / F / S / E
// =====================================================

export const V2_DIMENSIONS = [
  "G", // 表达力 — 有想法能不能讲出来
  "X", // 应对力 — 遇阻力绕开还是迎上去
  "I", // 认可需求 — 需要多少外界肯定才有底
  "F", // 方向感 — 知不知道要去哪
  "S", // 自主性 — 一个人能不能把日子过好
  "E", // 情绪觉知 — 认不认得出自己在难受
] as const;

export type V2Dimension = (typeof V2_DIMENSIONS)[number];

/** 维度元数据：维度中文名 + 配的卡上的极性方向（高分/低分各自含义） */
export const V2_DIMENSION_META: Record<
  V2Dimension,
  { cn: string; en: string; lowLabel: string; highLabel: string }
> = {
  G: {
    cn: "表达力",
    en: "Expression",
    lowLabel: "想法更习惯先压在心里，不是不想说，只是还没想好怎么说",
    highLabel: "能把想法变成语句，能把不舒服讲出来而不是绕开",
  },
  X: {
    cn: "应对力",
    en: "Conflict Response",
    lowLabel: "遇冲突更愿意绕开、缓一缓，能拖就先拖",
    highLabel: "遇冲突正面迎上去，能拆解问题本身而不被情绪带跑",
  },
  I: {
    cn: "认可需求",
    en: "Recognition Need",
    lowLabel: "不需要外界肯定也有底，顺其自然就好",
    highLabel: "很需要外界肯定，没有会担心自己是不是做错了",
  },
  F: {
    cn: "方向感",
    en: "Direction",
    lowLabel: "不强求每天有方向，可以先走着再说",
    highLabel: "心里有张地图，知道自己当下在做哪一步、要走到哪里",
  },
  S: {
    cn: "自主性",
    en: "Self-reliance",
    lowLabel: "一个人的时候会空，需要有人在才行",
    highLabel: "一个人也能把日子过好，不依赖、不讨好",
  },
  E: {
    cn: "情绪觉知",
    en: "Affect Awareness",
    lowLabel: "情绪来得慢、走得也慢，常常事后才意识到自己在难受",
    highLabel: "情绪一冒头就认得出，可以叫得出名字、分得清自己",
  },
};

/** 维度在 vec / cards 坐标中的索引 */
export const V2_DIM_INDEX: Record<V2Dimension, number> = {
  G: 0,
  X: 1,
  I: 2,
  F: 3,
  S: 4,
  E: 5,
};

/** 单题按此 dim 累加后落在 [6, 30]（每套每维 6 题 × score 1-5） */
export const V2_DIM_MIN = 6;
export const V2_DIM_MAX = 30;
