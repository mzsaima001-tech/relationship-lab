import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidAnswer } from "@/lib/personality/types";
import { getPersonalityQuestionById } from "@/lib/content/store";
import { addPersonalityAnswer, getPersonalityTest } from "@/lib/db";

const schema = z.object({
  questionId: z.string().min(2).max(12),
  letter: z.enum(["A", "B", "C", "D", "E"]),
});

/**
 * POST /api/personality/tests/[testId]/answers
 * V3：保存单题答案（5 选项 A-E，分值已绑定在 options 上）
 * 同一 questionId 重复提交会覆盖（用于"上一题修改"功能）。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const { questionId, letter } = schema.parse(await request.json());

    const test = await getPersonalityTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status === "completed") {
      return NextResponse.json({ error: "测试已完成" }, { status: 400 });
    }

    if (!isValidAnswer(letter)) {
      return NextResponse.json({ error: "无效答案" }, { status: 400 });
    }

    const question = getPersonalityQuestionById(questionId);
    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // V3：optionIndex 0-4 + score 由 options 直接读
    const optionIndex = (["A", "B", "C", "D", "E"].indexOf(letter) as 0 | 1 | 2 | 3 | 4);
    const score = question.scores[optionIndex];

    await addPersonalityAnswer(
      testId,
      questionId,
      test.paper_id ?? question.paper,
      optionIndex,
      score,
      Date.now(),
      letter
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[personality answers] save failed:", error);
    const message =
      error instanceof Error ? `${error.message}` : "未知错误";
    return NextResponse.json(
      { error: `保存答案失败: ${message}` },
      { status: 500 }
    );
  }
}