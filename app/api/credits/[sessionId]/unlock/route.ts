import { NextResponse } from "next/server";
import {
  getSession,
  getCreditAccount,
  spendCreditsForSingleReport,
  unlockReportViaShares,
  getPersonalShareByVisitor,
} from "@/lib/db";
import { SINGLE_REPORT_PRICE, VALID_SHARES_FOR_FREE_UNLOCK } from "@/lib/assessment/types";

/**
 * POST /api/credits/[sessionId]/unlock
 * body 可带 { visitorId }。
 * 解锁优先级：
 * 1) 已解锁 → 直接返回
 * 2) 积分余额够 → 扣余额解锁（老路径）
 * 3) 有效分享数（老账户 shares 与个人专属邀请码邀请数取大）满 N 人 → 免费解锁
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    let visitorId = "";
    try {
      const body = await request.json();
      if (body && typeof body.visitorId === "string") visitorId = body.visitorId;
    } catch {
      // 无 body 兼容老调用
    }

    const account = await getCreditAccount(sessionId);
    if (account.report_unlocked) {
      return NextResponse.json({ account, unlocked: true, already: true });
    }

    // 路径 2：余额够 → 扣余额
    if (account.balance >= SINGLE_REPORT_PRICE) {
      const spent = await spendCreditsForSingleReport(sessionId, SINGLE_REPORT_PRICE);
      return NextResponse.json({ account: spent, unlocked: true, via: "credits" });
    }

    // 路径 3：有效分享集齐 → 免费解锁
    let effectiveShares = account.shares;
    if (visitorId) {
      try {
        const personal = await getPersonalShareByVisitor(visitorId);
        effectiveShares = Math.max(effectiveShares, personal?.completed_visitors?.length ?? 0);
      } catch {
        // 查询失败按老账户判断
      }
    }
    if (effectiveShares >= VALID_SHARES_FOR_FREE_UNLOCK) {
      const unlockedAccount = await unlockReportViaShares(sessionId);
      return NextResponse.json({ account: unlockedAccount, unlocked: true, via: "shares" });
    }

    return NextResponse.json(
      { error: "积分不足", required: SINGLE_REPORT_PRICE, shares: effectiveShares },
      { status: 402 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "积分不足", required: SINGLE_REPORT_PRICE }, { status: 402 });
    }
    console.error(error);
    return NextResponse.json({ error: "解锁失败" }, { status: 400 });
  }
}
