import { NextResponse } from "next/server";
import { getSession, getAnswers, updateSession } from "@/lib/db";
import {
  getQuestionById,
  getFollowupQuestions,
} from "@/lib/content/store";
import { calculateScores } from "@/lib/assessment/score";
import { deriveSignals } from "@/lib/assessment/signals";
import { chooseFollowups } from "@/lib/assessment/followups";
import type { Answer, AssessmentContext, Question } from "@/lib/assessment/types";

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

    if (session.followup_ids && session.followup_ids.length > 0) {
      const followups = session.followup_ids
        .map(qid => getQuestionById(qid))
        .filter((question): question is Question => Boolean(question));
      return NextResponse.json({ followups });
    }

    const answerRecords = await getAnswers(id);
    const questions = session.question_ids
      .map(qid => getQuestionById(qid))
      .filter((question): question is Question => Boolean(question));

    const answers: Answer[] = answerRecords.map(answer => ({
      questionId: answer.question_id,
      value: answer.value,
      shownAt: answer.shown_at,
      answeredAt: answer.answered_at,
      responseTimeMs: answer.response_time_ms,
    }));

    const scores = calculateScores(questions, answers);
    const signals = deriveSignals(scores, questions, answers);
    const context: AssessmentContext = {
      nickname: session.nickname,
      ageBand: session.age_band as AssessmentContext["ageBand"],
      lifeStage: session.life_stage as AssessmentContext["lifeStage"],
      gender: session.gender as AssessmentContext["gender"],
      partnerGender: session.partner_gender as AssessmentContext["partnerGender"],
      relationshipType: session.relationship_type as AssessmentContext["relationshipType"],
      relationshipStage: session.relationship_stage as AssessmentContext["relationshipStage"],
      duration: session.duration as AssessmentContext["duration"],
      currentFeeling: session.current_feeling as AssessmentContext["currentFeeling"],
    };

    const followups = chooseFollowups(
      scores,
      signals,
      context,
      getFollowupQuestions(),
      answers.map(answer => answer.questionId)
    );

    await updateSession(id, {
      followup_ids: followups.map(question => question.id),
      status: "followup",
    });

    return NextResponse.json({
      followups,
      preliminary: {
        scores,
        activeSignals: Object.keys(signals).filter(key => signals[key].value),
      },
    });
  } catch (error) {
    console.error("[assessments/followups] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `获取追问题失败: ${message}` }, { status: 500 });
  }
}
