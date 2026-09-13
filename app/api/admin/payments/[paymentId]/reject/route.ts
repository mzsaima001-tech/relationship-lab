// =====================================================
// 管理员驳回「我已支付」订单（用户未付款却点了按钮 → 防白嫖）
// 鉴权：admin cookie
// 业务：调 rejectPaymentReview → status 变为 cancelled
// =====================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getPayment, rejectPaymentReview } from "@/lib/db";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";

const schema = z.object({
  reason: z.string().max(200).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "需要后台登录" }, { status: 401 });
  }

  try {
    const { paymentId } = await params;
    const reason = schema.parse(await request.json().catch(() => ({}))).reason;
    const payment = await getPayment(paymentId);
    if (!payment) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    if (payment.status === "paid") {
      return NextResponse.json({ error: "已支付订单不可驳回" }, { status: 409 });
    }
    if (payment.status === "cancelled") {
      return NextResponse.json({ payment, status: "cancelled", message: "已驳回（幂等）" });
    }

    const updated = await rejectPaymentReview(paymentId, reason);
    return NextResponse.json({ payment: updated, status: "cancelled" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "驳回失败" }, { status: 500 });
  }
}