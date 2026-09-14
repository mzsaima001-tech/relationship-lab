import { NextResponse } from "next/server";
import { z } from "zod";
import { getShareByCode, incrementShareVisits } from "@/lib/db";

const schema = z.object({
  code: z.string().min(4).max(32),
  visitorId: z.string().max(64).optional(),
});

/**
 * POST /api/referral/visit
 * 朋友通过 /?ref=CODE 打开首页时记一次访问。
 * 自己点自己的码不计（visitorId 与码主相同则跳过）。
 * 访问数只用于展示（"已有 N 人点开过你的链接"），不影响积分。
 */
export async function POST(request: Request) {
  try {
    const { code, visitorId } = schema.parse(await request.json());
    const share = await getShareByCode(code);
    if (!share) {
      return NextResponse.json({ ok: false, reason: "unknown_code" }, { status: 404 });
    }
    if (visitorId && share.visitor_id && share.visitor_id === visitorId) {
      return NextResponse.json({ ok: true, self: true });
    }
    await incrementShareVisits(code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[referral/visit] failed:", error);
    // 访问计数失败不影响落地页使用，静默 200
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
