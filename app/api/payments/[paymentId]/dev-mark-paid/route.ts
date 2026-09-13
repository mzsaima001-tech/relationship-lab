import { NextRequest, NextResponse } from "next/server";
import { getPayment, markPaymentPaid } from "@/lib/db";

/**
 * POST /api/payments/[paymentId]/_dev-mark-paid
 *
 * ⚠️ 开发模式专用：模拟"支付平台已回调，账本被改成 paid"。
 * 生产环境自动 403 拒绝（因为生产必须有真网关回调，不该有人工改账本入口）。
 *
 * 用途：
 *  - 验证前端轮询机制是否真的生效（不点按钮也能自动跳转）
 *  - 集成测试 / 演示用
 *
 * 使用方式（开发模式）：
 *   curl -X POST http://localhost:7777/api/payments/pay_xxx/_dev-mark-paid
 *
 * 真网关上时（live=true）也应被禁用 — 因为真网关应直接调 /notify/xingyifu 改账本。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  // 1) 双重保护：生产环境永远禁用
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "生产环境禁用此接口，请走真网关回调 /api/notify/xingyifu" },
      { status: 403 }
    );
  }

  // 2) 真网关上时也禁用（让真网关回调作为唯一入口）
  //    这里读 lib/payment/xingyifu.isXingyifuLive() 而非重复判断 env
  //    保持规则一致：真网关在线 = 必须用真回调
  const { isXingyifuLive } = await import("@/lib/payment/xingyifu");
  if (isXingyifuLive()) {
    return NextResponse.json(
      { error: "真网关已启用，请走网关回调 /api/notify/xingyifu" },
      { status: 403 }
    );
  }

  try {
    const { paymentId } = await params;
    const payment = await getPayment(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    const paid = await markPaymentPaid(paymentId);

    console.warn(
      `[payments/_dev-mark-paid] DEV ONLY · mark-paid · paymentId=${paymentId} · target_type=${payment.target_type}`
    );

    return NextResponse.json({
      ok: true,
      payment: paid,
      unlocked: true,
      _warning: "此接口仅开发模式可用，生产环境请走真网关回调",
    });
  } catch (error) {
    console.error("[payments/_dev-mark-paid] error:", error);
    return NextResponse.json({ error: "标记失败" }, { status: 500 });
  }
}