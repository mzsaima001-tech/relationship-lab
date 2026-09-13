import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[paymentId]/status
 *
 * 给支付页面用的轻量轮询接口。返回订单当前状态，前端根据 status === 'paid' 决定是否跳转。
 *
 * 设计要点：
 *  - 不强制鉴权（仅暴露 status/amount/target_type/target_id，不泄露个人信息）
 *  - 不缓存（force-dynamic + cache: "no-store"）
 *  - 找不到订单返回 404（让前端知道是订单无效，可提示用户重新创建）
 *
 * 状态机：
 *   - 'pending' → 等待支付
 *   - 'paid'    → 已到账，前端应自动跳转到结果页
 *   - 其他     → 前端保持原样不动
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;
    const payment = await getPayment(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "支付记录不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      paid_at: payment.paid_at ?? null,
      amount: payment.amount,
      target_type: payment.target_type,
      target_id: payment.target_id,
    });
  } catch (err) {
    console.error("[payments/status] error:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}