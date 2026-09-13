import { NextResponse } from "next/server";
import { matchCards } from "@/lib/personality/match";
import { PERSONALITY_CARDS } from "@/lib/personality/cards";
import {
  PERSONALITY_DIMENSIONS,
  type PersonalityDimension,
} from "@/lib/personality/types";
import { getPersonalityTest } from "@/lib/db";
import { buildFreeReport, buildFullReport } from "@/lib/personality/report-builder";

/**
 * GET /api/personality/tests/[testId]/result
 * V3：返回免费版（已付款返回完整版）。
 * 缓存：complete 时已写 free_report_cache + full_report_cache，优先读缓存。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const test = await getPersonalityTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status !== "completed") {
      return NextResponse.json(
        { error: "测试未完成", status: test.status },
        { status: 400 }
      );
    }

    // 验证 V3 6 维字段齐全
    if (
      test.g_score === undefined ||
      test.x_score === undefined ||
      test.i_score === undefined ||
      test.f_score === undefined ||
      test.s_score === undefined ||
      test.e_score === undefined
    ) {
      return NextResponse.json({ error: "报告数据缺失" }, { status: 500 });
    }

    // V3 6 维分数（强制整数，兜底历史脏数据浮点）
    const scores: Record<PersonalityDimension, number> = {
      G: Math.round(test.g_score ?? 50),
      X: Math.round(test.x_score ?? 50),
      I: Math.round(test.i_score ?? 50),
      F: Math.round(test.f_score ?? 50),
      S: Math.round(test.s_score ?? 50),
      E: Math.round(test.e_score ?? 50),
    };

    // 重算 match（如果缓存里有 top1/top2/top3 card_id，直接信任缓存否则重算）
    const matchResult = matchCards(
      PERSONALITY_DIMENSIONS.map(d => scores[d]),
      PERSONALITY_CARDS
    );

    const freeReport = (test.free_report_cache as any) ?? buildFreeReport(scores, matchResult);
    const polish = {
      status: test.polish_status ?? "local-template",
      applied: test.polish_status === "ai-polished",
      model: test.polish_model,
      promptVersion: test.polish_prompt_version,
      elapsedMs: test.polish_elapsed_ms,
      ...(test.polish_error ? { error: test.polish_error } : {}),
    };

    const shareCredit = {
      shares: test.shares_count ?? 0,
      unlockedViaShare: !!test.unlocked_via_share,
      shareCode: test.share_code,
    };

    const types = {
      primary: { id: matchResult.top1.card.id, name: matchResult.top1.card.name, similarity: matchResult.top1.similarity, card: matchResult.top1.card },
      secondary: { id: matchResult.top2.card.id, name: matchResult.top2.card.name, similarity: matchResult.top2.similarity, card: matchResult.top2.card },
      hidden: { id: matchResult.top3.card.id, name: matchResult.top3.card.name, similarity: matchResult.top3.similarity, card: matchResult.top3.card },
    };

    if (!test.is_paid) {
      return NextResponse.json({
        testId,
        scores,
        types,
        freeReport,
        paid: false,
        fullReport: null,
        polish,
        shareCredit,
      });
    }

    const fullReport = (test.full_report_cache as any) ?? buildFullReport(scores, matchResult);

    return NextResponse.json({
      testId,
      scores,
      types,
      freeReport,
      paid: true,
      fullReport,
      polish,
      shareCredit,
    });
  } catch (error) {
    console.error("[personality/result] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `获取报告失败: ${message}` }, { status: 500 });
  }
}