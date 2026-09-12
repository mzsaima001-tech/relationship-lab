import { NextResponse } from "next/server";
import { matchArchetypes } from "@/lib/personality/archetypes";
import { buildFreeReport, buildFullReport } from "@/lib/personality/report";
import { getPersonalityTest } from "@/lib/db";

/**
 * GET /api/personality/tests/[testId]/result
 * 未付款：返回免费版（优先读缓存，无缓存则现场 build）
 * 已付款：返回免费版 + 完整版（优先读缓存，避免重复 build+polish）
 *
 * 注意：完整版数据由服务器根据 is_paid 字段裁剪下发，前端不能"通过 CSS 隐藏"绕过。
 *
 * 缓存策略：
 * - complete 时已生成 full_report_cache（含 AI 润色结果）→ 直接读，零 LLM 调用
 * - 老数据没有缓存（升级前回填）→ 现场 build 模板版兜底，不重 polish（避免历史报告突变）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const test = await getPersonalityTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status !== "completed") {
      return NextResponse.json({ error: "测试未完成" }, { status: 400 });
    }

    if (
      test.social_score === undefined ||
      test.rationality_score === undefined ||
      test.planning_score === undefined ||
      test.risk_score === undefined ||
      test.dominance_score === undefined ||
      test.sensitivity_score === undefined ||
      !test.primary_type ||
      !test.secondary_type ||
      !test.hidden_type
    ) {
      return NextResponse.json({ error: "报告数据缺失" }, { status: 500 });
    }

    const scores = {
      social: test.social_score,
      rationality: test.rationality_score,
      planning: test.planning_score,
      risk: test.risk_score,
      dominance: test.dominance_score,
      sensitivity: test.sensitivity_score,
    };
    const top3 = matchArchetypes(scores);
    const [primary, secondary, hidden] = top3;

    // 免费版：优先缓存，否则现场 build
    const freeReport = test.free_report_cache ?? buildFreeReport({ scores, primary, secondary, hidden });

    // 公共元数据（让前端感知润色状态，便于后续按版本回滚或显示角标）
    const polish = {
      status: test.polish_status ?? "local-template",
      model: test.polish_model,
      promptVersion: test.polish_prompt_version,
      elapsedMs: test.polish_elapsed_ms,
    };

    // 分享奖励：供前端展示进度（解锁后 is_paid 自动为 true）
    const shareCredit = {
      shares: test.shares_count ?? 0,
      unlockedViaShare: !!test.unlocked_via_share,
      shareCode: test.share_code,
    };

    if (!test.is_paid) {
      return NextResponse.json({
        testId,
        scores,
        types: { primary, secondary, hidden },
        freeReport,
        paid: false,
        fullReport: null,
        polish,
        shareCredit,
      });
    }

    // 已付款：完整版优先读缓存，否则现场 build 模板版兜底（不重 polish，避免历史报告突变）
    const fullReport = test.full_report_cache ?? buildFullReport({ scores, primary, secondary, hidden });

    return NextResponse.json({
      testId,
      scores,
      types: { primary, secondary, hidden },
      freeReport,
      paid: true,
      fullReport,
      polish,
      shareCredit,
    });
  } catch (error) {
    console.error("[personality/result] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `获取报告失败: ${message}` }, { status: 500 });
  }
}
