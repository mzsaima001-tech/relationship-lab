import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCreditAccount,
  createPayment,
  updatePaymentGatewayMeta,
} from "@/lib/db";
import { SINGLE_REPORT_PRICE } from "@/lib/assessment/types";
import { isXingyifuLive, callXingyifuApi, readXingyifuConfig } from "@/lib/payment/xingyifu";

const schema = z.object({ sessionId: z.string().min(1) });

/**
 * POST /api/payments/single
 * 创建单人报告解锁订单（星驿付聚合码）。
 *
 * 行为：
 *  - 积分按 1:1 抵扣：应付金额 = max(0, 3.9 - 积分余额)
 *  - 应付为 0 → method="credits"，前端直接走积分解锁接口
 *  - 应付 > 0  → method="xingyifu"，调真网关（live 时）拿 payUrl/qrCode
 *
 * 返回字段新增 qrCode / gatewayOrderNo / live，让前端决定显示二维码图还是跳转链接。
 */
export async function POST(request: Request) {
  try {
    const { sessionId } = schema.parse(await request.json());
    const account = await getCreditAccount(sessionId);
    if (account.report_unlocked) {
      return NextResponse.json({ unlocked: true });
    }
    const payable = Math.max(0, Math.round((SINGLE_REPORT_PRICE - account.balance) * 10) / 10);
    const payment = await createPayment(
      "single_report",
      sessionId,
      payable,
      payable === 0 ? "credits" : "xingyifu"
    );

    // 真网关在线：尝试拿 payUrl / qrCode
    let payUrl: string | null = null;
    let qrCode: string | null = null;
    let gatewayOrderNo: string | undefined = undefined;
    if (payable > 0 && isXingyifuLive()) {
      const config = readXingyifuConfig()!;
      const r = await callXingyifuApi(
        Math.round(payable * 100), // 分
        payment.id,
        "默契研究所 · 单人完整报告",
        config
      );
      if (r.ok) {
        payUrl = r.payUrl ?? null;
        qrCode = r.qrCode ?? null;
        gatewayOrderNo = r.gatewayOrderNo;
        // 把网关回写信息落到 payment 记录（前端刷新页面也看得到）
        await updatePaymentGatewayMeta(payment.id, {
          gatewayOrderNo: r.gatewayOrderNo,
          payUrl: r.payUrl,
          qrCode: r.qrCode,
        });
      } else {
        console.warn("[api/payments/single] xingyifu 下单失败:", r.error);
      }
    }

    return NextResponse.json({
      payment,
      price: SINGLE_REPORT_PRICE,
      credits: {
        balance: account.balance,
        shares: account.shares,
      },
      payable,
      payUrl,
      qrCode,
      gatewayOrderNo,
      live: isXingyifuLive(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
