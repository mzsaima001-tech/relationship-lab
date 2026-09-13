import { NextResponse } from "next/server";
import { scoreAnswers } from "@/lib/personality/scoring";
import { matchCards } from "@/lib/personality/match";
import { PERSONALITY_CARDS } from "@/lib/personality/cards";
import {
  PERSONALITY_DIMENSIONS,
  type PersonalityDimension,
  type PersonalityTestRecord,
} from "@/lib/personality/types";
import type { PersonalityAnswerRecord } from "@/lib/personality/types";
import {
  getPersonalityAnswers,
  getPersonalityTest,
  recordPersonalityShareCompletion,
  updatePersonalityTest,
  markPersonalityTestUnlockedViaShare,
} from "@/lib/db";
import { buildFreeReport, buildFullReport } from "@/lib/personality/report-builder";
import {
  polishFreeReportWithLLM,
  polishFullReportWithLLM,
  PERSONALITY_POLISH_PROMPT_VERSION,
} from "@/lib/personality/polish";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface RawAnswer { questionId: string; optionIndex: number }

/**
 * POST /api/personality/tests/[testId]/complete
 * 完成测试：计算 6 维 + Top3 月相 + 报告快照（V3 schema）
 * 返回免费版报告（不带 full_report）。
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const test = await getPersonalityTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status === "completed") {
      return NextResponse.json({ error: "测试已完成" }, { status: 400 });
    }

    // 1. 收集答案 → 算分
    const answers = await getPersonalityAnswers(testId);
    if (answers.length < 36) {
      return NextResponse.json(
        { error: "题目未全部完成", answered: answers.length, required: 36 },
        { status: 400 }
      );
    }

    const paperId = test.paper_id ?? "P1";
    const rawAnswers: RawAnswer[] = (answers as PersonalityAnswerRecord[])
      .map(a => ({ questionId: a.question_id, optionIndex: a.option_index }))
      .filter(a => a.optionIndex >= 0 && a.optionIndex <= 4);
    const scoreResult = scoreAnswers(paperId, rawAnswers);

    // 2. 匹配 Top3 月相（V3 余弦相似度）
    const userNorm = PERSONALITY_DIMENSIONS.map(d => scoreResult.norm[d]);
    const matchResult = matchCards(userNorm, PERSONALITY_CARDS);

    // 3. 生成 V3 报告（模板版）+ AI 润色（复用 v1 通用润色引擎）
    const baseFree = buildFreeReport(scoreResult.norm, matchResult);
    const baseFull = buildFullReport(scoreResult.norm, matchResult);

    const polishStart = Date.now();
    // free / full 并发润色（每个约 20-30s，并发跑总耗时与单跑接近）
    const [freePolish, fullPolish] = await Promise.all([
      polishFreeReportWithLLM(baseFree),
      polishFullReportWithLLM(baseFull),
    ]);
    const freeReport = freePolish.applied ? freePolish.report : baseFree;
    const fullReport = fullPolish.applied ? fullPolish.report : baseFull;
    const polishElapsedMs = Date.now() - polishStart;

    // 聚合 polish 状态：两边都成功才记 ai-polished；任一边降级则 local-partial；都没润上则 local-template
    const anyApplied = freePolish.applied || fullPolish.applied;
    const bothApplied = freePolish.applied && fullPolish.applied;
    const polishStatus: PersonalityTestRecord["polish_status"] = bothApplied
      ? "ai-polished"
      : anyApplied
        ? "local-partial"
        : "local-template";
    const polishModel = (freePolish.model ?? fullPolish.model) || undefined;
    const polishError =
      freePolish.error || fullPolish.error
        ? `${freePolish.error ?? "ok"} / ${fullPolish.error ?? "ok"}`
        : undefined;

    // 4. 写库（status=completed + V3 字段 + V1 兼容字段同填）
    const updateFields: Partial<PersonalityTestRecord> = {
      g_score: scoreResult.norm.G,
      x_score: scoreResult.norm.X,
      i_score: scoreResult.norm.I,
      f_score: scoreResult.norm.F,
      s_score: scoreResult.norm.S,
      e_score: scoreResult.norm.E,
      social_score: scoreResult.norm.G,
      rationality_score: scoreResult.norm.X,
      risk_score: scoreResult.norm.I,
      planning_score: scoreResult.norm.F,
      dominance_score: scoreResult.norm.S,
      sensitivity_score: scoreResult.norm.E,
      top1_card_id: matchResult.top1.card.id,
      top2_card_id: matchResult.top2.card.id,
      top3_card_id: matchResult.top3.card.id,
      top1_sim: matchResult.top1.similarity,
      top2_sim: matchResult.top2.similarity,
      top3_sim: matchResult.top3.similarity,
      primary_type: matchResult.top1.card.id,
      secondary_type: matchResult.top2.card.id,
      hidden_type: matchResult.top3.card.id,
      is_mixed: matchResult.is_mixed,
      mixed_note: matchResult.mixed_note,
      status: "completed",
      completed_at: new Date().toISOString(),
      free_report_cache: freeReport as any,
      full_report_cache: fullReport as any,
      polish_status: polishStatus,
      polish_model: polishModel,
      polish_prompt_version: PERSONALITY_POLISH_PROMPT_VERSION,
      polish_elapsed_ms: polishElapsedMs,
      ...(polishError ? { polish_error: polishError.slice(0, 500) } : {}),
    };
    await updatePersonalityTest(testId, updateFields);

    // 5. 分享归因
    let referrerUnlocked = false;
    let recommendedCount = 0;
    if (test.referred_by_code) {
      const recorded = await recordPersonalityShareCompletion(
        test.referred_by_code,
        test.visitor_id
      );
      if (recorded?.counted && recorded.recommenderTestId) {
        const inc = await markPersonalityTestUnlockedViaShare(recorded.recommenderTestId);
        referrerUnlocked = !!inc?.unlocked;
        recommendedCount = inc?.sharesCount ?? 0;
      } else if (recorded) {
        recommendedCount = recorded.visitorCount;
      }
    }

    return NextResponse.json({
      testId,
      scores: scoreResult.norm,
      types: {
        primary: { id: matchResult.top1.card.id, name: matchResult.top1.card.name, similarity: matchResult.top1.similarity, card: matchResult.top1.card },
        secondary: { id: matchResult.top2.card.id, name: matchResult.top2.card.name, similarity: matchResult.top2.similarity, card: matchResult.top2.card },
        hidden: { id: matchResult.top3.card.id, name: matchResult.top3.card.name, similarity: matchResult.top3.similarity, card: matchResult.top3.card },
      },
      freeReport,
      polish: {
        applied: anyApplied,
        bothApplied,
        model: polishModel,
        elapsedMs: polishElapsedMs,
        status: polishStatus,
        promptVersion: PERSONALITY_POLISH_PROMPT_VERSION,
        ...(polishError ? { error: polishError } : {}),
      },
    });
  } catch (error) {
    console.error("[personality/complete] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `完成测试失败: ${message}` }, { status: 500 });
  }
}