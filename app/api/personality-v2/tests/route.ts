import { NextResponse } from "next/server";
import { z } from "zod";
import {
  v2CreateTest,
  v2ListTestsByVisitor,
} from "@/lib/personality/v2/db";
import { pickPaperId } from "@/lib/personality/v2/match";

const schema = z.object({
  visitorId: z.string().min(4).max(64),
});

/**
 * POST /api/personality-v2/tests
 * 创建 / 恢复测试会话。
 * 同一 visitor 有未完成测试时返回它（避免重复创建）。
 * 创建时按 hash(visitorId) % 5 抽 paper_id（P1-P5）。
 */
export async function POST(request: Request) {
  try {
    const { visitorId } = schema.parse(await request.json());

    const existing = await v2ListTestsByVisitor(visitorId);
    const inProgress = existing.find((t) => t.status === "started");
    if (inProgress) {
      return NextResponse.json({
        testId: inProgress.id,
        paperId: inProgress.paper_id,
        resumed: true,
      });
    }

    const paperId = pickPaperId(visitorId);
    const test = await v2CreateTest(visitorId, paperId);
    return NextResponse.json({
      testId: test.id,
      paperId: test.paper_id,
      resumed: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数无效", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[personality-v2/tests] create failed:", error);
    const message =
      error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `创建测试失败: ${message}` },
      { status: 500 }
    );
  }
}
