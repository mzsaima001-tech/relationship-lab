import { NextResponse, after } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  getPayment,
  markPaymentPendingReview,
} from "@/lib/db";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { isXingyifuLive } from "@/lib/payment/xingyifu";
import { buildReviewUrl } from "@/lib/review-token";
import { notifyPaymentPendingReview } from "@/lib/notify/serverchan";

const schema = z.object({ paymentId: z.string().min(1) });

/**
 * POST /api/payment/personality/callback
 *
 * 静态收款码 + 手动确认方案（2026-09-14 起）：
 *   - 用户在支付页扫微信二维码付款后回到网站，点「我已支付」
 *   - 本路由把 payment.status 改为 pending_review（不直接解锁）
 *   - 真正解锁由 admin 后台 /api/admin/payments/{id}/approve 完成
 *
 * 真网关接入后，本路由降级或下线——上游通知走 /notify/xingyifu。
 */
export async function POST(request: Request) {
  // 真网关在线 → 整个接口禁用（不走主动确认）
  if (isXingyifuLive()) {
    return NextResponse.json(
      { error: "支付网关在线，禁止走主动确认通道。请联系支付方发起退款。" },
      { status: 403 }
    );
  }

  // 生产 + 真网关在线：必须 admin 鉴权（防白嫖）
  if (process.env.NODE_ENV === "production" && isXingyifuLive()) {
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (!(await verifyAdminToken(token))) {
      return NextResponse.json({ error: "需要后台登录" }, { status: 401 });
    }
  }

  try {
    const { paymentId } = schema.parse(await request.json());
    const payment = await getPayment(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "支付记录不存在" }, { status: 404 });
    }
    if (payment.target_type !== "personality_report") {
      return NextResponse.json({ error: "支付类型不匹配" }, { status: 400 });
    }
    // 静态码方案：先入 pending_review 等待管理员复核
    const reviewed = await markPaymentPendingReview(paymentId);

    console.warn(
      `[payment/personality/callback] user self-report paid · paymentId=${paymentId}`
    );

    // 微信推送通知站长复核（after：响应发出后执行；未配置 SendKey 时静默跳过）
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
      ok: true,
      status: "pending_review",
      payment: reviewed,
      message: "已收到你的付款确认，管理员核对后会立即解锁",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    if (error?.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json({ error: "支付记录不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "处理回调失败" }, { status: 500 });
  }
}
