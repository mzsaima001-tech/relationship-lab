// =====================================================
// 人格测试 v5 — 报告生成器（free / full）
// 不依赖 AI 润色，纯模板版本地生成（v5 沿用极简风）
// =====================================================

import type {
  V2RawScoreVector,
  V2ZScoreVector,
  V2MatchResult,
  V2FreeReport,
  V2FullReport,
  V2Dimension,
} from "./types";
import { V2_DIMENSIONS, V2_DIMENSION_META } from "./dimensions";
import { rawBandOf, V2_BAND_LABELS, pickTopDimensions, zToHundred } from "./scoring";

interface BuildReportInput {
  raw: V2RawScoreVector;
  z: V2ZScoreVector;
  match: V2MatchResult;
  /** localStorage 提升用：上一次测试结果 */
  previous?: {
    raw_scores: V2RawScoreVector;
    top1_card_id: string;
    top1_card_name: string;
    test_at: string;
  };
}

/**
 * 拼一句「共振判词」
 * 输入：Top1 + 主要维度 → 一段人话
 */
function composeCorLine(
  topName: string,
  topKey: string,
  topDims: Array<{ key: V2Dimension; z: number }>,
  isMixed: boolean
): string {
  if (isMixed) {
    return "你这六个方向都很均衡——没有一张主卡能独占你。这是个少见的状态，意味着你在不同的场景里会调出不同的自己。";
  }
  const [d1] = topDims;
  const dimCn = V2_DIMENSION_META[d1.key].cn;
  const dimHigh = V2_DIMENSION_META[d1.key].highLabel;
  return `你是「${topName}」，密钥是「${topKey}」——在${dimCn}那一面，你偏向${dimHigh.split("，")[0]}。`;
}

/** free 报告 */
export function buildFreeReport(input: BuildReportInput): V2FreeReport {
  const { raw, z, match, previous } = input;
  const top1 = match.top1;
  const top2 = match.top2;
  const top3 = match.top3;

  const topDimsAll = pickTopDimensions(z);
  const topDimsReport = topDimsAll.map(({ key, z }) => ({
    key,
    raw: raw[key],
    z,
    summary:
      raw[key] >= 22
        ? V2_DIMENSION_META[key].highLabel
        : raw[key] <= 14
        ? V2_DIMENSION_META[key].lowLabel
        : "整体偏中性，没有被任何一个方向拉走",
  }));

  const norm = zToHundred(z);

  let last_result_comparison: V2FreeReport["last_result_comparison"];
  if (previous) {
    last_result_comparison = {
      last_test_at: previous.test_at,
      last_top1_card_id: previous.top1_card_id,
      last_top1_card_name: previous.top1_card_name,
      diff_dimensions: V2_DIMENSIONS.map((d) => {
        const last = previous.raw_scores[d] ?? raw[d];
        return {
          key: d,
          last,
          now: raw[d],
          delta: Math.round((raw[d] - last) * 10) / 10,
        };
      }),
    };
  }

  return {
    top3: [
      {
        rank: 1,
        card_id: top1.card.id,
        card_name: top1.card.name,
        card_key: top1.card.key,
        card_line: top1.card.line,
        card_phase: top1.card.phase,
        card_phase_en: top1.card.phase_en,
        card_html: top1.card.html_path,
        sim: top1.sim,
        is_mixed_marker: match.isMixed,
      },
      {
        rank: 2,
        card_id: top2.card.id,
        card_name: top2.card.name,
        card_key: top2.card.key,
        card_line: top2.card.line,
        card_phase: top2.card.phase,
        card_phase_en: top2.card.phase_en,
        card_html: top2.card.html_path,
        sim: top2.sim,
        is_mixed_marker: false,
      },
      {
        rank: 3,
        card_id: top3.card.id,
        card_name: top3.card.name,
        card_key: top3.card.key,
        card_line: top3.card.line,
        card_phase: top3.card.phase,
        card_phase_en: top3.card.phase_en,
        card_html: top3.card.html_path,
        sim: top3.sim,
        is_mixed_marker: false,
      },
    ],
    raw_scores: raw,
    norm_scores: norm,
    top_dimensions: topDimsReport,
    last_result_comparison,
    cor_line: composeCorLine(
      top1.card.name,
      top1.card.key,
      topDimsAll,
      match.isMixed
    ),
    meta: {
      algorithm_version: "v5-moonphase-2026-09-13",
      is_mixed: match.isMixed,
      top1_sim: top1.sim,
      top2_sim: top2.sim,
      top3_sim: top3.sim,
    },
  };
}

/**
 * full 报告（仅 is_paid=true 时下发）
 * 在 free 基础上加：6 维度独立解读 + cor_long + 行动建议
 */
export function buildFullReport(input: BuildReportInput): V2FullReport {
  const free = buildFreeReport(input);
  const { raw, z, match } = input;

  const dimension_readings: V2FullReport["dimension_readings"] = {} as any;
  for (const d of V2_DIMENSIONS) {
    const meta = V2_DIMENSION_META[d];
    const band = rawBandOf(raw[d]);
    const label = V2_BAND_LABELS[band];
    dimension_readings[d] = {
      cn: meta.cn,
      level_label: label as any,
      analysis: `你在【${meta.cn}】这一面${label}。「${meta.highLabel.split("，")[0]}」——你不容易被这一面限制住。`,
      in_love: `亲密关系里，你偏向「${meta.highLabel.split("，")[0]}」。`,
      risk: `如果只看这一面，${meta.cn}太强有时会让你显得距离感略远。`,
    };
  }

  // cor_long：3-6 段，每段 100-200 字
  const cor_long =
    `你是「${match.top1.card.name}」——按这个月相，你的气质最贴近这张卡片。\n\n` +
    `密钥是「${match.top1.card.key}」：${match.top1.card.line}\n\n` +
    `你的【${pickTopDimensions(z)[0].key}】那一面最显著，意味着在亲密关系里，这是你最自然的姿态。\n\n` +
    `但你并不是被这一张卡定义的：「${match.top2.card.name}」和「${match.top3.card.name}」都离你不远。` +
    `在不同场景里，你会调出不同的自己——这是「30 张月相卡」共存的本质。\n\n` +
    `高 / 低分的方向都会在某个时刻被你用到。如果你想看极化到极端的另一面，「${match.top3.card.name}」就是你最远的那张同路人。`;

  return {
    ...free,
    dimension_readings,
    cor_long,
    action_suggestions: [
      `把 6 个维度的【高分】方向当作你自己的本能；【低分】方向当作你还不会调用的姿势。`,
      `Top1 是你现在的样子，Top3 是你还没完全用上的自己——下次想和伴侣或关系里的人聊自己，可以拿这三张卡轮流说。`,
      `如果 Top1 和 Top3 离得很远，意味着你的「另一面」比你以为的要大；试着在某种小情境里用 Top3 的姿态。`,
    ],
  };
}
