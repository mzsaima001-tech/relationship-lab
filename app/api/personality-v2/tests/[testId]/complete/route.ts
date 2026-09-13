import { NextResponse } from "next/server";
import {
  v2GetTest,
  v2GetAnswers,
  v2UpdateTest,
  v2ListTestsByVisitor,
} from "@/lib/personality/v2/db";
import { getPaperById } from "@/lib/personality/v2/papers";
import { computeRawScores, normalizeZScores } from "@/lib/personality/v2/scoring";
import { matchTop3 } from "@/lib/personality/v2/match";
import { buildFreeReport } from "@/lib/personality/v2/report";

export const dynamic = "force-dynamic";

/**
 * POST /api/personality-v2/tests/[testId]/complete
 * 计算 raw + z + Top3 + free_report，写库后立即返回。
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const test = await v2GetTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status === "completed") {
      return NextResponse.json({ error: "测试已完成" }, { status: 400 });
    }

    const paper = getPaperById(test.paper_id);
    if (!paper) {
      return NextResponse.json(
        { error: `paper ${test.paper_id} 不在题库中` },
        { status: 500 }
      );
    }

    const answers = await v2GetAnswers(testId);
    if (answers.length < paper.total) {
      return NextResponse.json(
        {
          error: "题目未全部完成",
          answered: answers.length,
          required: paper.total,
        },
        { status: 400 }
      );
    }

    // 1. 原始分（按 dim 累加）
    const optMap: Record<string, number> = {};
    for (const a of answers) optMap[a.question_id] = a.option_index;
    const raw = computeRawScores(paper, optMap);

    // 2. z-score
    const z = normalizeZScores(raw);

    // 3. Top3 + 混合型
    const match = matchTop3(z);

    // 4. 上次结果（localStorage 提升用）— 读同一 visitor 最近一个 completed test
    const allTests = await v2ListTestsByVisitor(test.visitor_id);
    const priorTests = allTests
      .filter((t) => t.status === "completed" && t.id !== testId)
      .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1));
    const lastTest = priorTests[0];
    let previousInput: Parameters<typeof buildFreeReport>[0]["previous"];
    if (
      lastTest &&
      lastTest.g_score !== undefined &&
      lastTest.top1_card_id
    ) {
      previousInput = {
        raw_scores: {
          G: lastTest.g_score,
          X: lastTest.x_score!,
          I: lastTest.i_score!,
          F: lastTest.f_score!,
          S: lastTest.s_score!,
          E: lastTest.e_score!,
        },
        top1_card_id: lastTest.top1_card_id,
        top1_card_name: lastTest.top1_card_id,
        test_at: lastTest.completed_at!,
      };
    }

    // 5. free 报告
    const freeReport = buildFreeReport({
      raw,
      z,
      match,
      previous: previousInput,
    });

    // 6. 写库（status=completed + 6 维 + Top3 + is_mixed）
    await v2UpdateTest(testId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      g_score: raw.G,
      x_score: raw.X,
      i_score: raw.I,
      f_score: raw.F,
      s_score: raw.S,
      e_score: raw.E,
      top1_card_id: match.top1.card.id,
      top2_card_id: match.top2.card.id,
      top3_card_id: match.top3.card.id,
      top1_sim: match.top1.sim,
      top2_sim: match.top2.sim,
      top3_sim: match.top3.sim,
      is_mixed: match.isMixed,
    });

    return NextResponse.json({
      testId,
      paperId: test.paper_id,
      scores: raw,
      freeReport,
    });
  } catch (error) {
    console.error("[personality-v2/complete] failed:", error);
    const message =
      error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `完成测试失败: ${message}` },
      { status: 500 }
    );
  }
}
