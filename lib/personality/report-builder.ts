// =====================================================
// 人格测试 V3 报告生成器（共享给 complete + result 路由）
//
// 一次生成 freeReport + fullReport：
//   - freeReport：主卡 + Top3 + 6 维解读 + 简版叙事（含 V1 兼容字段）
//   - fullReport：完整版 16 个 section（surfaceVsReal/contradictions/...）+ 完整叙事
//
// 数据源：用户 6 维 norm 分数 + Top3 月相卡对象 + 维度排序
// 不依赖任何 LLM（polish_status = "local-template"）
// =====================================================

import {
  PERSONALITY_DIMENSIONS,
  PERSONALITY_DIMENSION_META,
  PERSONALITY_V3_TO_V1_DIM,
  type PersonalityDimension,
  type PersonalityCard,
  type PersonalityFreeReport,
  type PersonalityFullReport,
  type PersonalityMatchResult,
} from "./types";
import { dimensionBand } from "./scoring";

// V3 secondary/hidden 在 V1 schema 里变成了 `{name, description}` 的简化形态；
// 故此处 Omit 掉 V3 的同名字段，避免与 V1 secondary/hidden 冲突。
// top3 里仍保留了完整 PersonalityCard 对象，可按需取。
export interface FullReportWithV1Compat extends Omit<PersonalityFullReport, "secondary" | "hidden"> {
  // V1 兼容字段（让完整报告页能直接渲染 v1 schema 的 30+ 字段）
  primaryTagline: string;
  scores: Record<string, number>;
  topDimensions: Array<{ key: PersonalityDimension; score: number; summary: string }>;
  coreStrength: { title: string; description: string };
  primary: { name: string; description: string };
  secondary: { name: string; description: string };
  hidden: { name: string; description: string };
  surfaceVsReal: { surface: string; real: string };
  contradictions: string[];
  strengths: Array<{ title: string; description: string }>;
  blindSpots: Array<{ title: string; description: string }>;
  triggers: { whatIrritates: string; whatDisappoints: string; whatLosesPatience: string; howYouHandle: string };
  stress: { mild: string; moderate: string; high: string };
  relationships: { makingFriends: string; buildingTrust: string; handlingConflict: string; endingRelationships: string };
  intimacy: { attractedTo: string; expressingLove: string; needsInLove: string; commonConflicts: string };
  career: { suitable: string; unsuitable: string; workStyle: string; decisionStyle: string; executionStyle: string };
  leadership: string;
  moneyAndRisk: string;
  growth: string[];
  summary: string;
}

function dimensionNote(dim: PersonalityDimension, norm: number): string {
  const meta = PERSONALITY_DIMENSION_META[dim];
  const band = dimensionBand(norm);
  const tag = `${meta.cn}（${meta.en}）`;
  if (band === "high") return `高 ${tag}：${meta.highLabel}。`;
  if (band === "midHigh") return `中高 ${tag}：${meta.highLabel}，但仍有保留余地。`;
  if (band === "mid") return `中性 ${tag}：在两端之间，因情境而动。`;
  if (band === "midLow") return `中低 ${tag}：${meta.lowLabel}，但已能慢慢表达。`;
  return `收敛 ${tag}：${meta.lowLabel}。`;
}

function buildNarrative(
  mainCard: PersonalityCard,
  dimSummary: Record<PersonalityDimension, { score: number; band: string; note: string }>,
  isMixed: boolean,
): string {
  const top = dimSummary;
  const sorted = PERSONALITY_DIMENSIONS.slice().sort((a, b) => top[b].score - top[a].score);
  const hi = sorted[0]!;
  const second = sorted[1]!;
  const hiMeta = PERSONALITY_DIMENSION_META[hi];
  const secondMeta = PERSONALITY_DIMENSION_META[second];

  const lines: string[] = [];
  if (isMixed) {
    lines.push("你在六个方向上都很均衡，没有一张月相能完整描述你——这是你的特点，不是缺陷。");
  } else {
    lines.push(`你的核心月相是「${mainCard.name}」。`);
    lines.push(mainCard.line);
  }
  lines.push("");
  lines.push(`最显眼的两端：${hiMeta.cn} ${top[hi].score} · ${secondMeta.cn} ${top[second].score}。`);
  lines.push(hiMeta.lowLabel + " / " + hiMeta.highLabel);
  lines.push("");
  lines.push("这是一份走完 36 个瞬间之后的初稿，免费版先给你看到核心月相与 6 维轮廓。");
  lines.push("完整版会补上：判词展开、影子卡、相邻过渡卡，以及「如何让这条月相更稳定」的行动建议。");
  return lines.join("\n");
}

export function buildFreeReport(
  userScore: Record<PersonalityDimension, number>,
  matchResult: PersonalityMatchResult,
): PersonalityFreeReport {
  const dimSummary = {} as PersonalityFreeReport["dimension_summary"];
  for (const d of PERSONALITY_DIMENSIONS) {
    const score = Math.round(userScore[d]);
    dimSummary[d] = {
      score,
      band: dimensionBand(score),
      note: dimensionNote(d, score),
    };
  }
  const narrative = buildNarrative(matchResult.top1.card, dimSummary, matchResult.is_mixed);
  return {
    main_card: matchResult.top1.card,
    top3: [
      { card_id: matchResult.top1.card.id, similarity: matchResult.top1.similarity, card: matchResult.top1.card },
      { card_id: matchResult.top2.card.id, similarity: matchResult.top2.similarity, card: matchResult.top2.card },
      { card_id: matchResult.top3.card.id, similarity: matchResult.top3.similarity, card: matchResult.top3.card },
    ],
    dimension_summary: dimSummary,
    narrative,
    report_version: "moonphase",
    generated_at: new Date().toISOString(),
    primaryTagline: matchResult.top1.card.line,
    scores: Object.fromEntries(
      PERSONALITY_DIMENSIONS.map(d => [d, dimSummary[d].score])
    ) as unknown as Record<string, number>,
    topDimensions: PERSONALITY_DIMENSIONS
      .slice()
      .sort((a, b) => dimSummary[b].score - dimSummary[a].score)
      .slice(0, 2)
      .map(d => ({ key: d, score: dimSummary[d].score, summary: dimSummary[d].note })),
    coreStrength: {
      title: matchResult.top1.card.name,
      description: matchResult.top1.card.line,
    },
  };
}

export function buildFullReport(
  userScore: Record<PersonalityDimension, number>,
  matchResult: PersonalityMatchResult,
): FullReportWithV1Compat {
  const dimSummary = {} as FullReportWithV1Compat["dimension_summary"];
  for (const d of PERSONALITY_DIMENSIONS) {
    const score = Math.round(userScore[d]);
    dimSummary[d] = { score, band: dimensionBand(score), note: dimensionNote(d, score) };
  }

  const main = matchResult.top1.card;
  const sec = matchResult.top2.card;
  const hid = matchResult.top3.card;

  // V1 scores 字典（social/risk/...）
  const v1Scores: Record<string, number> = {};
  for (const d of PERSONALITY_DIMENSIONS) {
    v1Scores[PERSONALITY_V3_TO_V1_DIM[d]] = Math.round(userScore[d]);
  }

  const sortedDims = PERSONALITY_DIMENSIONS
    .map(d => ({ dim: d, score: dimSummary[d].score }))
    .sort((a, b) => b.score - a.score);

  const top1 = sortedDims[0]!;
  const top2 = sortedDims[1]!;
  const bot1 = sortedDims[sortedDims.length - 1]!;
  const bot2 = sortedDims[sortedDims.length - 2]!;

  const topDimensions = [top1, top2].map(t => ({
    key: t.dim,
    score: t.score,
    summary: dimSummary[t.dim].note,
  }));

  // contradictions：最高维与最低维的张力
  const contradictions: string[] = [];
  for (let i = 0; i < sortedDims.length; i++) {
    for (let j = i + 1; j < sortedDims.length; j++) {
      const a = sortedDims[i]!;
      const b = sortedDims[j]!;
      const gap = a.score - b.score;
      if (gap >= 40) {
        const aMeta = PERSONALITY_DIMENSION_META[a.dim];
        const bMeta = PERSONALITY_DIMENSION_META[b.dim];
        contradictions.push(
          `${aMeta.cn} ${a.score} 与 ${bMeta.cn} ${b.score}：一边要表达，一边要安静，常常在「说不说」之间犹豫。`
        );
      }
    }
  }
  if (contradictions.length === 0) {
    contradictions.push(
      "你的六维之间没有特别大的裂缝，所以很少陷入内在冲突——这也是一种少见的平整。"
    );
  }

  const strengths = [top1, top2].map(t => ({
    title: `${PERSONALITY_DIMENSION_META[t.dim].cn} ${t.score}`,
    description: dimSummary[t.dim].note,
  }));

  const blindSpots = [bot1, bot2].map(t => ({
    title: `${PERSONALITY_DIMENSION_META[t.dim].cn} ${t.score}`,
    description: dimSummary[t.dim].note,
  }));

  const triggers = {
    whatIrritates: `你最受不了「被忽视自己的${PERSONALITY_DIMENSION_META[bot1.dim].cn}」——那是一种不在场的感觉。`,
    whatDisappoints: `让你失望的是「明明承诺过的事最后没做」——这种落差在你的${PERSONALITY_DIMENSION_META[top2.dim].cn}上反应最明显。`,
    whatLosesPatience: `遇到绕来绕去不直说的事，你的${PERSONALITY_DIMENSION_META[bot1.dim].cn}会先于理性表态。`,
    howYouHandle: `你会先退一步不说话（${PERSONALITY_DIMENSION_META[bot1.dim].cn}），等情绪过了再决定要不要把事情讲清楚（${PERSONALITY_DIMENSION_META[top1.dim].cn}）。`,
  };

  const stress = {
    mild: `轻度压力下，你会靠${PERSONALITY_DIMENSION_META[top1.dim].cn}稳住自己，先把手头的事处理完。`,
    moderate: `中度压力下，你的${PERSONALITY_DIMENSION_META[bot2.dim].cn}开始收紧——话变少，行动变慢。`,
    high: `高度压力下，${PERSONALITY_DIMENSION_META[bot1.dim].cn}会先崩，你需要一段不被打扰的安静。`,
  };

  const relationships = {
    makingFriends: `你交朋友不靠量，靠「能聊几句真话」的节奏——你的${PERSONALITY_DIMENSION_META[top2.dim].cn}决定了谁来、谁留。`,
    buildingTrust: `信任的建立对你来说是慢的事，你的${PERSONALITY_DIMENSION_META[bot2.dim].cn}决定了对方需要多久才被允许靠近。`,
    handlingConflict: `冲突出现时你倾向${PERSONALITY_DIMENSION_META[bot1.dim].cn}——先按住、看清楚再决定要不要回击。`,
    endingRelationships: `结束一段关系对你来说也是慢的，你的${PERSONALITY_DIMENSION_META[top1.dim].cn}会帮你把这段距离走完。`,
  };

  const intimacy = {
    attractedTo: `你会被「能陪你安静、又不强迫你开口」的人吸引——这是你的${PERSONALITY_DIMENSION_META[top1.dim].cn}在选。`,
    expressingLove: `表达爱时你更偏${PERSONALITY_DIMENSION_META[bot2.dim].cn}——做给你看而不是说给你听。`,
    needsInLove: `你在亲密关系里最需要的是「不用解释自己」的自在感——这是${PERSONALITY_DIMENSION_META[top2.dim].cn}的位置。`,
    commonConflicts: `最常见的冲突是「你要的回应速度」和「对方给的回应速度」之间的差——这是你的${PERSONALITY_DIMENSION_META[bot1.dim].cn}在卡。`,
  };

  const career = {
    suitable: `适合需要${PERSONALITY_DIMENSION_META[top1.dim].cn}与${PERSONALITY_DIMENSION_META[top2.dim].cn}同时发力的工作。`,
    unsuitable: `不适合纯靠${PERSONALITY_DIMENSION_META[bot1.dim].cn}吃饭的环境——会被快速消耗。`,
    workStyle: `你的工作节奏是「先把地基打稳，再往上盖」——这是${PERSONALITY_DIMENSION_META[top2.dim].cn}在工作里的样子。`,
    decisionStyle: `决策时你会反复想——这是${PERSONALITY_DIMENSION_META[bot1.dim].cn}在给你兜底。`,
    executionStyle: `执行时偏${PERSONALITY_DIMENSION_META[top1.dim].cn}：一旦决定就一路推到完成。`,
  };

  const leadership = `你带的不是人，是节奏——你的${PERSONALITY_DIMENSION_META[top1.dim].cn}决定了团队的步调，${PERSONALITY_DIMENSION_META[top2.dim].cn}决定了别人愿不愿意跟。`;

  const moneyAndRisk = `在钱和风险上，你倾向「稳中带一点冒险」——这是${PERSONALITY_DIMENSION_META[top1.dim].cn} ${dimSummary[top1.dim].score} 与 ${PERSONALITY_DIMENSION_META[bot1.dim].cn} ${dimSummary[bot1.dim].score} 的对位结果。`;

  const growth = [
    `给${PERSONALITY_DIMENSION_META[bot1.dim].cn}留一条「被人听见」的路，不必每次都自己消化。`,
    `把${PERSONALITY_DIMENSION_META[top1.dim].cn}有意识收到 7 分——满格的它会让你忽略别人的节奏。`,
    `每月给自己留一段不被任何人打断的时间，让${PERSONALITY_DIMENSION_META[bot2.dim].cn}重新校准。`,
  ];

  const summary = buildNarrative(main, dimSummary, matchResult.is_mixed);

  return {
    main_card: main,
    top3: [
      { card_id: main.id, similarity: matchResult.top1.similarity, card: main },
      { card_id: sec.id, similarity: matchResult.top2.similarity, card: sec },
      { card_id: hid.id, similarity: matchResult.top3.similarity, card: hid },
    ],
    dimension_summary: dimSummary,
    narrative: summary,
    report_version: "moonphase",
    polish_status: "local-template",
    generated_at: new Date().toISOString(),
    primaryTagline: main.line,
    scores: v1Scores,
    topDimensions,
    coreStrength: { title: main.name, description: main.line },
    primary: { name: main.name, description: main.line },
    secondary: { name: sec.name, description: sec.line },
    hidden: { name: hid.name, description: hid.line },
    surfaceVsReal: {
      surface: `别人多半先看到你的「${main.name}」这张表层月相。`,
      real: `但你自己清楚——真正撑起你的，是${main.line}`,
    },
    contradictions,
    strengths,
    blindSpots,
    triggers,
    stress,
    relationships,
    intimacy,
    career,
    leadership,
    moneyAndRisk,
    growth,
    summary,
  };
}