import { NextResponse } from "next/server";
import {
  getSession,
  getAnswers,
  updateSession,
  saveResult,
  getResult,
  getCreditAccount,
  getShareByCode,
  getPairBySession,
  getReportByPair,
  addCredits,
  recordPersonalShareCompletion,
  getPersonalShareByVisitor,
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

// 默契测试完整版报告含两人对照 + 多章节 AI 润色，单次 polish 需 30-50s，
// 显式提到 60s（Hobby 上限），超时则降级模板版（绝不阻塞出报告）。
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const aiPolishEnabled = () =>
  (process.env.AI_POLISH_ENABLED ?? "").trim().toLowerCase() === "true";

/** 已入库结果 → 叙事报告；优先用缓存（含 AI 润色），缺失或降级过则重建。
 *  lite=true（分享海报等轻量场景）：有缓存直接返回，无缓存则只建模板草稿，
 *  绝不触发 LLM 重润色（避免分享页被 30-60s 的润色拖慢）。
 *  deferPolishing=true（POST complete 新建场景）：只落模板草稿，绝不调 LLM；
 *  付费版润色放到 GET 路由里在 credits.report_unlocked 时懒润色并回写。
 */
async function resolveNarrative(
  result: ResultRecord,
  session: SessionRecord,
  opts: { lite?: boolean; deferPolishing?: boolean } = {}
): Promise<SingleReportNarrative> {
  const { lite = false, deferPolishing = false } = opts;
  const cached = result.narrative as SingleReportNarrative | undefined;
  // 轻量模式：只要库里有缓存就直接用，不做版本/半成品校验、不重润色
  if (lite && cached) return cached;
  const meta = result.narrative_meta as { source?: string; ai_polished?: boolean; error?: string | null; v?: number } | undefined;
  // 引擎版本不一致 → 陈旧缓存，必须重建（旧缓存可能含有已修复缺陷的文案）
  const stale = meta?.v !== NARRATIVE_VERSION;
  // 部分块润色失败时视为半成品：下次访问时再补一次润色（不视为最终版）
  const partial = typeof meta?.error === "string" && meta.error.startsWith("partial");
  // 缓存命中条件：版本一致，且 AI 已完整润色过，或当前就没开 AI（模板版即最终版）
  const aiDone = meta?.source === "ai" && !partial;
  if (cached && !stale && (aiDone || !aiPolishEnabled())) {
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

  // 轻量模式 / defer 模式：模板草稿直接返回，不做 LLM 润色、不落库
  if (lite || deferPolishing) return draft;

  const { narrative, applied, model, error } = await polishWithLLM(draft);
  try {
    await saveResult({
      ...result,
      narrative: narrative as unknown as Record<string, any>,
      narrative_meta: {
        source: applied ? "ai" : "template",
        ai_polished: applied === true,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 可选 body：{ visitorId } —— 统一访客 ID，用于个人邀请码按人积分（旧客户端无 body 时跳过）
    let bodyVisitorId = "";
    try {
      const raw = await request.json();
      if (typeof raw?.visitorId === "string") bodyVisitorId = raw.visitorId.slice(0, 64);
    } catch {
      /* 无 body / 非 JSON 都按空处理 */
    }
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existing = await getResult(id);
    if (existing) {
      const credits = await getCreditAccount(id);
      // POST 已完成场景：不重润色，直接拿缓存返回（即使未解锁也用模板版渲染给客户端）
      const narrative = await resolveNarrative(existing, session, { deferPolishing: true });
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

    // 先生成模板草稿（不调 LLM），再连同结果一起落库缓存
    // —— 提速策略：complete 阶段不再等 30-60s 的 polish；改为 GET 路由在用户实际查看
    // 且 credits.report_unlocked=true 时懒润色并回写。免费版走 gateNarrativeForFree 截断
    // 也只看到模板草稿，没必要付出 LLM 成本。
    const narrative = buildSingleReportNarrative(
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
        source: "template",
        ai_polished: false,
        model: null,
        error: null,
        v: NARRATIVE_VERSION,
        at: new Date().toISOString(),
      },
    });

    await updateSession(id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    // 有效分享归因：本 session 由分享带来且已完成测评（免费报告生成即记，付费不重复记）。
    // - personal 个人专属邀请码：给分享人 +1 积分，按被邀请人 visitorId 去重（同一朋友只计一次）
    // - 旧默契海报码：给分享者 credit 账户 +¥1 抵扣；shareToken = ref_complete:<本sessionId> 天然幂等
    if (session.referred_by_code) {
      try {
        const share = await getShareByCode(session.referred_by_code);
        if (share?.share_type === "personal") {
          if (bodyVisitorId) {
            await recordPersonalShareCompletion(session.referred_by_code, bodyVisitorId);
          }
        } else if (share && share.source_session_id !== id) {
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // ?lite=1：分享海报等场景，跳过 LLM 重润色，秒回
    const lite = new URL(request.url).searchParams.get("lite") === "1";
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const result = await getResult(id);
    if (!result) {
      return NextResponse.json({ error: "Result not found", status: "started" }, { status: 404 });
    }
    const credits = await getCreditAccount(id);

    // 进度条口径统一：海报二维码已换为「个人专属邀请码」，朋友完成记在 personal 账户上。
    // 这里把该 visitor 的个人邀请数合并进来（取两者较大值，兼容旧海报码加的老积分）。
    const visitorId = new URL(request.url).searchParams.get("visitorId") || "";
    if (visitorId) {
      try {
        const personal = await getPersonalShareByVisitor(visitorId);
        const personalCount = personal?.completed_visitors?.length ?? 0;
        if (personalCount > credits.shares) credits.shares = personalCount;
      } catch {
        // 查询失败不阻塞主流程
      }
    }

    // 提速懒润色：未付费（含分享海报 lite）一律返回模板；付费后首次访问才走 LLM
    const polishNow = !lite && Boolean(credits.report_unlocked);
    const narrative = await resolveNarrative(result, session, {
      lite,
      deferPolishing: !polishNow,
    });

    // 反查：这个 session 是否已在某个 pair 里（A 或 B），
    // 用于结果页 PAIR 板块展示「查看我们的契合画像」按钮。
    // 被分享人（B）也会拿到，让对方在结果页直接进入契合画像。
    let pairId: string | null = null;
    let pairRole: "a" | "b" | null = null;
    let pairPaid = false;
    try {
      const pair = await getPairBySession(id);
      if (pair) {
        pairId = pair.id;
        pairRole = pair.session_a === id ? "a" : "b";
        // 反查该 pair 的契合画像是否已解锁（¥19.9），
        // 用于结果页按钮文案分支：未解锁→「解锁契合画像 ¥19.9」；已解锁→「查看契合画像」
        const pairReport = await getReportByPair(pair.id);
        pairPaid = Boolean(pairReport?.unlocked);
      }
    } catch {
      // 反查失败不阻塞主流程
    }

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
      pairId,
      pairRole,
      pairPaid,
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
