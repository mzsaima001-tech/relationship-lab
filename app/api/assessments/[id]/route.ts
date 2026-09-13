import { NextResponse } from "next/server";
import { getSession, getAnswers, getResult } from "@/lib/db";
import { getQuestionById } from "@/lib/content/store";
import type { Question } from "@/lib/assessment/types";

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

    // Check if already has results
    const result = await getResult(id);

    const questions: Question[] = session.question_ids
      .map((qid) => getQuestionById(qid))
      .filter(Boolean) as Question[];

    const followupQuestions: Question[] = session.followup_ids
      .map((qid) => getQuestionById(qid))
      .filter(Boolean) as Question[];

    // Get existing answers
    const answers = await getAnswers(id);
    const answerMap = new Map(answers.map((a) => [a.question_id, a.value]));

    return NextResponse.json({
      sessionId: id,
      status: session.status,
      nickname: session.nickname,
      initialQuestions: questions,
      followupQuestions,
      answeredIds: Array.from(answerMap.keys()),
      hasResult: Boolean(result),
    });
  } catch (error) {
    console.error("[assessments/[id] GET] error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    // 暴露错误细节便于排查（生产环境保留字段供前端调试显示，不泄露堆栈）
    return NextResponse.json(
      { error: "Failed to fetch session", detail: message },
      { status: 400 }
    );
  }
}
