import { NextResponse } from "next/server";
import {
  getSession,
  getAnswers,
  updateSession,
  saveResult,
  getResult,
  getCreditAccount,
  getShareByCode,
  addCredits,
} from "@/lib/db";
import type { ResultRecord, SessionRecord } from "@/lib/db";
import { getQuestionById } from "@/lib/content/store";
import { CONSISTENCY_PAIRS } from "@/lib/assessment/question-bank";
import {
  calculateScores,
  calculateDimensionResults,
  determineArchetype,
  generateTags,
} from "@/lib/assessment/score";
import { deriveSignals } from "@/lib/assessment/signals";
import { calculateConsistency, calculateResponseQuality } from "@/lib/assessment/quality";
import { buildReportFacts } from "@/lib/reports/rre";
import {
  buildSingleReportNarrative,
  polishWithLLM,
  gateNarrativeForFree,
  freeContentPercent,
  NARRATIVE_VERSION,
} from "@/lib/reports/narrative";
import type { SingleReportNarrative } from "@/lib/reports/narrative";
import { deriveRelationshipState } from "@/lib/assessment/relationship-state";
import type { Answer, AssessmentContext, AssessmentResult, Question, ReportFacts } from "@/lib/assessment/types";
import { SHARE_REWARD } from "@/lib/assessment/types";

const aiPolishEnabled = () =>
  (process.env.AI_POLISH_ENABLED ?? "").trim().toLowerCase() === "true";

/** 已入库结果 → 叙事报告；优先用缓存（含 AI 润色），缺失或降级过则重建 */
async function resolveNarrative(
  result: ResultRecord,
  session: SessionRecord
): Promise<SingleReportNarrative> {
  const cached = result.narrative as SingleReportNarrative | undefined;
  const meta = result.narrative_meta as { source?: string; error?: string | null; v?: number } | undefined;
  // 引擎版本不一致 → 陈旧缓存，必须重建（旧缓存可能含有已修复缺陷的文案）
  const stale = meta?.v !== NARRATIVE_VERSION;
  // 部分块润色失败时视为半成品：下次访问时再补一次润色（不视为最终版）
  const partial = typeof meta?.error === "string" && meta.error.startsWith("partial");
  // 缓存命中：版本一致，且 AI 已完整润色过，或当前就没开 AI（模板版即最终版）
  if (cached && !stale && ((meta?.source === "ai" && !partial) || !aiPolishEnabled())) {
    return cached;
  }

  const draft = buildSingleReportNarrative(
    {
      scores: result.dimension_scores,
      dimensionResults: result.dimension_results,
      signals: result.signals,
      responseQuality: result.response_quality,
      archetype: result.archetype,
      tags: result.tags,
    } as AssessmentResult,
    result.report_facts as ReportFacts,
    {
      nickname: session.nickname,
      currentFeeling: session.current_feeling as AssessmentContext["currentFeeling"],
      relationshipStage: session.relationship_stage as AssessmentContext["relationshipStage"],
      relationshipType: session.relationship_type as AssessmentContext["relationshipType"],
      duration: session.duration as AssessmentContext["duration"],
      lifeStage: session.life_stage as AssessmentContext["lifeStage"],
    }
  );

  const { narrative, applied, model, error } = await polishWithLLM(draft);
  try {
    await saveResult({
      ...result,
      narrative: narrative as unknown as Record<string, any>,
      narrative_meta: {
        source: applied ? "ai" : "template",
        model: model ?? null,
        error: error ?? null,
        v: NARRATIVE_VERSION,
        at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("cache narrative failed", e);
  }
  return narrative;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existing = await getResult(id);
    if (existing) {
      const credits = await getCreditAccount(id);
      const narrative = await resolveNarrative(existing, session);
      return NextResponse.json({
        sessionId: id,
        scores: existing.dimension_scores,
        dimensionResults: existing.dimension_results,
        signals: existing.signals,
        responseQuality: existing.response_quality,
        reportFacts: existing.report_facts as ReportFacts,
        archetype: existing.archetype,
        tags: existing.tags,
        narrative: credits.report_unlocked ? narrative : gateNarrativeForFree(narrative),
        freePercent: freeContentPercent(narrative),
        lockedCounts: {
          coreNeeds: Math.max(0, narrative.coreNeeds.length - 1),
          strengths: Math.max(0, narrative.strengths.length - 1),
          signals: narrative.signalPortrait.length,
        },
        credits,
      });
    }

    const answerRecords = await getAnswers(id);
    const allQuestionIds = [...session.question_ids, ...session.followup_ids];
    const questions = allQuestionIds
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
    const dimensionResults = calculateDimensionResults(questions, answers);
    const signals = deriveSignals(scores, questions, answers);
    const consistency = calculateConsistency(answers, CONSISTENCY_PAIRS);
    const responseQuality = calculateResponseQuality(answers, questions, consistency);
    const archetype = determineArchetype(scores);
    const tags = generateTags(scores);
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
    const relationshipState = deriveRelationshipState(context, scores, signals, answers);
    const reportFacts = buildReportFacts({
      scores,
      dimensionResults,
      signals,
      responseQuality,
      context: { ...context },
      relationshipState,
    });

    // 先生成叙事报告（含 AI 润色），再连同结果一起落库缓存
    const draft = buildSingleReportNarrative(
      {
        scores,
        dimensionResults,
        signals,
        responseQuality,
        archetype,
        tags,
      } as AssessmentResult,
      reportFacts,
      context
    );
    const { narrative, applied, model, error } = await polishWithLLM(draft);

    await saveResult({
      session_id: id,
      dimension_scores: scores,
      dimension_results: dimensionResults,
      signals,
      response_quality: responseQuality,
      consistency,
      report_facts: reportFacts,
      archetype,
      tags,
      created_at: new Date().toISOString(),
      narrative: narrative as unknown as Record<string, any>,
      narrative_meta: {
        source: applied ? "ai" : "template",
        model: model ?? null,
        error: error ?? null,
        v: NARRATIVE_VERSION,
        at: new Date().toISOString(),
      },
    });

    await updateSession(id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    // 有效分享归因：本 session 由分享海报带来且已完成测评 → 给分享者记 1 位有效分享。
    // shareToken = ref_complete:<本sessionId> 天然幂等，同一朋友重复完成只计一次；自己完成不计。
    if (session.referred_by_code) {
      try {
        const share = await getShareByCode(session.referred_by_code);
        if (share && share.source_session_id !== id) {
          await addCredits(
            share.source_session_id,
            SHARE_REWARD,
            "earn_share",
            "好友完成测评（有效分享）",
            `ref_complete:${id}`
          );
        }
      } catch (rewardError) {
        console.error("referral reward failed", rewardError); // 奖励失败不阻塞主流程
      }
    }

    const credits = await getCreditAccount(id);

    return NextResponse.json({
      sessionId: id,
      scores,
      dimensionResults,
      signals,
      responseQuality,
      reportFacts,
      archetype,
      tags,
      narrative: credits.report_unlocked ? narrative : gateNarrativeForFree(narrative),
      freePercent: freeContentPercent(narrative),
      lockedCounts: {
        coreNeeds: Math.max(0, narrative.coreNeeds.length - 1),
        strengths: Math.max(0, narrative.strengths.length - 1),
        signals: narrative.signalPortrait.length,
      },
      credits,
    });
  } catch (error) {
    console.error("[assessments/complete] POST failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `完成测试失败: ${message}` }, { status: 500 });
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

    const result = await getResult(id);
    if (!result) {
      return NextResponse.json({ error: "Result not found", status: "started" }, { status: 404 });
    }
    const credits = await getCreditAccount(id);

    const narrative = await resolveNarrative(result, session);

    return NextResponse.json({
      sessionId: id,
      nickname: session.nickname,
      scores: result.dimension_scores,
      dimensionResults: result.dimension_results,
      signals: result.signals,
      responseQuality: result.response_quality,
      consistency: result.consistency,
      reportFacts: result.report_facts as ReportFacts,
      archetype: result.archetype,
      tags: result.tags,
      narrative: credits.report_unlocked ? narrative : gateNarrativeForFree(narrative),
      freePercent: freeContentPercent(narrative),
      lockedCounts: {
        coreNeeds: Math.max(0, narrative.coreNeeds.length - 1),
        strengths: Math.max(0, narrative.strengths.length - 1),
        signals: narrative.signalPortrait.length,
      },
      credits,
      context: {
        relationshipType: session.relationship_type,
        relationshipStage: session.relationship_stage,
        duration: session.duration,
        ageBand: session.age_band,
        lifeStage: session.life_stage,
        gender: session.gender,
        currentFeeling: session.current_feeling,
      },
    });
  } catch (error) {
    console.error("[assessments/complete] GET failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `获取报告失败: ${message}` }, { status: 500 });
  }
}
