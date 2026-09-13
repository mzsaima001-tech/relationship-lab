import { NextResponse } from "next/server";
import { z } from "zod";
import {
  v2AddAnswer,
  v2GetTest,
} from "@/lib/personality/v2/db";
import { getPaperById } from "@/lib/personality/v2/papers";

const schema = z.object({
  questionId: z.string().min(2).max(8),
  optionIndex: z.number().int().min(0).max(4),
});

/**
 * POST /api/personality-v2/tests/[testId]/answers
 * 保存单题答案（optionIndex 0..4，后端查 paper 拿到该题该选项的 score 落库）。
 * 同 questionId 重复提交覆盖（用于回退修改）。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const { questionId, optionIndex } = schema.parse(await request.json());

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

    const q = paper.questions.find((x) => x.id === questionId);
    if (!q) {
      return NextResponse.json(
        { error: `题目 ${questionId} 不在 paper ${test.paper_id} 中` },
        { status: 404 }
      );
    }
    const opt = q.options[optionIndex];
    if (!opt) {
      return NextResponse.json(
        { error: `选项 ${optionIndex} 越界` },
        { status: 400 }
      );
    }

    await v2AddAnswer(testId, questionId, optionIndex, opt.score, Date.now());

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数无效", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[personality-v2/answers] save failed:", error);
    const message =
      error instanceof Error ? `${error.message}` : "未知错误";
    return NextResponse.json(
      { error: `保存答案失败: ${message}` },
      { status: 500 }
    );
  }
}
