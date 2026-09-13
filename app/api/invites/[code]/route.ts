import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getInviteByCode,
  getPairByInvite,
  updatePair,
  getPair,
} from "@/lib/db";

// GET - fetch invite info
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const invite = await getInviteByCode(code);
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const pair = await getPairByInvite(invite.id);
    if (!pair) {
      return NextResponse.json({ error: "Pair not found" }, { status: 404 });
    }

    const { getSession, getResult } = await import("@/lib/db");
    const sessionA = await getSession(pair.session_a);
    const resultA = await getResult(pair.session_a);

    return NextResponse.json({
      inviteCode: invite.code,
      pairId: pair.id,
      personA: {
        nickname: sessionA?.nickname || "匿名",
        archetype: resultA?.archetype,
        tags: resultA?.tags || [],
      },
      pairStatus: pair.status,
      sessionBLinked: Boolean(pair.session_b),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }
}

// POST - link a new session to the pair as person B
const linkSchema = z.object({
  sessionId: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = linkSchema.parse(await request.json());

    const invite = await getInviteByCode(code);
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const pair = await getPairByInvite(invite.id);
    if (!pair) {
      return NextResponse.json({ error: "Pair not found" }, { status: 404 });
    }

    if (pair.session_b) {
      return NextResponse.json({
        pairId: pair.id,
        sessionB: pair.session_b,
        alreadyLinked: true,
      });
    }

    await updatePair(pair.id, {
      session_b: body.sessionId,
      status: "in_progress",
    });

    return NextResponse.json({
      pairId: pair.id,
      sessionB: body.sessionId,
      alreadyLinked: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to link session" }, { status: 500 });
  }
}
