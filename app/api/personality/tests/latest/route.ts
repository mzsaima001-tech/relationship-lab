import { NextResponse } from "next/server";
import { listPersonalityTestsByVisitor } from "@/lib/db";

/**
 * GET /api/personality/tests/latest?visitorId=...
 * 查某 visitor 最近一次人格测试，用于入口页「回到我的结果」按钮。
 * 返回 { testId, status, isPaid } 或 { testId: null }。
 * 只读，不创建任何记录。
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const visitorId = url.searchParams.get("visitorId") ?? "";
    if (visitorId.length < 4 || visitorId.length > 64) {
      return NextResponse.json({ error: "visitorId 无效" }, { status: 400 });
    }
    const tests = await listPersonalityTestsByVisitor(visitorId);
    if (!tests.length) {
      return NextResponse.json({ testId: null });
    }
    // 取最近更新的一份（listPersonalityTests 按 updated_at DESC 排；visitor 版未排序，这里兜底排一次）
    const latest = [...tests].sort((a, b) =>
      (b.updated_at ?? "").localeCompare(a.updated_at ?? "")
    )[0];
    return NextResponse.json({
      testId: latest.id,
      status: latest.status,
      isPaid: Boolean(latest.is_paid),
      paperId: latest.paper_id,
    });
  } catch (error) {
    console.error("[personality/tests/latest] query failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `查询失败: ${message}` }, { status: 500 });
  }
}
