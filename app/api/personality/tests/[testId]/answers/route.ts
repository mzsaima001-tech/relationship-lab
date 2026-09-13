import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidAnswer } from "@/lib/personality/questions";
import { ANSWER_VALUES } from "@/lib/personality/types";
import { getPersonalityQuestionById } from "@/lib/content/store";
import { addPersonalityAnswer, getPersonalityTest } from "@/lib/db";

const schema = z.object({
  questionId: z.string().min(2).max(8),
  letter: z.enum(["A", "B", "C", "D"]),
});

/**
 * POST /api/personality/tests/[testId]/answers
 * 保存单题答案（自动处理 reverse）。
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
    if (!question || !question.active) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // reverse 处理：反向题用 5 - raw
    const raw = ANSWER_VALUES[letter];
    const calculated = question.reverse ? 5 - raw : raw;

    await addPersonalityAnswer(
      testId,
      questionId,
      letter,
      calculated,
      Date.now()
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