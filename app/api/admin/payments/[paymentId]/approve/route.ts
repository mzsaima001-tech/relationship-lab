// =====================================================
// 管理员手动确认「我已支付」订单（静态收款码 + 手动确认方案）
// 鉴权：admin cookie
// 业务：调 approvePaymentReview → status 变为 paid，触发报告解锁副作用
// =====================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { approvePaymentReview, getPayment } from "@/lib/db";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";

const schema = z.object({ note: z.string().max(200).optional() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  // 必须 admin 鉴权
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "需要后台登录" }, { status: 401 });
  }

  try {
    const { paymentId } = await params;
    const note = schema.parse(await request.json().catch(() => ({}))).note;
    const payment = await getPayment(paymentId);
    if (!payment) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    if (payment.status === "paid") {
      return NextResponse.json({ payment, status: "paid", message: "订单已支付（幂等）" });
    }
    if (payment.status !== "pending_review" && payment.status !== "pending") {
      return NextResponse.json(
        { error: `当前状态 ${payment.status} 不允许审核` },
        { status: 409 }
      );
    }

    const updated = await approvePaymentReview(paymentId);
    console.warn(
      `[admin/payments/approve] paymentId=${paymentId} · note=${note ?? "—"} · target_type=${updated.target_type}`
    );
    return NextResponse.json({ payment: updated, status: "paid", unlocked: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "确认失败" }, { status: 500 });
  }
}