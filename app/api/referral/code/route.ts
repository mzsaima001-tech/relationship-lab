import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreatePersonalShare } from "@/lib/db";

const schema = z.object({
  visitorId: z.string().min(4).max(64),
});

/**
 * POST /api/referral/code
 * 取/建当前访客的个人专属邀请码（幂等，每人一个、永久有效）。
 * 分享链接 = 首页 /?ref=CODE —— 朋友点开进首页，完成任意测试出报告后 +1 积分。
 *
 * 返回：code / url（相对路径，前端拼 origin）/ points（已成功邀请人数）/ visits（链接被打开次数）
 */
export async function POST(request: Request) {
  try {
    const { visitorId } = schema.parse(await request.json());
    const share = await getOrCreatePersonalShare(visitorId);
    return NextResponse.json({
      code: share.code,
      url: `/?ref=${share.code}`,
      points: (share.completed_visitors ?? []).length,
      visits: share.visits ?? 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[referral/code] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `获取邀请码失败: ${message}` }, { status: 500 });
  }
}
