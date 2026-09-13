import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, addAnswer } from "@/lib/db";

const schema = z.object({
  questionId: z.string(),
  value: z.number().int().min(1).max(5),
  shownAt: z.number().int().optional(),
  answeredAt: z.number().int().optional(),
  responseTimeMs: z.number().int().nonnegative().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());

    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const allowedQuestionIds = new Set([
      ...session.question_ids,
      ...session.followup_ids,
    ]);
    if (!allowedQuestionIds.has(body.questionId)) {
      return NextResponse.json({ error: "题目不属于当前测评" }, { status: 400 });
    }

    await addAnswer(id, body.questionId, body.value, {
      shownAt: body.shownAt,
      answeredAt: body.answeredAt,
      responseTimeMs: body.responseTimeMs,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[assessments/answers] save failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `保存答案失败: ${message}` }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { getAnswers } = await import("@/lib/db");
    const answers = await getAnswers(id);

    return NextResponse.json({ answers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[assessments/answers] fetch failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `获取答案失败: ${message}` }, { status: 500 });
  }
}
