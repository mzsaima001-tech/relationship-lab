import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getPayment, markPaymentPendingReview } from "@/lib/db";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { isXingyifuLive } from "@/lib/payment/xingyifu";
import { buildReviewUrl } from "@/lib/review-token";
import { notifyPaymentPendingReview } from "@/lib/notify/serverchan";

/**
 * 静态收款码 + 手动确认方案（2026-09-14 起）：
 *  - 用户在支付页扫微信二维码付款后回到网站，点「我已支付」按钮
 *  - 本路由把订单 status 改为 `pending_review`，等待管理员后台复核
 *  - 真正解锁由 admin 后台 `/api/admin/payments/{id}/approve` 完成
 *
 * 真网关接入后，订单解锁主要靠 /notify/xingyifu 上游回包；
 * 本路由降级为"对账补偿"工具，必须加 admin 鉴权才允许 POST。
 *
 * 2026-09-15 强化：
 *  - 改 `after(() => notify(...))` 为同步 `await notify(...)` —— after() 在某些
 *    Vercel Serverless 上下文里 callback 会在响应 close 后被冻结，导致推送不到。
 *    同步等待能让错误立即可见（写入 console），且最多 2 次重试覆盖偶发抖动。
 */
const schema = z.object({ note: z.string().max(200).optional() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  // 生产 + 真网关在线：必须 admin 鉴权
  if (process.env.NODE_ENV === "production" && isXingyifuLive()) {
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (!(await verifyAdminToken(token))) {
      return NextResponse.json({ error: "需要后台登录" }, { status: 401 });
    }
  }

  try {
    const { paymentId } = await params;
    const note = schema.parse(await request.json().catch(() => ({}))).note;
    const payment = await getPayment(paymentId);
    if (!payment) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

    // 静态码方案：先入 pending_review 等待管理员复核，**不直接解锁**
    const reviewed = await markPaymentPendingReview(paymentId);

    // 审计：dev 简化为 warn，生产应写 audit table
    console.warn(
      `[payment/confirm] user self-report paid · paymentId=${paymentId} · note=${note ?? "—"} · target_type=${payment.target_type}`
    );

    // 同步推送 Server酱（即使响应慢 1 秒也要保证推到微信）
    const origin =
      (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() || new URL(request.url).origin;
    const pushResult = await notifyPaymentPendingReview({
      paymentId,
      targetType: payment.target_type,
      amount: payment.amount,
      reviewUrl: buildReviewUrl(origin, paymentId),
    });
    // 推送失败时 console.error 已在 lib/notify/serverchan.ts 里打；这里再冗余一行方便排查
    if (!pushResult.ok) {
      console.error(
        `[payment/confirm] Server酱 推送失败 paymentId=${paymentId} reason=${pushResult.reason} detail=${pushResult.detail}`
      );
    }

    return NextResponse.json({
      payment: reviewed,
      status: "pending_review",
      message: "已收到你的付款确认，管理员核对后会立即解锁",
      // 调试辅助字段（前端可忽略）：true 表示 Server酱 实际推到了站长微信
      notifyPushed: pushResult.ok,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "确认支付失败" }, { status: 500 });
  }
}