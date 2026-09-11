// =====================================================
// 我到底什么性格 — 8 种人格原型定义与匹配
// PRD 第十三节：欧氏距离 Top3（核心人格 / 第二人格 / 隐藏人格）
// =====================================================

import {
  PERSONALITY_DIMENSIONS,
  PERSONALITY_TYPE_META,
  type PersonalityDimension,
  type PersonalityType,
} from "./types";

/** 单个人格的目标向量（理想 6 维分数） */
export type PersonalityVector = Record<PersonalityDimension, number>;

/** 15 种人格原型向量表 + 14 过度型
 *  向量语义：6 维 0-100，理想画像（非概率，是匹配度）
 *  总数 29：15 主型 + 14 过渡型（每过渡 = 前后主型 6 维均值）
 *  TS 仅声明 15 主型；14 过渡用 Object.assign 在运行时合并（避免对象字面量内部引用自身的限制）
 */
export const ARCHETYPE_VECTORS: Record<Exclude<PersonalityType, `${PersonalityType}__${PersonalityType}`>, PersonalityVector> = {
  // ---- 8 原（向量特征已极化，确保 Top1 命中分散）----
  strategist: {
    // 极理性 + 极计划 + 主导 + 低社交 + 中风险 + 低敏
    social: 30,
    rationality: 95,
    planning: 92,
    risk: 55,
    dominance: 78,
    sensitivity: 28,
  },
  explorer: {
    // 极风险 + 极低计划 + 中社交 + 偏自由 + 中理性 + 中敏
    social: 60,
    rationality: 50,
    planning: 22,
    risk: 95,
    dominance: 55,
    sensitivity: 62,
  },
  leader: {
    // 极主导 + 高社交 + 高风 + 强理性 + 中计划 + 低敏
    social: 78,
    rationality: 78,
    planning: 65,
    risk: 75,
    dominance: 98,
    sensitivity: 30,
  },
  observer: {
    // 极低社交 + 高理性 + 中计划 + 低风 + 低主导 + 高敏
    social: 15,
    rationality: 82,
    planning: 70,
    risk: 25,
    dominance: 22,
    sensitivity: 78,
  },
  creator: {
    // 极风 + 高敏 + 低计划 + 中理性 + 强创作冲动（中社会 + 中主导）
    social: 48,
    rationality: 35,
    planning: 22,
    risk: 88,
    dominance: 52,
    sensitivity: 88,
  },
  coordinator: {
    // 高社交 + 高敏 + 强理性 + 中计划 + 低风 + 中主导（人群翻译官）
    social: 88,
    rationality: 70,
    planning: 65,
    risk: 22,
    dominance: 55,
    sensitivity: 85,
  },
  guardian: {
    // 极计划 + 高敏 + 低风 + 中理性 + 中社交 + 低主导（守）
    social: 55,
    rationality: 58,
    planning: 95,
    risk: 15,
    dominance: 35,
    sensitivity: 78,
  },
  doer: {
    // 极高风 + 高社交 + 主导 + 中理性 + 低计划 + 低敏（先动再调）
    social: 72,
    rationality: 60,
    planning: 35,
    risk: 92,
    dominance: 82,
    sensitivity: 28,
  },
  // ---- 7 月相新主型（沿月序，每型至少 4 维偏极）----
  // 初一暗礁（朔月 · 隐于水下）：极低社交 + 强敏 + 低风 + 极低主导
  dark_reef: {
    social: 12,
    rationality: 65,
    planning: 78,
    risk: 22,
    dominance: 18,
    sensitivity: 92,
  },
  // 初二引子（娥眉月 · 微小动作点燃）：极低计划 + 极风 + 低理性 + 低主导 + 中敏
  spark: {
    social: 38,
    rationality: 18,
    planning: 15,
    risk: 95,
    dominance: 28,
    sensitivity: 58,
  },
  // 初三启程（娥眉月 · 稳稳第一步）：极高计划 + 中理性 + 低风 + 中敏
  departure: {
    social: 50,
    rationality: 78,
    planning: 88,
    risk: 45,
    dominance: 55,
    sensitivity: 45,
  },
  // 初四探路（盈眉月 · 暗线情报员）：低社交 + 高理性 + 中计划 + 中风
  scout: {
    social: 22,
    rationality: 92,
    planning: 65,
    risk: 78,
    dominance: 45,
    sensitivity: 50,
  },
  // 初五漫游（上蛾眉 · 跨世界漂）：低计划 + 高风 + 中社交 + 高敏 + 低理性
  drifter: {
    social: 55,
    rationality: 35,
    planning: 18,
    risk: 82,
    dominance: 30,
    sensitivity: 78,
  },
  // 初六微光（盈眉月 · 照角落）：低社交 + 高敏 + 中理性 + 极低风 + 极低主导
  glimmer: {
    social: 18,
    rationality: 70,
    planning: 55,
    risk: 28,
    dominance: 18,
    sensitivity: 95,
  },
  // 十五全貌（满月 · 看全部）：高理性 + 高敏 + 中计划 + 中风险 + 中社会 + 中主导
  whole: {
    social: 55,
    rationality: 95,
    planning: 65,
    risk: 55,
    dominance: 60,
    sensitivity: 88,
  },
};

// ---- 14 过渡型 6 维向量 ----
// 关键：不简单算术均值（那样会坍缩到中段导致距离过近）
// 用「保留两端强度 + 拉高差异」算法：
//   - 当 a 维和 b 维都在中段（[30, 60] 内），取 p95
//   - 当只有一侧极端（在 [0,30] 或 [60,100]），保留这一侧强度，端值再拉近 1/3
//   - 当两侧都极端（都 ≤30 或都 ≥65），保留 a 但向 b 靠拢 25%
// 这样过渡型都保留"足够远"的 6 维特征，避免与中段用户距离坍缩为 0
const _HYBRID_VECTORS = {
  dark_reef__spark:        adjustHybrid(ARCHETYPE_VECTORS.dark_reef,    ARCHETYPE_VECTORS.spark),
  spark__departure:        adjustHybrid(ARCHETYPE_VECTORS.spark,        ARCHETYPE_VECTORS.departure),
  departure__scout:        adjustHybrid(ARCHETYPE_VECTORS.departure,    ARCHETYPE_VECTORS.scout),
  scout__drifter:          adjustHybrid(ARCHETYPE_VECTORS.scout,        ARCHETYPE_VECTORS.drifter),
  drifter__glimmer:        adjustHybrid(ARCHETYPE_VECTORS.drifter,      ARCHETYPE_VECTORS.glimmer),
  glimmer__strategist:     adjustHybrid(ARCHETYPE_VECTORS.glimmer,      ARCHETYPE_VECTORS.strategist),
  strategist__observer:    adjustHybrid(ARCHETYPE_VECTORS.strategist,   ARCHETYPE_VECTORS.observer),
  observer__guardian:      adjustHybrid(ARCHETYPE_VECTORS.observer,     ARCHETYPE_VECTORS.guardian),
  guardian__coordinator:   adjustHybrid(ARCHETYPE_VECTORS.guardian,     ARCHETYPE_VECTORS.coordinator),
  coordinator__creator:    adjustHybrid(ARCHETYPE_VECTORS.coordinator,  ARCHETYPE_VECTORS.creator),
  creator__explorer:       adjustHybrid(ARCHETYPE_VECTORS.creator,      ARCHETYPE_VECTORS.explorer),
  explorer__doer:          adjustHybrid(ARCHETYPE_VECTORS.explorer,     ARCHETYPE_VECTORS.doer),
  doer__leader:            adjustHybrid(ARCHETYPE_VECTORS.doer,         ARCHETYPE_VECTORS.leader),
  leader__whole:           adjustHybrid(ARCHETYPE_VECTORS.leader,       ARCHETYPE_VECTORS.whole),
};

/**
 * 过渡型向量合成：保留两端强度，避免均值坍缩到中段。
 *
 * 规则：
 * - 若 a、b 该维度都在中段（30-60）→ 取 p95（取更高的值）
 * - 若仅一端偏离中段 → 保留这一端强度，并用 1/3 朝另一端靠拢
 * - 若两端都偏离中段 → 保留 a，但向 b 靠 25%
 *
 * 这样无论 a、b 距离多近，过渡型都不会"坍缩"为中位向量，
 * 保证与中段用户的欧氏距离 > 与任一端的距离。
 */
function adjustHybrid(a: PersonalityVector, b: PersonalityVector): PersonalityVector {
  const result: PersonalityVector = { social: 0, rationality: 0, planning: 0, risk: 0, dominance: 0, sensitivity: 0 };
  for (const dim of PERSONALITY_DIMENSIONS) {
    const x = a[dim];
    const y = b[dim];
    const midLow = 30;
    const midHigh = 70;
    const aMid = x >= midLow && x <= midHigh;
    const bMid = y >= midLow && y <= midHigh;
    if (aMid && bMid) {
      // 双方都中段：取更极端的那一边（±20 拉离中段），确保不与中段用户距离坍缩
      const aDist = Math.abs(x - 50);
      const bDist = Math.abs(y - 50);
      const extreme = aDist > bDist ? x : y;
      const direction = extreme >= 50 ? 1 : -1;
      result[dim] = Math.round(extreme + direction * 15);
    } else if (aMid && !bMid) {
      // 只有 b 端有极：用 b 但向 a 端拉 1/3
      result[dim] = Math.round((b[dim] * 2 + a[dim]) / 3);
    } else if (!aMid && bMid) {
      result[dim] = Math.round((a[dim] * 2 + b[dim]) / 3);
    } else {
      // 两端都不中段：保留 a 但向 b 靠 25%
      result[dim] = Math.round(a[dim] * 0.75 + b[dim] * 0.25);
    }
  }
  // 截断 0-100
  for (const dim of PERSONALITY_DIMENSIONS) {
    result[dim] = Math.max(5, Math.min(95, result[dim]));
  }
  return result;
}

/** 把 14 过渡型合并到主型表（在原 const 上做 runtime 合并） */
Object.assign(ARCHETYPE_VECTORS as Record<string, PersonalityVector>, _HYBRID_VECTORS);
/** 在 TS 层把 ARCHETYPE_VECTORS 类型断言扩到 29 键，便于下游消费 */
const __allVectors = ARCHETYPE_VECTORS as Record<string, PersonalityVector> as Record<PersonalityType, PersonalityVector>;
// 重新导出以让外部读 29 键
Object.assign(ARCHETYPE_VECTORS as object, __allVectors);

/** 欧氏距离（用户向量 vs 人格向量） */
export function euclideanDistance(
  user: Record<PersonalityDimension, number>,
  target: PersonalityVector
): number {
  let sum = 0;
  for (const dim of PERSONALITY_DIMENSIONS) {
    const d = user[dim] - target[dim];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** 距离 → 0-100 匹配度（注意：是"匹配度"，不是"概率"） */
export function distanceToMatchScore(distance: number): number {
  // 最大可能距离：6 维各差 100 → sqrt(6 × 10000) ≈ 244.9
  const maxDistance = Math.sqrt(6 * 100 * 100);
  const similarity = Math.max(0, 1 - distance / maxDistance);
  return Math.round(similarity * 100);
}

/** 找出 Top3 匹配人格（按距离升序） */
export function matchArchetypes(
  userScores: Record<PersonalityDimension, number>
): Array<{ type: PersonalityType; matchScore: number; distance: number }> {
  const allVectors = ARCHETYPE_VECTORS as unknown as Record<PersonalityType, PersonalityVector>;
  const ranked = (Object.keys(allVectors) as PersonalityType[])
    .map((type) => ({
      type,
      distance: euclideanDistance(userScores, allVectors[type]),
    }))
    .sort((a, b) => a.distance - b.distance);

  return ranked.slice(0, 3).map((entry) => ({
    type: entry.type,
    distance: entry.distance,
    matchScore: distanceToMatchScore(entry.distance),
  }));
}

/** 取得人格原型的中文名 + 英文名 + tagline */
export function archetypeMeta(type: PersonalityType) {
  return PERSONALITY_TYPE_META[type];
}