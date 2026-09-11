import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, createInvite, createPair, getInviteBySession } from "@/lib/db";

const schema = z.object({
  sessionId: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const session = await getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if invite already exists
    const existingInvite = await getInviteBySession(body.sessionId);
    if (existingInvite) {
      // Also check if pair already exists
      const { getPairByInvite } = await import("@/lib/db");
      const existingPair = await getPairByInvite(existingInvite.id);
      return NextResponse.json({
        code: existingInvite.code,
        inviteId: existingInvite.id,
        pairId: existingPair?.id || null,
        url: `/invite/${existingInvite.code}`,
      });
    }

    const invite = await createInvite(body.sessionId);
    const pair = await createPair(body.sessionId, invite.id);

    await (await import("@/lib/db")).updatePair(pair.id, { status: "waiting" });

    return NextResponse.json({
      code: invite.code,
      inviteId: invite.id,
      pairId: pair.id,
      url: `/invite/${invite.code}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
