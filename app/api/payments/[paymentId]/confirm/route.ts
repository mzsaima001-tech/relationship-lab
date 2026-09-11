import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getPayment, markPaymentPaid } from "@/lib/db";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";

/**
 * ⚠️ 这是开发阶段「主动确认收款」路由（保留给人工对账/客服补偿用）。
 *
 * 安全策略：
 *  - 生产模式下必须登录后台（看 ADMIN_COOKIE + verifyAdminToken）
 *  - 记录到 audit log（dev 简化为 console.warn）
 *
 * 真网关接入后，订单解锁主要靠 /notify/xingyifu 上游回包；
 * 本路由降级为"对账补偿"工具，必须加 admin 鉴权才允许 POST。
 */
const schema = z.object({ note: z.string().max(200).optional() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  // 1) 强制 admin 鉴权（生产必须；dev 直接放行）
  if (process.env.NODE_ENV === "production") {
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
    const paid = payment.status === "paid" ? payment : await markPaymentPaid(paymentId);

    // 审计：dev 简化为 warn，生产应写 audit table
    console.warn(
      `[payment/confirm] manual mark-paid by admin · paymentId=${paymentId} · note=${note ?? "—"} · target_type=${payment.target_type}`
    );

    return NextResponse.json({ payment: paid, unlocked: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "确认支付失败" }, { status: 500 });
  }
}
