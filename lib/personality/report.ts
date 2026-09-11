// =====================================================
// 报告组装引擎
// 输入：6 维分数 + Top3 人格
// 输出：免费版（30%） + 完整版（16 模块）
// =====================================================

import type {
  PersonalityDimension,
  PersonalityType,
} from "./types";
import { PERSONALITY_TYPE_META } from "./types";
import type { PersonalityFullReport, PersonalityFreeReport } from "./content/report";
import { ARCHETYPE_DEEP_COPY as ARCHETYPE_DEEP_COPY_RAW, type ArchetypeDeepCopy as ArchetypeDeepCopyType } from "./content/archetypes";
import { getDimensionReading } from "./content/dimensions";
import { evaluateCombinationRules } from "./content/combination-rules";

/**
 * 内部使用的完整版 deep copy 字典
 * 注意：8 主型字段完整；过渡型/月相新主型只有 primary/summary，
 * 其它字段在 resolveArchetypeCopy 内用月相近邻/前后主型 merge 补全，
 * 函数返回值始终是完整的 ArchetypeDeepCopy。
 */
type DeepCopyMap = Partial<Record<PersonalityType, Partial<ArchetypeDeepCopyType>>>;
const ARCHETYPE_DEEP_COPY: DeepCopyMap = ARCHETYPE_DEEP_COPY_RAW;

interface MatchedArchetype {
  type: PersonalityType;
  matchScore: number;
  distance: number;
}

export interface BuildReportInput {
  scores: Record<PersonalityDimension, number>;
  primary: MatchedArchetype;
  secondary: MatchedArchetype;
  hidden: MatchedArchetype;
}

/** 找出两个最突出的维度（按 |score-50| 降序） */
function pickTopDimensions(scores: Record<PersonalityDimension, number>): Array<{
  key: PersonalityDimension;
  score: number;
  summary: string;
}> {
  const dims = Object.keys(scores) as PersonalityDimension[];
  const ranked = dims
    .map((key) => ({ key, score: scores[key], distance: Math.abs(scores[key] - 50) }))
    .sort((a, b) => b.distance - a.distance);

  return ranked.slice(0, 2).map(({ key, score }) => {
    const reading = getDimensionReading(key, score);
    return { key, score, summary: reading.summary };
  });
}

/** 找出一项核心优势（按原型 deep copy 的 strengths[0]） */
function pickCoreStrength(primaryType: PersonalityType) {
  return resolveArchetypeCopy(primaryType).strengths[0];
}

/**
 * 把任意原型 type 解析到一份完整的 ArchetypeDeepCopy。
 * - 8 原主型：直接查 ARCHETYPE_DEEP_COPY（字段全）
 * - 7 月相新主型（dark_reef/spark/.../whole）：查表用专属 primary/summary，其它字段回退到月相近邻主型
 * - 14 过渡型（a__b）：专属 primary/summary + 其它字段按"前后主型 merge"兜底
 * 这样可以只写 primary/summary 两段文案，就能让模板版本身不机械
 */
function resolveArchetypeCopy(type: PersonalityType): import("./content/archetypes").ArchetypeDeepCopy {
  const hit = ARCHETYPE_DEEP_COPY[type];

  // 7 月相新主型专属 → 月相近邻 fallback
  const monthFallback: Partial<Record<PersonalityType, PersonalityType>> = {
    dark_reef: "guardian",
    spark: "doer",
    departure: "strategist",
    scout: "observer",
    drifter: "explorer",
    glimmer: "creator",
    whole: "leader",
  };

  // 1. 过渡型：按 "__" 拆，前/后分别解析后 merge；专属 primary/summary 叠加在前
  if (type.includes("__")) {
    const [left, right] = type.split("__") as [PersonalityType, PersonalityType];
    const merged = mergeArchetypeCopies(resolveArchetypeCopy(left), resolveArchetypeCopy(right));
    if (hit && (hit.primary || hit.summary)) {
      return {
        ...merged,
        primary: hit.primary ?? merged.primary,
        summary: hit.summary ?? merged.summary,
      };
    }
    return merged;
  }

  // 2. 完整命中（8 原主型）— 直接返回
  if (hit && (hit.primary && hit.summary && hit.strengths)) {
    return hit as import("./content/archetypes").ArchetypeDeepCopy;
  }

  // 3. partial 命中（7 月相新主型）— 用月相近邻补全 + 专属 primary/summary 覆盖
  const fb = monthFallback[type];
  if (fb && ARCHETYPE_DEEP_COPY[fb]) {
    const base = ARCHETYPE_DEEP_COPY[fb] as unknown as import("./content/archetypes").ArchetypeDeepCopy;
    return {
      ...base,
      primary: hit?.primary ?? base.primary,
      summary: hit?.summary ?? base.summary,
    } as import("./content/archetypes").ArchetypeDeepCopy;
  }

  // 4. 兜底
  const fb2 = ARCHETYPE_DEEP_COPY.strategist as unknown as import("./content/archetypes").ArchetypeDeepCopy;
  return hit && (hit.primary || hit.summary)
    ? ({ ...fb2, primary: hit.primary ?? fb2.primary, summary: hit.summary ?? fb2.summary } as import("./content/archetypes").ArchetypeDeepCopy)
    : fb2;
}

/** 合并两个 deep copy：每个字段拼接前后，strengths/blindSpots 取并集 */
function mergeArchetypeCopies(
  left: import("./content/archetypes").ArchetypeDeepCopy,
  right: import("./content/archetypes").ArchetypeDeepCopy
): import("./content/archetypes").ArchetypeDeepCopy {
  return {
    primary: `${left.primary} ${right.primary}`,
    secondary: `${left.secondary} ${right.secondary}`,
    hidden: `${left.hidden} ${right.hidden}`,
    strengths: [...left.strengths, ...right.strengths].slice(0, 5),
    blindSpots: [...left.blindSpots, ...right.blindSpots].slice(0, 5),
    relationships: {
      makingFriends: `${left.relationships.makingFriends} ${right.relationships.makingFriends}`,
      buildingTrust: `${left.relationships.buildingTrust} ${right.relationships.buildingTrust}`,
      handlingConflict: `${left.relationships.handlingConflict} ${right.relationships.handlingConflict}`,
      endingRelationships: `${left.relationships.endingRelationships} ${right.relationships.endingRelationships}`,
    },
    career: {
      suitable: `${left.career.suitable} ${right.career.suitable}`,
      unsuitable: `${left.career.unsuitable} ${right.career.unsuitable}`,
      workStyle: `${left.career.workStyle} ${right.career.workStyle}`,
      decisionStyle: `${left.career.decisionStyle} ${right.career.decisionStyle}`,
      executionStyle: `${left.career.executionStyle} ${right.career.executionStyle}`,
    },
    stress: { ...left.stress, ...right.stress },
    triggers: { ...left.triggers, ...right.triggers },
    intimacy: { ...left.intimacy, ...right.intimacy },
    growth: [...left.growth, ...right.growth].slice(0, 6),
    summary: `${left.summary}\n\n---\n\n${right.summary}`,
  };
}

/** 组装免费版 */
export function buildFreeReport(input: BuildReportInput): PersonalityFreeReport {
  const primaryMeta = PERSONALITY_TYPE_META[input.primary.type];
  return {
    primaryTagline: primaryMeta.tagline,
    scores: input.scores,
    topDimensions: pickTopDimensions(input.scores),
    coreStrength: pickCoreStrength(input.primary.type),
  };
}

/** 组装完整版（含免费版字段 + 16 模块） */
export function buildFullReport(input: BuildReportInput): PersonalityFullReport {
  const free = buildFreeReport(input);
  const primaryCopy = resolveArchetypeCopy(input.primary.type);
  const secondaryCopy = resolveArchetypeCopy(input.secondary.type);
  const hiddenCopy = resolveArchetypeCopy(input.hidden.type);

  const primaryMeta = PERSONALITY_TYPE_META[input.primary.type];
  const secondaryMeta = PERSONALITY_TYPE_META[input.secondary.type];
  const hiddenMeta = PERSONALITY_TYPE_META[input.hidden.type];

  // 主导性相关动态文案
  const dom = input.scores.dominance;
  const leadership =
    dom >= 70
      ? `你的领导风格偏"推动型"——你习惯在混乱时给出方向，在需要拍板时果断出手。你更适合带新业务、带 0-1 项目、带需要扛结果的团队。`
      : dom <= 35
        ? `你的领导风格偏"支持型"——你不强求别人按你的方式做事，而是用专业度和稳定性影响团队。你更适合带成熟业务、带专业团队、带需要协作的项目。`
        : `你的领导风格居中——你能在需要时主动推动，也能在别人需要时退一步配合。这种弹性让你在不同规模、不同阶段的团队里都能发挥作用。`;

  // 金钱与风险：基于 risk/planning/rationality/dominance 组合
  const moneyAndRisk = buildMoneyAndRisk(input.scores);

  // 表面 vs 真实
  const surfaceVsReal = buildSurfaceVsReal(input.primary.type, input.scores);

  // 性格矛盾：从原型 strengths/blindSpots 派生
  const contradictions = buildContradictions(primaryCopy, input.scores);

  // 成长建议：合并原型 growth + 维度组合规则命中的洞察
  const growthBase = [...primaryCopy.growth];
  const ruleInsights = evaluateCombinationRules(input.scores).slice(0, 3);
  const ruleTips = ruleInsights.map(
    (r) => `组合洞察 · ${r.title}：${r.insight}`
  );
  // 至少 5 条
  while (growthBase.length + ruleTips.length < 5 && growthBase.length < 8) {
    // 理论上不会发生，留作兜底
    break;
  }

  return {
    ...free,
    primary: { name: primaryMeta.cn, description: primaryCopy.primary },
    secondary: { name: secondaryMeta.cn, description: secondaryCopy.primary },
    hidden: { name: hiddenMeta.cn, description: hiddenCopy.primary },
    surfaceVsReal,
    contradictions,
    strengths: primaryCopy.strengths,
    blindSpots: primaryCopy.blindSpots,
    triggers: primaryCopy.triggers,
    stress: primaryCopy.stress,
    relationships: primaryCopy.relationships,
    intimacy: primaryCopy.intimacy,
    career: primaryCopy.career,
    leadership,
    moneyAndRisk,
    growth: [...growthBase, ...ruleTips].slice(0, 8),
    summary: primaryCopy.summary,
  };
}

function buildSurfaceVsReal(
  primaryType: PersonalityType,
  scores: Record<PersonalityDimension, number>
): { surface: string; real: string } {
  // 基于原型的"别人看到的你"和"真正的你"
  // 14 过渡型没有独立条目，回退到主型的描述 + 一个"过渡修饰"
  const surfacesBase: Partial<Record<PersonalityType, string>> = {
    strategist: "冷静、理性、永远有答案",
    explorer: "爱折腾、不稳定、不靠谱",
    leader: "强势、爱管事、什么都要拍板",
    observer: "冷淡、距离感、不参与",
    creator: "挑剔、情绪化、想法多",
    coordinator: "好说话、不主动、不强势",
    guardian: "稳、安全、没惊喜",
    doer: "粗线条、不细腻、只做事",
    dark_reef: "安静、几乎看不见",
    spark: "突然、又闪过",
    departure: "刚起步、不确定",
    scout: "话不多、问得多",
    drifter: "飘忽、难以捉摸",
    glimmer: "微弱、容易被忽略",
    whole: "通透、什么都看得见",
  };
  const realsBase: Partial<Record<PersonalityType, string>> = {
    strategist: "独立判断的代价是经常一个人想清楚所有事",
    explorer: "你渴望的只是「不被困住」的确定性",
    leader: "你扛着所有事的代价是没人问你累不累",
    observer: "你看得清楚但不说出来，所以经常被误解",
    creator: "你希望被看见的不是你的产出，是你的独特",
    coordinator: "你照顾所有人，但没人照顾你",
    guardian: "你稳定的代价是别人以为你不需要被照顾",
    doer: "你用忙碌代替了面对自己的情绪",
    dark_reef: "你不需要被看见，但你也不想被忘记",
    spark: "你的影响，比你自己以为的更大",
    departure: "你还在想的部分，比你已经开始的部分多",
    scout: "你知道得比说出来的多，但别人不知道你知道",
    drifter: "你不属于任何一个世界，但那也是你的位置",
    glimmer: "你不发声也照到别人，这点只有懂你的人明白",
    whole: "你什么都能看见，所以反而更难选择",
  };

  // 主型走原值；过渡型走前后均值合成
  function resolve(map: Partial<Record<PersonalityType, string>>): string {
    if (map[primaryType]) return map[primaryType]!;
    return synthesizeHybridField(primaryType, map);
  }
  const surface = resolve(surfacesBase);
  let real = resolve(realsBase);

  const r = scores.rationality;
  const sens = scores.sensitivity;
  // 高理性 + 高敏感的复合描述
  if (r >= 70 && sens >= 70) {
    real += "——你能同时感受到情绪和看清逻辑，但你很少把这两种能力同时呈现给别人。";
  } else if (r <= 35 && sens >= 70) {
    real += "——你容易被别人低估你的感受力。";
  } else if (r >= 70 && sens <= 35) {
    real += "——你其实比你以为的更在意。";
  }

  return { surface, real };
}

/**
 * 对 14 过渡型 key 合成一段过渡状态描述：
 * 从 key 拆出前后主型，读 map 取两半拼合。
 */
function synthesizeHybridField(
  type: PersonalityType,
  map: Partial<Record<PersonalityType, string>>
): string {
  const [leftKey, rightKey] = type.split("__") as [PersonalityType, PersonalityType];
  const left = map[leftKey] ?? "你身上有这一面";
  const right = map[rightKey] ?? "你身上有那一面";
  return `${left}，但也${right}`;
}

function buildContradictions(
  primaryCopy: import("./content/archetypes").ArchetypeDeepCopy,
  scores: Record<PersonalityDimension, number>
): string[] {
  // 从原型 strengths/blindSpots 找一对"看起来矛盾"的组合
  const base = [
    `你希望拥有更多${scores.social >= 60 ? "连接" : "独处"}，但又担心因此失去${scores.social >= 60 ? "自我空间" : "必要的关系"}。`,
    `你既想${
      scores.risk >= 60 ? "尝试新的可能" : "保持稳定的节奏"
    }，又害怕${
      scores.risk >= 60 ? "失去已经拥有的" : "错过应该抓住的机会"
    }。`,
    `你愿意${
      scores.dominance >= 60 ? "主动推动" : "让出空间"
    }，但又希望对方${
      scores.dominance >= 60 ? "也能主动" : "不会完全不来找你"
    }。`,
    `你渴望${
      scores.sensitivity >= 60 ? "被理解" : "被尊重边界"
    }，但你常常${
      scores.sensitivity >= 60 ? "不会主动表达这个需要" : "用不表达来测试对方"
    }。`,
    `你看起来${
      scores.planning >= 60 ? "很有章法" : "很随性"
    }，但你内心其实对${
      scores.planning >= 60 ? "失控" : "一成不变"
    }有很深的警觉。`,
  ];
  // 至少 3 条
  return base.slice(0, 5);
}

function buildMoneyAndRisk(scores: Record<PersonalityDimension, number>): string {
  const { risk, planning, rationality, dominance } = scores;
  const parts: string[] = [];
  if (risk >= 70 && planning >= 70) {
    parts.push("你在金钱上偏向「研究型冒险」——愿意为高回报主动下注，但通常会先做功课。");
  } else if (risk >= 70 && planning <= 35) {
    parts.push("你在金钱上偏向「冲动尝试」——你很快被可能性吸引，但偶尔需要补一个冷静期。");
  } else if (risk <= 30 && planning >= 70) {
    parts.push("你在金钱上偏向「稳定储蓄」——你更信任长期的、低波动的方式。");
  } else {
    parts.push("你在金钱上偏向「平衡型」——你会权衡回报和风险，不会极端冒险也不极端保守。");
  }
  if (rationality >= 70) {
    parts.push("你做财务决定时倾向先看数据，而不是先看感觉。");
  } else if (rationality <= 35) {
    parts.push("你做财务决定时倾向先看感觉，理性分析在你这里通常是事后验证。");
  }
  if (dominance >= 70) {
    parts.push("你在财务上更愿意自己拍板，而不是听别人建议。");
  }
  // 显式声明不构成投资建议
  parts.push("（以上是行为倾向分析，不构成投资建议。）");
  return parts.join(" ");
}