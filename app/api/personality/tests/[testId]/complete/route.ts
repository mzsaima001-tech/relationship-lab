import { NextResponse } from "next/server";
import {
  applyScoresToTest,
  computeDimensionScores,
} from "@/lib/personality/scoring";
import { matchArchetypes } from "@/lib/personality/archetypes";
import { buildFreeReport, buildFullReport } from "@/lib/personality/report";
import { polishPersonalityReportWithLLM } from "@/lib/personality/polish";
import {
  getPersonalityAnswers,
  getPersonalityTest,
  recordPersonalityShareCompletion,
  updatePersonalityTest,
  markPersonalityTestUnlockedViaShare,
} from "@/lib/db";
import { getActivePersonalityQuestions } from "@/lib/content/store";

/**
 * POST /api/personality/tests/[testId]/complete
 * 完成测试：计算 6 维 + Top3 人格 + 报告快照（含 AI 润色）。
 * 返回免费版报告（不带 full_report）。
 *
 * AI 润色策略（沿用 lib/reports/narrative.ts 范式）：
 * - 默认开启（AI_POLISH_ENABLED=true 且 AI_API_KEY 存在）→ 调 LLM 改写表达层
 * - 失败/超时/未开启 → 模板版原地返回，绝不阻塞出报告
 * - 润色后的报告写入 test 记录缓存，结果页直接读取，不重复 polish
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

    // 1. 收集所有答案
    const answers = await getPersonalityAnswers(testId);
    if (answers.length < 36) {
      return NextResponse.json(
        { error: "题目未全部完成", answered: answers.length, required: 36 },
        { status: 400 }
      );
    }

    // 2. 计算 6 维分数
    const answerMap: Record<string, "A" | "B" | "C" | "D"> = {};
    for (const a of answers) {
      answerMap[a.question_id] = a.answer_letter;
    }
    const scores = computeDimensionScores(answerMap, getActivePersonalityQuestions());

    // 3. 匹配 Top3 人格
    const top3 = matchArchetypes(scores);
    const [primary, secondary, hidden] = top3;

    // 4. 生成免费版报告
    const freeReport = buildFreeReport({
      scores,
      primary,
      secondary,
      hidden,
    });

    // 5. 生成完整版报告（模板版）→ AI 润色（失败/超时降级为模板版原样）
    const fullReportDraft = buildFullReport({
      scores,
      primary,
      secondary,
      hidden,
    });
    const polishStartedAt = Date.now();
    const { fullReport, applied, model, error } =
      await polishPersonalityReportWithLLM(fullReportDraft);
    const polishElapsedMs = Date.now() - polishStartedAt;

    // 6. 更新测试记录（含报告缓存 + 润色元数据）
    const updated = applyScoresToTest(test, scores);
    await updatePersonalityTest(testId, {
      ...updated,
      primary_type: primary.type,
      secondary_type: secondary.type,
      hidden_type: hidden.type,
      status: "completed",
      completed_at: new Date().toISOString(),
      free_report_cache: freeReport,
      full_report_cache: fullReport,
      polish_status: applied ? "ai-polished" : (error ? "local-template" : "local-template"),
      polish_model: model,
      polish_prompt_version: applied ? "v1.0-ai-polish" : undefined,
      polish_elapsed_ms: polishElapsedMs,
      polish_error: error,
    });

    // 7. 分享归因：若来自 ref 落地，则给推荐者 +1（最多 5 人自动解锁完整报告）
    //    - 同一 visitor 不重复计数
    //    - 推荐者自动 is_paid=true → 下次访问直接拿完整版
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
      scores,
      types: {
        primary: { ...primary },
        secondary: { ...secondary },
        hidden: { ...hidden },
      },
      freeReport,
      polish: {
        applied,
        model,
        elapsedMs: polishElapsedMs,
        // 不返回 error（admin 排查用），只返回状态让前端感知
        status: applied ? "ai-polished" : "local-template",
      },
    });
  } catch (error) {
    console.error("[personality/complete] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `完成测试失败: ${message}` }, { status: 500 });
  }
}
