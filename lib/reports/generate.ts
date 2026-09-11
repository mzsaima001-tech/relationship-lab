import "server-only";
import { DimensionScores } from "@/lib/assessment/types";
import {
  calculatePairScores,
  getPatternDescriptions,
  PairScores,
} from "@/lib/assessment/pair-score";
import { generateTags } from "@/lib/assessment/score";
import { runPolishItems, type PolishItem } from "./narrative";

// =====================================================
// 双人报告：模板引擎产出事实正确的草稿，
// 再经 AI 润色表达层（与单人报告共用 runPolishItems 引擎）。
// AI 未开启/失败 → 自动降级为纯模板版，绝不阻塞出报告。
// =====================================================

interface PairReportInput {
  relationship: {
    type: string;
    duration: string;
  };
  personA: {
    nickname: string;
    archetype: string;
    scores: DimensionScores;
    signals: Record<string, unknown>;
  };
  personB: {
    nickname: string;
    archetype: string;
    scores: DimensionScores;
    signals: Record<string, unknown>;
  };
  pairPatterns: string[];
}

export interface PairReport {
  relationshipType: string;
  headline: string;
  summary: string;
  attraction: string;
  personANeeds: string;
  personBNeeds: string;
  interactionCycle: string;
  conflictPattern: string;
  risks: string[];
  suggestions: string[];
  communicationScripts: {
    situation: string;
    personA: string;
    personB: string;
  }[];
  pairScores?: PairScores;
}

const DIMENSION_LABELS: Record<string, string> = {
  response_need: "回应需求",
  expression: "表达倾向",
  space_need: "空间需求",
  emotional_sensitivity: "情绪感知",
  conflict_urgency: "冲突节奏",
  repair_orientation: "修复意愿",
};

function scoreLabel(score: number): string {
  if (score >= 75) return "高";
  if (score >= 55) return "中高";
  if (score >= 45) return "中等";
  if (score >= 25) return "中低";
  return "低";
}

export async function generatePairReport(data: PairReportInput): Promise<PairReport> {
  const { personA, personB, relationship, pairPatterns } = data;

  const pairScores = calculatePairScores(personA.scores, personB.scores);
  const patternDescs = getPatternDescriptions(pairPatterns);

  const aName = personA.nickname || "A";
  const bName = personB.nickname || "B";

  // Headline
  const headline = `${personA.archetype} × ${personB.archetype}`;

  // Summary
  let summary = `从你们的测评数据来看，${aName}更接近「${personA.archetype}」，${bName}更接近「${personB.archetype}」。`;
  summary += `六个维度形成的互动贴合参考值是 ${pairScores.overall}；这个数字只用于帮助观察差异，不是对关系是否适合的裁判。`;

  if (pairScores.overall >= 75) {
    summary += "你们在不少日常节奏上较为接近，但真正值得关注的仍是具体互动循环。";
  } else if (pairScores.overall >= 55) {
    summary += "你们之间既有相似也有互补，需要优先理解哪些差异会在压力下形成循环。";
  } else {
    summary += "你们的相处方式存在明显差异；差异本身不代表关系不好，关键是它们是否持续互相触发。";
  }

  // Attraction
  const attraction = `${aName}和${bName}之间的吸引力更多来自差异。${aName}在"情绪感知"上${scoreLabel(personA.scores.emotional_sensitivity)}，${bName}在"表达倾向"上${scoreLabel(personB.scores.expression)}。这种「一个感知更多、一个表达更直接」的组合，在初期可能产生互补的吸引力，但也容易在深入相处后出现沟通节奏不一致。`;

  // Person A needs
  const aTags = generateTags(personA.scores);
  const personANeeds = `${aName}的核心需求是${aTags.slice(0, 3).join("、")}。从数据来看，${aName}在"回应需求"维度得分${personA.scores.response_need}，属于${scoreLabel(personA.scores.response_need)}水平。这意味着${aName}${personA.scores.response_need >= 60 ? "更容易在对方沉默时感到不安" : "相对能接受对方不回应的状态"}。`;

  // Person B needs
  const bTags = generateTags(personB.scores);
  const personBNeeds = `${bName}的核心需求是${bTags.slice(0, 3).join("、")}。从数据来看，${bName}在"空间需求"维度得分${personB.scores.space_need}，属于${scoreLabel(personB.scores.space_need)}水平。这意味着${bName}${personB.scores.space_need >= 60 ? "在压力增加时更倾向于先退一步" : "不太需要太多独处空间来消化情绪"}。`;

  // Interaction cycle
  let interactionCycle = "";
  if (patternDescs.length > 0) {
    interactionCycle = patternDescs.join("\n\n");
  } else {
    interactionCycle = `你们之间没有检测到明显的"靠近-后退"循环。这通常意味着你们的相处节奏比较同步，不容易出现一方追逐另一方退避的情况。`;
  }

  // Conflict pattern
  const aUrgency = personA.scores.conflict_urgency;
  const bUrgency = personB.scores.conflict_urgency;
  let conflictPattern = "";
  if (Math.abs(aUrgency - bUrgency) >= 30) {
    const fast = aUrgency > bUrgency ? aName : bName;
    const slow = aUrgency > bUrgency ? bName : aName;
    conflictPattern = `矛盾发生时，${fast}更倾向于「现在就说清楚」，而${slow}更需要「先冷静一下再说」。这种节奏差异是你们冲突中最常见的张力来源——${fast}觉得「不说清楚就是不重视」，${slow}觉得「现在逼我说话就是不尊重我」。`;
  } else {
    conflictPattern = `你们在冲突节奏上比较一致，都倾向于${aUrgency >= 55 ? "尽快解决问题" : "先冷静再处理"}，这减少了一部分摩擦。`;
  }

  // Risks
  const risks: string[] = [];
  if (pairPatterns.includes("A_APPROACH_B_WITHDRAW") || pairPatterns.includes("B_APPROACH_A_WITHDRAW")) {
    risks.push("一方越靠近、另一方越后退的循环可能逐渐加剧，导致双方都感到不被理解。");
  }
  if (pairPatterns.includes("A_SOLVE_NOW_B_NEEDS_PAUSE") || pairPatterns.includes("B_SOLVE_NOW_A_NEEDS_PAUSE")) {
    risks.push("冲突节奏不一致可能导致「一方觉得被忽视、另一方觉得被逼迫」的误解。");
  }
  if (Math.abs(personA.scores.expression - personB.scores.expression) >= 35) {
    risks.push("表达倾向差异较大，沉默一方可能被误解为「不在乎」，表达一方可能被感觉「太强势」。");
  }
  if (risks.length === 0) {
    risks.push("目前数据未检测到明显风险模式，但仍建议持续关注双方的沟通节奏是否同步。");
  }

  // Suggestions
  const suggestions: string[] = [];
  suggestions.push("约定一个「冷静暗号」：比如任何一方说「我需要15分钟」，另一方承诺不追问，15分钟后主动回来继续。");
  suggestions.push("每周留一次「不解决问题时间」：只表达感受，不要求对方做出改变。");
  if (Math.abs(aUrgency - bUrgency) >= 30) {
    suggestions.push("冲突时，节奏快的一方先给对方一个明确的时间预期：「我等你30分钟，如果你准备好了，我们再聊。」而不是「你什么时候想聊再聊」。");
  }
  suggestions.push("表达少的一方可以尝试用文字代替口头——「我写下来给你看」有时候比面对面说更容易。");

  // Communication scripts
  const communicationScripts = [
    {
      situation: "对方突然沉默",
      personA: personA.scores.response_need >= 60
        ? "我注意到你刚才不说话了，是不是有什么让你不舒服？如果你需要时间，我等你，但我想让你知道我在。"
        : "你突然安静了，等你准备好了跟我说一声就好。",
      personB: personB.scores.space_need >= 60
        ? "我需要自己待一会儿，不是因为你。给我15分钟，我回来找你。"
        : "刚才想了一下，其实是因为今天工作太累了，不是我们之间的问题。",
    },
    {
      situation: "发生争执后",
      personA: aUrgency >= 60
        ? "我不想现在就这样放着不管，我们能不能至少先把核心问题理一下？"
        : "我理解你现在不想说了，我们先各自消化一下，明天再说。",
      personB: bUrgency <= 40
        ? "谢谢你愿意等。我现在脑子很乱，说出来的话可能不好听，给我一点时间。"
        : "好，我们现在就聊。但我希望我们先各自说自己的感受，不要互相指责。",
    },
  ];

  return {
    relationshipType: relationship.type,
    headline,
    summary,
    attraction,
    personANeeds,
    personBNeeds,
    interactionCycle,
    conflictPattern,
    risks,
    suggestions,
    communicationScripts,
    pairScores,
  };
}

// ---------- 双人报告 AI 润色 ----------

const PAIR_POLISH_SYSTEM_PROMPT = `你是一位擅长中文情感表达的报告撰稿人。用户会给你一组「双人关系报告」的文案片段，每段带唯一 path。

任务：在不改变任何事实、结论、判断方向的前提下，把每段文字改写得更具体、更有画面感、更有共鸣感。

硬性要求：
1. 只改写表达方式。不得新增事实、不得删除信息、不得改变判断方向——例如原句说"差异较大"，绝不能改成"差异不大"；原句说"需要留意"，不能改成"不用担心"。
2. 语言：中文。称呼沿用原文中的双方昵称或"你们"；口吻克制、平实、有洞察，像一位懂这对朋友的人在安静地说话。
3. 禁止做关系判决（不说"你们不合适""你们注定如何"一类话）；禁止"亲爱的""宝贝"等亲昵称呼；禁止堆砌感叹号；禁止鸡汤腔、说教和浮夸排比。
4. 文中出现的双方昵称、原型名（「」中的词）、数字、比例、引号内容必须原样保留。
5. 每一段都必须重新遣词造句，不允许原样照抄（除非原文很短）。保持原文的并列结构，不合并段落、不拆分段落、不加小标题。
6. 长度与原文相当（±30% 以内）。
7. 只输出严格的 JSON，格式为 {"items": {"<path>": "<改写后的文字>"}}，必须包含输入里的全部 path，不要输出任何解释文字。`;

/**
 * 只有"表达层"字段允许被改写：
 * headline（原型×原型）、relationshipType、pairScores 是算法结论载体，一律不动。
 */
function collectPairPolishItems(report: PairReport): PolishItem[] {
  const items: PolishItem[] = [];
  const push = (path: string, text?: string) => {
    const t = (text ?? "").trim();
    if (t) items.push({ path, text: t });
  };
  push("summary", report.summary);
  push("attraction", report.attraction);
  push("personANeeds", report.personANeeds);
  push("personBNeeds", report.personBNeeds);
  push("interactionCycle", report.interactionCycle);
  push("conflictPattern", report.conflictPattern);
  report.risks.forEach((t, i) => push(`risks.${i}`, t));
  report.suggestions.forEach((t, i) => push(`suggestions.${i}`, t));
  report.communicationScripts.forEach((s, i) => {
    push(`communicationScripts.${i}.personA`, s.personA);
    push(`communicationScripts.${i}.personB`, s.personB);
  });
  return items;
}

export interface PairPolishResult {
  report: PairReport;
  applied: boolean;
  model?: string;
  error?: string;
}

/**
 * 用 LLM 润色双人报告的表达层（与单人报告共用 runPolishItems 引擎）。
 * 失败/超时/未开启 → 原样返回模板版。
 */
export async function polishPairReportWithLLM(report: PairReport): Promise<PairPolishResult> {
  const items = collectPairPolishItems(report);
  const r = await runPolishItems(report, items, PAIR_POLISH_SYSTEM_PROMPT);
  return { report, applied: r.applied, model: r.model, error: r.error };
}
