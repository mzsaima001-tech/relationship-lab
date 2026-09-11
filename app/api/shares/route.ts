import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getShareBySession, createShare } from "@/lib/db";

const schema = z.object({
  sessionId: z.string(),
});

/**
 * 创建普通分享（裂变拉新用，与双人邀请完全隔离）：
 * - 同一 session 幂等复用已有分享码
 * - 不创建 pair、不进入双人模式
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const session = await getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "completed") {
      return NextResponse.json({ error: "测评完成后才能分享" }, { status: 400 });
    }

    const existing = await getShareBySession(body.sessionId);
    const share = existing ?? (await createShare(body.sessionId));

    return NextResponse.json({
      code: share.code,
      visits: share.visits,
      url: `/s/${share.code}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}
