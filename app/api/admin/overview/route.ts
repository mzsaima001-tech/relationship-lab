import { NextResponse } from "next/server";
import {
  listPayments,
  listPersonalityOrders,
  listPersonalityTests,
  listReports,
  listResults,
  listSessions,
} from "@/lib/db";
import { PERSONALITY_TYPE_META } from "@/lib/personality/types";

// 本地开发运营概览。云端部署前应添加管理员登录和服务端权限校验。
export async function GET() {
  try {
    const [sessions, results, reports, payments, personalityTests, personalityOrders] = await Promise.all([
      listSessions(),
      listResults(),
      listReports(),
      listPayments(),
      listPersonalityTests(),
      listPersonalityOrders(),
    ]);

    // ---- 双人默契 ----
    const completed = sessions.filter(session => session.status === "completed").length;
    const paidPayments = payments.filter(payment => payment.status === "paid");
    const revenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // ---- 人格测试 ----
    const personalityCompleted = personalityTests.filter(t => t.status === "completed");
    const personalityPaidOrders = personalityOrders.filter(o => o.status === "paid");
    const personalityRevenue = personalityPaidOrders.reduce((sum, o) => sum + o.amount, 0);
    const personalityAiPolished = personalityCompleted.filter(t => t.polish_status === "ai-polished").length;

    // 原型分布（按 primary_type 计数）
    const archetypeCounts: Record<string, number> = {};
    for (const t of personalityCompleted) {
      const key = t.primary_type || "unknown";
      archetypeCounts[key] = (archetypeCounts[key] || 0) + 1;
    }
    const archetypeDistribution = Object.entries(archetypeCounts)
      .map(([type, count]) => ({
        type,
        cn: (PERSONALITY_TYPE_META as Record<string, { cn: string }>)[type]?.cn || type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      metrics: {
        // 双人
        totalSessions: sessions.length,
        completedSessions: completed,
        completionRate: sessions.length ? Math.round(completed / sessions.length * 100) : 0,
        reportsGenerated: reports.length,
        reportsUnlocked: reports.filter(report => report.unlocked).length,
        paidOrders: paidPayments.length,
        revenue: Math.round(revenue * 100) / 100,
        // 人格
        personalityTotalTests: personalityTests.length,
        personalityCompletedTests: personalityCompleted.length,
        personalityCompletionRate: personalityTests.length ? Math.round(personalityCompleted.length / personalityTests.length * 100) : 0,
        personalityPaidOrders: personalityPaidOrders.length,
        personalityRevenue: Math.round(personalityRevenue * 100) / 100,
        personalityAiPolished,
      },
      sessions: sessions
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 50)
        .map(session => ({
          id: session.id,
          nickname: session.nickname,
          relationshipType: session.relationship_type,
          relationshipStage: session.relationship_stage,
          status: session.status,
          createdAt: session.created_at,
          completedAt: session.completed_at,
          hasResult: results.some(result => result.session_id === session.id),
        })),
      payments: payments
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 50),
      // 人格测试数据
      personality: {
        tests: personalityTests.slice(0, 50).map(t => ({
          id: t.id,
          visitorId: t.visitor_id,
          status: t.status,
          primaryType: t.primary_type,
          secondaryType: t.secondary_type,
          hiddenType: t.hidden_type,
          primaryCn: t.primary_type ? (PERSONALITY_TYPE_META as Record<string, { cn: string }>)[t.primary_type]?.cn || t.primary_type : null,
          isPaid: t.is_paid,
          polishStatus: t.polish_status,
          polishModel: t.polish_model,
          polishElapsedMs: t.polish_elapsed_ms,
          polishError: t.polish_error,
          scores: {
            social: t.social_score,
            rationality: t.rationality_score,
            planning: t.planning_score,
            risk: t.risk_score,
            dominance: t.dominance_score,
            sensitivity: t.sensitivity_score,
          },
          startedAt: t.started_at,
          completedAt: t.completed_at,
          updatedAt: t.updated_at,
        })),
        orders: personalityOrders
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 50),
        archetypeDistribution,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "无法加载运营概览" }, { status: 500 });
  }
}
