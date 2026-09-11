import { NextResponse } from "next/server";
import { getSession, spendCreditsForSingleReport } from "@/lib/db";
import { SINGLE_REPORT_PRICE } from "@/lib/assessment/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const account = await spendCreditsForSingleReport(sessionId, SINGLE_REPORT_PRICE);
    return NextResponse.json({ account, unlocked: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "积分不足", required: SINGLE_REPORT_PRICE }, { status: 402 });
    }
    console.error(error);
    return NextResponse.json({ error: "解锁失败" }, { status: 400 });
  }
}
