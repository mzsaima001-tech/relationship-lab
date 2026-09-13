import { NextResponse } from "next/server";
import {
  v2GetTest,
  v2GetAnswers,
} from "@/lib/personality/v2/db";
import { getPaperById } from "@/lib/personality/v2/papers";

/**
 * GET /api/personality-v2/tests/[testId]/questions
 * 返回本场测试抽到的 paper 全部题目（不含 score，防作弊）。
 * 客户端 0..4 选 option，前端在答完时只提交 option_index，后端用 score 落库。
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
    const paper = getPaperById(test.paper_id);
    if (!paper) {
      return NextResponse.json(
        { error: `paper ${test.paper_id} 不在题库中` },
        { status: 500 }
      );
    }

    const answered = await v2GetAnswers(testId);
    const answeredMap: Record<string, number> = {};
    for (const a of answered) {
      answeredMap[a.question_id] = a.option_index;
    }

    return NextResponse.json({
      testId: test.id,
      paperId: test.paper_id,
      total: paper.total,
      // 隐藏 score 字段，前端不能预估自己拿几分
      questions: paper.questions.map((q) => ({
        id: q.id,
        dim: q.dim,
        stem: q.stem,
        options: q.options.map((o, idx) => ({ idx, text: o.text })),
      })),
      answered: answeredMap,
    });
  } catch (error) {
    console.error("[personality-v2/questions] failed:", error);
    const message =
      error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `获取题目失败: ${message}` },
      { status: 500 }
    );
  }
}
