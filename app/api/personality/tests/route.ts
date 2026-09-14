import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPersonalityTest,
  listPersonalityTestsByVisitor,
} from "@/lib/db";
import { pickPaperId } from "@/lib/personality/questions";

const schema = z.object({
  visitorId: z.string().min(4).max(64),
  referredByCode: z.string().max(32).optional(),
});

/**
 * POST /api/personality/tests
 * 创建一个新的测试会话。
 * 同一 visitorId 已有未完成测试时返回它（避免重复创建）。
 *
 * referredByCode：来自分享落地页的 ?ref=CODE，用于被推荐者完成测评时给推荐者 +1 计数。
 *
 * paper_id 用 FNV-1a(visitorId) % 5 抽取，同 visitor 复测同卷（保证跨卷锚题可比）。
 */
export async function POST(request: Request) {
  try {
    const { visitorId, referredByCode } = schema.parse(await request.json());
    const existing = await listPersonalityTestsByVisitor(visitorId);
    const inProgress = existing.find((t) => t.status === "started");
    if (inProgress) {
      return NextResponse.json({
        testId: inProgress.id,
        resumed: true,
        paperId: inProgress.paper_id,
      });
    }
    const paperId = pickPaperId(visitorId);
    const test = await createPersonalityTest(visitorId, referredByCode, paperId);
    return NextResponse.json({
      testId: test.id,
      resumed: false,
      paperId: test.paper_id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[personality/tests] create failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `创建测试失败: ${message}` }, { status: 500 });
  }
}