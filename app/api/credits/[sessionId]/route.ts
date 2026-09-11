import { NextResponse } from "next/server";
import { getSession, getCreditAccount } from "@/lib/db";
import { SINGLE_REPORT_PRICE, SHARE_REWARD } from "@/lib/assessment/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const account = await getCreditAccount(sessionId);
  return NextResponse.json({
    ...account,
    singleReportPrice: SINGLE_REPORT_PRICE,
    shareReward: SHARE_REWARD,
    remaining: Math.max(0, Math.round((SINGLE_REPORT_PRICE - account.balance) * 10) / 10),
  });
}
