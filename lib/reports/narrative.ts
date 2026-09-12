// =====================================================
// 默契研究所 — 单人报告叙事引擎
// 输入：算法结论（分数/维度/信号/ReportFacts）+ 用户上下文
// 输出：结构化章节叙事。算法只出事实，这里负责"说人话"。
// 预留 LLM 润色接口（polishWithLLM），默认纯模板生成。
// =====================================================

import type {
  AssessmentContext,
  AssessmentResult,
  Dimension,
  ReportFacts,
  ReportFact,
} from "@/lib/assessment/types";
import { DIMENSION_LABELS } from "@/lib/assessment/types";
import { postJson } from "./llm-client";
import { getQuestionById } from "@/lib/content/store";
import {
  ARCHETYPE_COPY,
  DIMENSION_COPY,
  FEELING_COPY,
  STAGE_COPY,
  DURATION_COPY,
  SIGNAL_COPY,
  PATTERN_NAMES,
  bandOf,
  type SignalCopy,
} from "./copybook";
import { GENERATED_SIGNAL_COPY } from "./copybook-signalg";

/**
 * 叙事引擎版本号：引擎/文案库发生影响产出内容的变更时 +1。
 * 缓存 narrative_meta.v 与当前版本不一致 → 视为陈旧缓存，自动重建。
 */
export const NARRATIVE_VERSION = 2;

/**
 * 免费态裁剪：未解锁时只返回免费可见字段，付费正文一律不下发。
 * 注意这是 API 响应边界的裁剪，数据库里缓存的始终是完整版。
 * （前端原本只是"不渲染"付费内容，但接口全量返回，任何人都能在 DevTools 里读到——
 * 付费墙必须在服务端生效。）
 */
export function gateNarrativeForFree(n: SingleReportNarrative): SingleReportNarrative {
  return {
    ...n,
    coreNeeds: n.coreNeeds.slice(0, 1),
    strengths: n.strengths.slice(0, 1),
    // 六维图只保留分数与分档标签（免费），正文解读属付费
    dimensions: n.dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      score: d.score,
      confidence: d.confidence,
      bandLabel: d.bandLabel,
      summary: "",
      daily: "",
      evidenceQuotes: [],
    })),
    signalPortrait: [],
    innerTensions: [],
    stressPatterns: [],
    misunderstood: [],
    lifeStageNote: "",
    suggestions: [],
    scripts: [],
    closing: "",
  };
}

/**
 * 免费内容占全文的比例（按字符量估算，钳制在 5-45%）。
 * 用于付费墙「你才看到自己的 X%」——基于真实内容而非拍脑袋数字。
 */
export function freeContentPercent(n: SingleReportNarrative): number {
  const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join("").length;
  const free =
    join(n.oneLiner, n.opening) +
    join(n.archetype.essence, n.archetype.portrait, n.archetype.gift, n.archetype.blindSpot, n.archetype.recentTendency) +
    join(n.coreNeeds[0]?.headline, n.coreNeeds[0]?.meaning) +
    join(n.strengths[0]?.headline, n.strengths[0]?.meaning);
  const paid =
    n.coreNeeds.slice(1).reduce((a, f) => a + join(f.headline, f.meaning), 0) +
    n.strengths.slice(1).reduce((a, f) => a + join(f.headline, f.meaning), 0) +
    n.dimensions.reduce((a, d) => a + join(d.summary, d.daily, d.watchOut), 0) +
    n.signalPortrait.reduce((a, s) => a + join(s.label, s.meaning, s.recent), 0) +
    n.innerTensions.reduce((a, f) => a + join(f.headline, f.meaning), 0) +
    n.stressPatterns.reduce((a, f) => a + join(f.headline, f.meaning), 0) +
    join(...n.misunderstood, n.lifeStageNote, ...n.suggestions, ...n.scripts, n.closing);
  if (free + paid === 0) return 8;
  return Math.max(5, Math.min(45, Math.round((free / (free + paid)) * 100)));
}

// ---------- 输出类型 ----------

export interface NarrativeSection {
  id: string;
  title: string;
  /** free = 免费可见；paid = 解锁后可见 */
  access: "free" | "paid";
}

export interface DimensionReading {
  key: Dimension;
  label: string;
  score: number;
  confidence: number;
  bandLabel: string;
  summary: string;
  daily: string;
  watchOut?: string;
  /** 引用用户实际答过的题目情境 */
  evidenceQuotes: string[];
}

export interface SignalReading extends SignalCopy {
  id: string;
  confidence: number;
}

export interface FactReading {
  headline: string;
  meaning: string;
  risk?: string;
  strength?: string;
}

export interface SingleReportNarrative {
  /** 一句话画像（免费） */
  oneLiner: string;
  /** 开篇（免费）：心态呼应 + 语境 */
  opening: string;
  archetype: {
    name: string;
    essence: string;
    portrait: string;
    gift: string;
    blindSpot: string;
    recentTendency: string;
    tags: string[];
  };
  /** 核心需求（免费 1 条，其余付费） */
  coreNeeds: FactReading[];
  /** 优势（免费 1 条，其余付费） */
  strengths: FactReading[];
  /** 锁定的隐藏模式标题（免费只给标题） */
  lockedPattern?: { name: string };
  /** 以下为付费内容 */
  dimensions: DimensionReading[];
  signalPortrait: SignalReading[];
  innerTensions: FactReading[];
  stressPatterns: FactReading[];
  misunderstood: string[];
  lifeStageNote: string;
  suggestions: string[];
  scripts: string[];
  closing: string;
  qualityNote?: string;
}

const DIMENSIONS: Dimension[] = [
  "response_need",
  "expression",
  "space_need",
  "emotional_sensitivity",
  "conflict_urgency",
  "repair_orientation",
];

const BAND_LABEL: Record<string, string> = {
  high: "高",
  midHigh: "中高",
  mid: "中等",
  midLow: "中低",
  low: "低",
};

// ---------- 辅助 ----------

function factToReading(fact: ReportFact): FactReading {
  return {
    headline: fact.headline,
    meaning: fact.meaning,
    ...(fact.risk ? { risk: fact.risk } : {}),
    ...(fact.strength ? { strength: fact.strength } : {}),
  };
}

/** 从维度证据题里挑 1-2 道场景题，截取题面做共鸣引用 */
function evidenceQuotesFor(dimension: Dimension, result: AssessmentResult): string[] {
  const evidence = result.dimensionResults?.[dimension]?.evidence ?? [];
  const quotes: string[] = [];
  for (const qid of evidence) {
    const q = getQuestionById(qid);
    if (!q || q.phase === "consistency") continue;
    // 场景题优先——题面自带情境，引用最有共鸣
    const text = q.text.replace(/\n/g, " ").trim();
    const short = text.length > 60 ? text.slice(0, 57) + "…" : text;
    quotes.push(short);
    if (q.kind === "scenario" || quotes.length >= 2) break;
  }
  return quotes.slice(0, 2);
}

function triggeredSignals(result: AssessmentResult): SignalReading[] {
  const out: SignalReading[] = [];
  for (const [id, entry] of Object.entries(result.signals ?? {})) {
    if (!entry || entry.value === false || entry.value === 0) continue;
    // 精修文案优先，AI 批量生成文案兜底；两者都无的信号 id 不露出（避免英文标签）
    const copy = SIGNAL_COPY[id] ?? GENERATED_SIGNAL_COPY[id];
    if (!copy) continue;
    out.push({ id, confidence: entry.confidence ?? 60, ...copy });
  }
  // 置信度高者优先，最多展示 8 条（避免全量信号淹没阅读体验）
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

// ---------- 各章节生成 ----------

function buildOneLiner(result: AssessmentResult, context: Partial<AssessmentContext>): string {
  const archetype = ARCHETYPE_COPY[result.archetype];
  const scores = result.scores;
  const top = [...DIMENSIONS].sort((a, b) => scores[b] - scores[a])[0];
  const topCopy = DIMENSION_COPY[top];
  const essence = archetype?.essence ?? "你在关系里有自己独特的节奏。";
  return `你的关系画像是「${result.archetype}」——${essence}在你身上最明显的是${topCopy.label}这条线。`;
}

function buildOpening(result: AssessmentResult, context: Partial<AssessmentContext>): string {
  const parts: string[] = [];
  const name = context.nickname?.trim();
  const feeling = context.currentFeeling ? FEELING_COPY[context.currentFeeling] : undefined;
  if (feeling) parts.push(feeling.echo);
  const stage = context.relationshipStage ? STAGE_COPY[context.relationshipStage] : undefined;
  const duration = context.duration ? DURATION_COPY[context.duration] : undefined;
  if (duration) parts.push(duration);
  if (stage) parts.push(stage);
  const archetype = ARCHETYPE_COPY[result.archetype];
  if (archetype) {
    parts.push(
      `而你的答题结果指向一个很清晰的画像：${name ? `${name}，你` : "你"}是一个「${result.archetype}」。${archetype.essence}`
    );
  }
  return parts.join("\n\n");
}

function buildCoreNeeds(result: AssessmentResult, facts: ReportFacts): FactReading[] {
  const needs = [...facts.primary_needs, ...facts.secondary_needs].map(factToReading);
  if (needs.length > 0) return needs;
  // RRE 未命中（如低 RQI 兜底）：用最高两个维度生成
  const scores = result.scores;
  return [...DIMENSIONS]
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, 2)
    .map((dim) => {
      const copy = DIMENSION_COPY[dim];
      const band = copy.bands[bandOf(scores[dim])];
      return { headline: `${copy.label}：${BAND_LABEL[bandOf(scores[dim])]}`, meaning: band.summary + band.daily };
    });
}

function buildStrengths(result: AssessmentResult, facts: ReportFacts): FactReading[] {
  const strengths = facts.strengths.map(factToReading);
  const archetype = ARCHETYPE_COPY[result.archetype];
  if (archetype) {
    strengths.unshift({ headline: "你的底层优势", meaning: archetype.gift });
  }
  for (const f of facts.repair_resources.slice(0, 1)) strengths.push(factToReading(f));
  return strengths;
}

function buildLockedPattern(result: AssessmentResult, facts: ReportFacts): { name: string } | undefined {
  // 优先用内部矛盾的语义组命名
  const tension = facts.internal_tensions[0];
  if (tension && PATTERN_NAMES[tension.semanticGroup]) {
    return { name: PATTERN_NAMES[tension.semanticGroup] };
  }
  // 其次用信号组合
  for (const sig of Object.keys(result.signals ?? {})) {
    if (PATTERN_NAMES[sig] && result.signals[sig]?.value) return { name: PATTERN_NAMES[sig] };
  }
  if (tension) return { name: tension.headline };
  // 最终兜底：与「内部矛盾」章节的中间型张力兜底保持一致，保证免费页转化钩子始终存在
  return { name: "适应别人，还是说出自己" };
}

function buildDimensions(result: AssessmentResult): DimensionReading[] {
  return DIMENSIONS.map((key) => {
    const score = result.scores[key];
    const band = bandOf(score);
    const copy = DIMENSION_COPY[key];
    const bandCopy = copy.bands[band];
    const confidence = result.dimensionResults?.[key]?.confidence ?? 60;
    return {
      key,
      label: copy.label,
      score,
      confidence,
      bandLabel: BAND_LABEL[band],
      summary: bandCopy.summary,
      daily: bandCopy.daily,
      ...(bandCopy.watchOut ? { watchOut: bandCopy.watchOut } : {}),
      evidenceQuotes: evidenceQuotesFor(key, result),
    };
  });
}

function buildInnerTensions(result: AssessmentResult, facts: ReportFacts): FactReading[] {
  const tensions = facts.internal_tensions.map(factToReading);
  if (tensions.length > 0) return tensions;
  // 兜底：从维度组合推导经典张力
  const s = result.scores;
  const out: FactReading[] = [];
  if (s.response_need >= 60 && s.space_need >= 60) {
    out.push({
      headline: "既需要回应，又需要空间",
      meaning:
        "你身上存在一个看似矛盾的组合：你既需要对方的回应来确认关系，又需要自己的空间来保持节奏。这不矛盾——你的真实需求顺序是「先确定关系是安全的，再安心享受独立」。问题在于，这个逻辑对方未必看得懂：你靠近时 TA 觉得你粘人，你独处时 TA 觉得你冷淡。",
    });
  }
  if (s.emotional_sensitivity >= 60 && s.expression <= 45) {
    out.push({
      headline: "感知很多，表达很少",
      meaning:
        "你能敏锐地感觉到关系里的变化，但你很少把感受说出来。这造成一个不对等：你心里的信息量远远大于对方知道的。你在心里已经处理完了一整部剧，对方还以为一切如常。",
    });
  }
  if (s.conflict_urgency >= 60 && s.space_need >= 60) {
    out.push({
      headline: "想解决，又想逃开",
      meaning: "冲突发生时，你一部分想「马上说清楚」，另一部分想「先一个人待会儿」。这种拉扯本身就很消耗。",
    });
  }
  if (out.length === 0) {
    // 中间型画像的经典张力：适应与自我的拉扯
    out.push({
      headline: "适应别人，还是说出自己",
      meaning:
        "你很擅长顺着关系的状态调整自己——这是天赋，但也有代价：很多「我都可以」的时刻，你心里其实是有倾向的。久而久之，连你自己都可能分不清：哪些是真的无所谓，哪些是被你悄悄压下去的想要。",
    });
  }
  return out;
}

function buildStressPatterns(result: AssessmentResult, facts: ReportFacts): FactReading[] {
  const patterns = facts.stress_patterns.map(factToReading);
  if (patterns.length > 0) return patterns;
  // 兜底：从冲突/空间维度推导
  const s = result.scores;
  const out: FactReading[] = [];
  if (s.conflict_urgency >= 60) {
    out.push({
      headline: "压力下的你：急于解决",
      meaning: "压力来临时，你的第一反应是立刻处理——说清楚、问明白、消除不确定。这种模式的好处是问题不会过夜，风险是当对方还没准备好时，你的「快」会变成对方的「压力」。",
    });
  } else if (s.conflict_urgency <= 40) {
    out.push({
      headline: "压力下的你：先退后一步",
      meaning: "压力来临时，你本能地先退回自己的空间消化。这让你避免了很多情绪化升级，但也可能让伴侣觉得「你在回避」。一句「我需要点时间，但我会回来」能改变整个局面。",
    });
  } else {
    out.push({
      headline: "压力下的你：看情况而定",
      meaning: "你没有固定的压力应对模式——有时你想马上解决，有时你需要先缓缓。这取决于事情的性质和当时的状态。",
    });
  }
  return out;
}

function buildMisunderstood(result: AssessmentResult, facts: ReportFacts): string[] {
  const out: string[] = [];
  for (const f of facts.risk_patterns.slice(0, 2)) {
    out.push(`${f.headline}：${f.meaning}`);
  }
  if (out.length > 0) return out;
  // 兜底：从维度特征推导
  const s = result.scores;
  if (s.space_need >= 60) {
    out.push("你的「想一个人待会儿」很容易被理解为「你在疏远我」。实际上那只是你充电的方式，和感情浓度无关。");
  }
  if (s.expression <= 45 && s.emotional_sensitivity >= 55) {
    out.push("你在意的事比说出来的多得多。对方可能以为你「什么都不在乎」，其实你什么都看在眼里。");
  }
  if (s.response_need >= 65) {
    out.push("你对回应的在意可能被贴上「粘人」的标签。但你真正要的其实不是高频联系，而是确定感。");
  }
  if (s.conflict_urgency >= 65) {
    out.push("你的「现在就说清楚」可能被理解为「咄咄逼人」，但你的出发点只是「悬着比吵架更难受」。");
  }
  if (out.length === 0) {
    out.push("你比较平衡的风格有时会让对方拿不准你的真实想法——「你好像都可以」反而让人不知道你真正要什么。");
  }
  return out;
}

function buildLifeStageNote(context: Partial<AssessmentContext>): string {
  const parts: string[] = [];
  if (context.relationshipStage && STAGE_COPY[context.relationshipStage]) {
    parts.push(STAGE_COPY[context.relationshipStage]);
  }
  if (context.duration && DURATION_COPY[context.duration]) {
    parts.push(DURATION_COPY[context.duration]);
  }
  const lifeStageLabels: Record<string, string> = {
    student: "学生阶段的关系，时间和未来都还有很大的可塑性。",
    early_career: "事业起步阶段，精力分配本身就是关系的一部分。",
    career_intensive: "高强度工作期，关系的维护方式需要更「低功耗」但更确定。",
    cohabiting: "同居让很多东西从「想象」变成「日常」，摩擦点也会从大事变成小事。",
    newly_married: "新婚阶段是从「恋爱模式」切换到「合伙人模式」的关键期。",
    parent_infant: "有了宝宝之后，两个人的关系很容易被育儿完全挤占——这不是谁的错，是结构性的。",
    parent_school_age: "孩子上学后，家庭节奏固定下来，伴侣关系需要重新被「刻意安排」。",
    caregiver_for_parents: "照顾父母的阶段，你的情感带宽会被多方拉扯，关系里的耐心会变少。",
    empty_nest: "孩子离家后，两个人的关系重新回到「只有彼此」的状态——这既是机会也是考验。",
  };
  if (context.lifeStage && lifeStageLabels[context.lifeStage]) {
    parts.push(lifeStageLabels[context.lifeStage]);
  }
  return parts.join("");
}

function buildSuggestions(
  result: AssessmentResult,
  facts: ReportFacts,
  exclude: string[] = []
): string[] {
  const taken = new Set(exclude.map((t) => t.trim()));
  const out: string[] = [];
  const push = (t: string) => {
    const k = t.trim();
    if (!k || taken.has(k) || out.some((x) => x.trim() === k)) return;
    out.push(t);
  };

  // 首选：RRE 规则建议（去掉与「容易被误解」重复的）
  for (const f of facts.recommendations) push(`${f.headline}：${f.meaning}`);

  // 不足 3 条时按优先级补足（不用维度 watchOut——六维解读里已展示，避免跨章节重复）
  if (out.length < 3) {
    // 根据最突出的维度组合给一条具体可执行的建议
    const s = result.scores;
    if (s.emotional_sensitivity >= 60 && s.expression <= 50) {
      push("试试「三句话练习」：每天把一件你注意到但没说的感受，用三句话说给对方听。不求解决，只求被知道。");
    } else if (s.response_need >= 65) {
      push("和对方约定一个「确定感仪式」：不用高频联系，但每天有一个固定的、可预期的小连接（比如睡前一句话）。可预期性比频率更能安抚你。");
    } else if (s.conflict_urgency >= 60 && s.space_need < 55) {
      push("下次冲突想立刻解决时，先问一句：「你现在适合聊这个吗？如果不适合，你大概需要多久？」——把「马上」换成「确定的时间」，效果会好很多。");
    } else {
      push("找一个双方都不累的时机，把这份报告里「最像你」的一段读给对方听——这是成本最低的互相了解方式。");
    }
  }
  if (out.length < 3) {
    const archetype = ARCHETYPE_COPY[result.archetype];
    if (archetype) push(`关于你的盲区：${archetype.blindSpot}`);
  }
  return out.slice(0, 4);
}

function buildScripts(result: AssessmentResult, facts: ReportFacts): string[] {
  if (facts.communication_scripts.length > 0) return facts.communication_scripts.slice(0, 3);
  // 兜底：根据维度特征生成话术
  const s = result.scores;
  const scripts: string[] = [];
  if (s.space_need >= 60) {
    scripts.push("当你需要空间时：「我想自己待一会儿，不是因为你。给我大概 X 小时，我恢复好了会来找你。」");
  }
  if (s.response_need >= 60) {
    scripts.push("当你需要确认时：「我不是要你一直陪我，但如果你能告诉我大概什么时候方便聊，我会踏实很多。」");
  }
  if (s.expression <= 45) {
    scripts.push("当你不知道怎么开口时：「有件事我想了挺久的，不知道怎么说，但我想让你知道……」（写下来发出去也算）");
  }
  if (s.conflict_urgency >= 60) {
    scripts.push("当你想立刻解决冲突时：「我现在很想把这事聊开，但如果你需要缓缓，告诉我大概多久，我们约个时间认真聊。」");
  }
  if (s.repair_orientation >= 60) {
    scripts.push("当你想和好时：「那件事我还在意，但我更在意我们。等你方便的时候，我们把它聊开好吗？」");
  }
  if (scripts.length < 2) {
    scripts.push("当气氛不对时：「我感觉我们之间最近有点不一样，不一定是坏事，但我想跟你聊聊。」");
  }
  return scripts.slice(0, 3);
}

function buildClosing(result: AssessmentResult, context: Partial<AssessmentContext>): string {
  const feeling = context.currentFeeling ? FEELING_COPY[context.currentFeeling] : undefined;
  const parts: string[] = [];
  if (feeling) parts.push(feeling.closing);
  parts.push(
    "这份报告描述的「你」，只是这段关系里的一个侧面。同样的问题，换一个人、换一个阶段，答案可能都不一样。"
  );
  parts.push(
    "如果你想看到更完整的画面——你的模式如何和 TA 的模式互相触发、你们的互动循环卡在哪里——邀请 TA 也测一次。两个人的报告放在一起，才是真正的「关系地图」。"
  );
  return parts.join("\n\n");
}

// ---------- 主入口 ----------

export function buildSingleReportNarrative(
  result: AssessmentResult,
  facts: ReportFacts,
  context: Partial<AssessmentContext>
): SingleReportNarrative {
  const archetype = ARCHETYPE_COPY[result.archetype] ?? ARCHETYPE_COPY["平衡适应者"];
  const signals = triggeredSignals(result);
  const rqi = result.responseQuality?.rqi ?? 100;

  // 「容易被误解」与「具体建议」可能命中同一条 RRE 事实，这里先去重再组装
  const misunderstood = buildMisunderstood(result, facts);
  const suggestions = buildSuggestions(result, facts, misunderstood);

  const narrative: SingleReportNarrative = {
    oneLiner: buildOneLiner(result, context),
    opening: buildOpening(result, context),
    archetype: {
      name: result.archetype,
      essence: archetype.essence,
      portrait: archetype.portrait,
      gift: archetype.gift,
      blindSpot: archetype.blindSpot,
      recentTendency: archetype.recentTendency,
      tags: result.tags ?? [],
    },
    coreNeeds: buildCoreNeeds(result, facts),
    strengths: buildStrengths(result, facts),
    ...(buildLockedPattern(result, facts) ? { lockedPattern: buildLockedPattern(result, facts) } : {}),
    dimensions: buildDimensions(result),
    signalPortrait: signals.slice(0, 8),
    innerTensions: buildInnerTensions(result, facts),
    stressPatterns: buildStressPatterns(result, facts),
    misunderstood,
    lifeStageNote: buildLifeStageNote(context),
    suggestions,
    scripts: buildScripts(result, facts),
    closing: buildClosing(result, context),
  };

  if (rqi < 55) {
    narrative.qualityNote =
      "需要诚实告诉你：本次作答的质量指数偏低（可能存在快速作答或规律作答的情况），所以这份报告只保留了置信度较高的结论，建议你把它当作参考而非定论。如果愿意认真重测一次，报告的准确度会明显提升。";
  }

  return narrative;
}

// ---------- LLM 润色（P5） ----------

export interface PolishResult {
  narrative: SingleReportNarrative;
  /** 是否真的调用了 LLM 并成功改写 */
  applied: boolean;
  model?: string;
  /** 失败原因（仅用于日志/后台排查，不展示给用户） */
  error?: string;
}

export interface PolishItem {
  path: string;
  text: string;
}

/**
 * 只有"表达层"字段允许被改写。
 * 算法结论的载体（分数、ID、标签、bandLabel）与用户真实题面引用（evidenceQuotes）一律不动。
 */
function collectPolishItems(n: SingleReportNarrative): PolishItem[] {
  const items: PolishItem[] = [];
  const push = (path: string, text?: string) => {
    const t = (text ?? "").trim();
    if (t) items.push({ path, text: t });
  };
  const pushFact = (prefix: string, f: FactReading, i: number) => {
    push(`${prefix}.${i}.headline`, f.headline);
    push(`${prefix}.${i}.meaning`, f.meaning);
    push(`${prefix}.${i}.risk`, f.risk);
    push(`${prefix}.${i}.strength`, f.strength);
  };

  push("oneLiner", n.oneLiner);
  push("opening", n.opening);
  push("archetype.essence", n.archetype.essence);
  push("archetype.portrait", n.archetype.portrait);
  push("archetype.gift", n.archetype.gift);
  push("archetype.blindSpot", n.archetype.blindSpot);
  push("archetype.recentTendency", n.archetype.recentTendency);
  n.coreNeeds.forEach((f, i) => pushFact("coreNeeds", f, i));
  n.strengths.forEach((f, i) => pushFact("strengths", f, i));
  n.dimensions.forEach((d, i) => {
    push(`dimensions.${i}.summary`, d.summary);
    push(`dimensions.${i}.daily`, d.daily);
    push(`dimensions.${i}.watchOut`, d.watchOut);
  });
  n.signalPortrait.forEach((s, i) => {
    push(`signalPortrait.${i}.meaning`, s.meaning);
    push(`signalPortrait.${i}.recent`, s.recent);
  });
  n.innerTensions.forEach((f, i) => pushFact("innerTensions", f, i));
  n.stressPatterns.forEach((f, i) => pushFact("stressPatterns", f, i));
  n.misunderstood.forEach((t, i) => push(`misunderstood.${i}`, t));
  push("lifeStageNote", n.lifeStageNote);
  n.suggestions.forEach((t, i) => push(`suggestions.${i}`, t));
  n.scripts.forEach((t, i) => push(`scripts.${i}`, t));
  push("closing", n.closing);
  return items;
}

/** 按 path 写回，只接受原结构中已是字符串的叶子节点（防止 LLM 凭空造字段） */
function applyPolishItems(
  target: any,
  map: Record<string, unknown>
): number {
  let applied = 0;
  for (const [path, value] of Object.entries(map)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const parts = path.split(".");
    let node: any = target;
    let ok = true;
    for (let i = 0; i < parts.length - 1; i++) {
      node = node?.[parts[i]];
      if (node === undefined || node === null || typeof node !== "object") {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const last = parts[parts.length - 1];
    if (typeof node[last] === "string") {
      const polished = value.trim();
      // 护栏：润色结果不得引入英文标识——snake_case id 或连续英文单词
      // （原文案为纯中文；合法用法如「X 小时」为单字母，不会误伤）
      if (/[a-z]+(_[a-z]+)+\b/.test(polished) || /\b[a-zA-Z]{2,}\s+[a-zA-Z]{2,}/.test(polished)) {
        continue; // 拒绝这条润色，保留模板原文
      }
      node[last] = polished;
      applied += 1;
    }
  }
  return applied;
}

function parseJsonLoose(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const POLISH_SYSTEM_PROMPT = `你是一位擅长中文情感表达的报告撰稿人。用户会给你一组情感测评报告的文案片段，每段带唯一 path。

任务：在不改变任何事实、结论、判断方向的前提下，把每段文字改写得更温柔、更具体、更有画面感和共鸣感。

硬性要求：
1. 只改写表达方式。不得新增事实、不得删除信息、不得改变判断方向——例如原句说"偏高"，绝不能改成"偏低"；原句说"需要留意"，不能改成"没问题"。
2. 语言：中文，第二人称"你"。口吻克制、平实、有洞察，像一位懂你的朋友在安静地说话。
3. 禁止使用"亲爱的""宝贝""小可爱"等亲昵称呼；禁止堆砌感叹号；禁止鸡汤腔、说教和浮夸排比。
4. 每一段都必须重新遣词造句，不允许原样照抄（除非原文极短）。改写时保持原文的并列结构，不要重复或漏掉任何一个并列项。
5. 长度允许适度扩展（±30% 以内）。可以加入：
   - 具体的心理场景描写（"当对方说这句话时，你的反应是……"）
   - 内心的微动作（"你下意识地想……""你心里咯噔一下"）
   - 比喻或画面（"这种感觉像是……""你像是一个……"）
   但不要喧宾夺主、不要堆砌形容词。
6. 原句中的引号内容、数字、比例、专有名词、关系称谓必须原样保留。
7. 只输出严格的 JSON，格式为 {"items": {"<path>": "<改写后的文字>"}}，必须包含输入里的全部 path，不要输出任何解释文字。`;

export interface RunPolishResult {
  applied: boolean;
  model?: string;
  error?: string;
}

/**
 * 通用 LLM 润色引擎（单人/双人报告共用）：
 * 把 items（path → 原文）分块并发改写，按 path 写回 target 的字符串叶子。
 * 约束：LLM 只能改写表达，不能新增、修改或删除任何算法结论。
 * 失败/超时/未开启 → applied=false，target 原样不动，绝不阻塞出报告。
 */
export async function runPolishItems(
  target: any,
  items: PolishItem[],
  systemPrompt: string
): Promise<RunPolishResult> {
  // 三档降级（按优先级）：
  //   1. 没开 AI_POLISH_ENABLED → applied=false，error="disabled"，原样返回
  //   2. 缺 AI_API_KEY → 同上，error="missing_api_key"
  //   3. 任何块失败/超时 → 视为部分润色，把成功的写回，applied 视成功的量决定
  const enabled = (process.env.AI_POLISH_ENABLED ?? "").trim().toLowerCase() === "true";
  const apiKey = (process.env.AI_API_KEY ?? "").trim();
  if (!enabled) return { applied: false, error: "disabled" };
  if (!apiKey) return { applied: false, error: "missing_api_key" };
  if (items.length === 0) return { applied: false, error: "empty" };

  const baseUrl = (process.env.AI_BASE_URL || "https://api.lk888.ai/v1").replace(/\/+$/, "");
  const model = (process.env.AI_MODEL || "deepseek-v4-flash").trim();
  // 单块超时（不是总超时）：上游网关约 30s 会掐断连接，单块必须跑在阈值内
  const timeoutMs = Number(process.env.AI_POLISH_TIMEOUT_MS || 28000);
  const chunkSize = Number(process.env.AI_POLISH_CHUNK_SIZE || 12);
  const chunkChars = Number(process.env.AI_POLISH_CHUNK_CHARS || 1200);
  const concurrency = Number(process.env.AI_POLISH_CONCURRENCY || 4);

  const callChunk = async (
    chunkItems: PolishItem[]
  ): Promise<{ map: Record<string, unknown> | null; err?: string; status?: number }> => {
    const attempt = async (useJsonMode: boolean) => {
      try {
        const res = await postJson(
          `${baseUrl}/chat/completions`,
          { Authorization: `Bearer ${apiKey}` },
          {
            model,
            temperature: 0.8,
            max_tokens: 4096,
            ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: JSON.stringify({ items: chunkItems }) },
            ],
          },
          timeoutMs
        );
        if (res.status < 200 || res.status >= 300) {
          return { map: null, status: res.status, err: res.text.slice(0, 200) };
        }
        const data: any = parseJsonLoose(res.text);
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== "string") return { map: null, err: "empty_choice" };
        const parsed: any = parseJsonLoose(content);
        const map = (parsed?.items && typeof parsed.items === "object" ? parsed.items : parsed) as
          | Record<string, unknown>
          | null;
        if (!map || typeof map !== "object") return { map: null, err: "parse_failed" };
        return { map };
      } catch (e: any) {
        return { map: null, err: `${e?.name ?? "Error"}: ${String(e?.message ?? e).slice(0, 120)}` };
      }
    };

    let r = await attempt(true);
    // 4xx 说明模型不支持 JSON 模式 → 去掉 response_format 重试一次
    if (!r.map && r.status && r.status >= 400 && r.status < 500) {
      r = await attempt(false);
    } else if (!r.map && !r.status) {
      // 无 status = 网络层抖动（TLS/连接被重置）→ 稍等后重试一次
      await new Promise(res => setTimeout(res, 700));
      r = await attempt(true);
    }
    return r;
  };

  // 分块：同时受"条数"和"字符数"限制，保证每块都能在上游 30s 网关阈值内跑完
  const chunks: PolishItem[][] = [];
  let cur: PolishItem[] = [];
  let curChars = 0;
  for (const it of items) {
    if (cur.length > 0 && (cur.length >= chunkSize || curChars + it.text.length > chunkChars)) {
      chunks.push(cur);
      cur = [];
      curChars = 0;
    }
    cur.push(it);
    curChars += it.text.length;
  }
  if (cur.length > 0) chunks.push(cur);

  // 限并发跑，避免触发上游限流
  const merged: Record<string, unknown> = {};
  let failures = 0;
  let lastErr: string | undefined;
  let lastStatus: number | undefined;

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const settled = await Promise.all(batch.map(c => callChunk(c)));
    for (const r of settled) {
      if (r.map) Object.assign(merged, r.map);
      else {
        failures += 1;
        lastErr = r.err;
        lastStatus = r.status;
      }
    }
  }

  if (Object.keys(merged).length === 0) {
    const detail = `${lastStatus ?? "no-status"} ${lastErr ?? ""}`.trim();
    return { applied: false, model, error: `llm_call_failed: ${detail}` };
  }

  const applied = applyPolishItems(target, merged);
  return {
    applied: applied > 0,
    model,
    ...(failures > 0 ? { error: `partial: ${failures}/${chunks.length} chunk(s) failed` } : {}),
  };
}

/**
 * 用 LLM 润色单人叙事报告的表达层（runPolishItems 的单人外壳）。
 * 失败/超时/未开启 → 原样返回模板版，绝不阻塞出报告。
 */
export async function polishWithLLM(
  narrative: SingleReportNarrative
): Promise<PolishResult> {
  const items = collectPolishItems(narrative);
  const r = await runPolishItems(narrative, items, POLISH_SYSTEM_PROMPT);
  return { narrative, applied: r.applied, model: r.model, error: r.error };
}
