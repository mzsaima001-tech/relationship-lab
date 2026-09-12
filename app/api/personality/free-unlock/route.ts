import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPersonalityTest,
  updatePersonalityTest,
} from "@/lib/db";
import { PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK } from "@/lib/personality/types";

const schema = z.object({ testId: z.string() });

/**
 * POST /api/personality/free-unlock
 * 集齐 N 个有效分享后 → 后端自动写 is_paid=true
 * - 前端在进度达 100% 时可主动调一次（也可在 complete 归因侧自动完成）
 * - 二次调用幂等：已解锁不重复改字段（保留首次 paid_at）
 * - shares_count 不足返回 402，引导继续分享
 */
export async function POST(request: Request) {
  try {
    const { testId } = schema.parse(await request.json());
    const test = await getPersonalityTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status !== "completed") {
      return NextResponse.json({ error: "测试未完成" }, { status: 400 });
    }
    if (test.is_paid) {
      return NextResponse.json({
        testId,
        alreadyPaid: true,
        via: test.unlocked_via_share ? "share" : "payment",
      });
    }
    if ((test.shares_count ?? 0) < PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK) {
      return NextResponse.json(
        {
          error: "分享数不足",
          shares: test.shares_count ?? 0,
          required: PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK,
        },
        { status: 402 }
      );
    }

    await updatePersonalityTest(testId, {
      is_paid: true,
      paid_at: new Date().toISOString(),
      unlocked_via_share: true,
    });

    return NextResponse.json({
      testId,
      unlocked: true,
      via: "share",
      sharesCount: test.shares_count ?? 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[personality/free-unlock] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `解锁失败: ${message}` }, { status: 500 });
  }
}
