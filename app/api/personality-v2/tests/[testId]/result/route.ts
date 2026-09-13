import { NextResponse } from "next/server";
import {
  v2GetTest,
  v2ListTestsByVisitor,
} from "@/lib/personality/v2/db";
import { normalizeZScores } from "@/lib/personality/v2/scoring";
import { matchTop3 } from "@/lib/personality/v2/match";
import { buildFreeReport } from "@/lib/personality/v2/report";

/**
 * GET /api/personality-v2/tests/[testId]/result
 * 返回完成态的 freeReport（v2 没有付费版，free 就是完整版）。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const test = await v2GetTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status !== "completed") {
      return NextResponse.json(
        { error: "测试未完成", status: test.status },
        { status: 400 }
      );
    }
    if (
      test.g_score === undefined ||
      !test.top1_card_id ||
      !test.top2_card_id ||
      !test.top3_card_id
    ) {
      return NextResponse.json(
        { error: "报告数据缺失" },
        { status: 500 }
      );
    }

    const raw = {
      G: test.g_score,
      X: test.x_score!,
      I: test.i_score!,
      F: test.f_score!,
      S: test.s_score!,
      E: test.e_score!,
    };
    const z = normalizeZScores(raw);

    // match 用 z 重算（保证 vec 与卡片数据新版本一致；老的 cache 也兼容）
    const match = matchTop3(z);

    // 上次对比
    const allTests = await v2ListTestsByVisitor(test.visitor_id);
    const priorTests = allTests
      .filter(
        (t) => t.status === "completed" && t.id !== testId && t.top1_card_id
      )
      .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1));
    let previousInput: Parameters<typeof buildFreeReport>[0]["previous"];
    const lastTest = priorTests[0];
    if (lastTest && lastTest.g_score !== undefined) {
      previousInput = {
        raw_scores: {
          G: lastTest.g_score,
          X: lastTest.x_score!,
          I: lastTest.i_score!,
          F: lastTest.f_score!,
          S: lastTest.s_score!,
          E: lastTest.e_score!,
        },
        top1_card_id: lastTest.top1_card_id!,
        top1_card_name: lastTest.top1_card_id!,
        test_at: lastTest.completed_at!,
      };
    }

    const freeReport = buildFreeReport({
      raw,
      z,
      match,
      previous: previousInput,
    });

    return NextResponse.json({
      testId,
      paperId: test.paper_id,
      scores: raw,
      freeReport,
      isMixed: test.is_mixed ?? false,
    });
  } catch (error) {
    console.error("[personality-v2/result] failed:", error);
    const message =
      error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `获取报告失败: ${message}` },
      { status: 500 }
    );
  }
}
