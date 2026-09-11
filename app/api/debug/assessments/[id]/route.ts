import { NextResponse } from "next/server";
import { getSession, getAnswers, getResult } from "@/lib/db";
import { getQuestionById } from "@/lib/content/store";
import { calculateScores, calculateDimensionResults } from "@/lib/assessment/score";
import { deriveSignals } from "@/lib/assessment/signals";
import { calculateConsistency, calculateResponseQuality } from "@/lib/assessment/quality";
import { CONSISTENCY_PAIRS } from "@/lib/assessment/question-bank";
import { buildReportFacts, evaluateReportRules } from "@/lib/reports/rre";
import { deriveRelationshipState } from "@/lib/assessment/relationship-state";
import type { Answer, AssessmentContext, Question } from "@/lib/assessment/types";

// 仅供本地开发调试：用于查看题目为什么出现、信号与报告规则的证据链。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const records = await getAnswers(id);
    const questions = [...session.question_ids, ...session.followup_ids]
      .map(questionId => getQuestionById(questionId))
      .filter((question): question is Question => Boolean(question));
    const answers: Answer[] = records.map(answer => ({
      questionId: answer.question_id,
      value: answer.value,
      shownAt: answer.shown_at,
      answeredAt: answer.answered_at,
      responseTimeMs: answer.response_time_ms,
    }));
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

    const scores = calculateScores(questions, answers);
    const dimensionResults = calculateDimensionResults(questions, answers);
    const signals = deriveSignals(scores, questions, answers);
    const consistency = calculateConsistency(answers, CONSISTENCY_PAIRS);
    const responseQuality = calculateResponseQuality(answers, questions, consistency);
    const relationshipState = deriveRelationshipState(context, scores, signals, answers);
    const input = {
      scores,
      dimensionResults,
      signals,
      responseQuality,
      context: { ...context },
      relationshipState,
    };
    const evaluatedRules = evaluateReportRules(input).map(rule => ({
      id: rule.rule.id,
      category: rule.category,
      priority: rule.priority,
      confidence: rule.confidence,
      evidence: rule.evidence,
      headline: rule.headline,
    }));
    const persisted = await getResult(id);

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        questionIds: session.question_ids,
        followupIds: session.followup_ids,
      },
      questionTrace: questions.map(question => ({
        id: question.id,
        phase: question.phase,
        motherQuestionId: question.motherQuestionId,
        dimension: question.dimension,
        exclusionGroup: question.exclusionGroup,
        trigger: question.trigger,
        resolves: question.resolves,
        reportImpact: question.reportImpact,
      })),
      scores,
      dimensionResults,
      activeSignals: Object.fromEntries(
        Object.entries(signals).filter(([, signal]) => signal.value)
      ),
      consistency,
      responseQuality,
      relationshipState,
      evaluatedRules,
      reportFacts: persisted?.report_facts || buildReportFacts(input),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Debug data unavailable" }, { status: 400 });
  }
}
