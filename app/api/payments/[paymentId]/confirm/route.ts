import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
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

    // 微信推送通知站长复核（after：响应发出后执行，不拖慢用户；未配置 SendKey 时静默跳过）
    const origin =
      (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() || new URL(request.url).origin;
    after(() =>
      notifyPaymentPendingReview({
        paymentId,
        targetType: payment.target_type,
        amount: payment.amount,
        reviewUrl: buildReviewUrl(origin, paymentId),
      })
    );

    return NextResponse.json({
      payment: reviewed,
      status: "pending_review",
      message: "已收到你的付款确认，管理员核对后会立即解锁",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "确认支付失败" }, { status: 500 });
  }
}
