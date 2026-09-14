import { NextResponse } from "next/server";
import { z } from "zod";
import { getPair, createPayment, getReportByPair } from "@/lib/db";
import { PAIR_REPORT_PRICE } from "@/lib/assessment/types";
import { isXingyifuLive, callXingyifuApi, readXingyifuConfig } from "@/lib/payment/xingyifu";

const schema = z.object({ pairId: z.string().min(1) });

/**
 * POST /api/payments/pair
 * 创建双人契合画像订单（星驿付聚合码 / 19.9 元）。
 *
 * 行为对齐 /api/payments/single 与 /api/personality/orders：
 *   - 真网关在线 → 立即调 callXingyifuApi 拿 payUrl/qrCode
 *   - 真网关未配置 → 走开发态（聚合收款码 + 主动 mark-paid）
 */
export async function POST(request: Request) {
  try {
    const { pairId } = schema.parse(await request.json());
    const pair = await getPair(pairId);
    if (!pair || !pair.session_b || pair.status !== "completed") {
      return NextResponse.json({ error: "双人测评尚未完成" }, { status: 400 });
    }
    const report = await getReportByPair(pairId);
    if (report?.unlocked) return NextResponse.json({ unlocked: true });

    const payment = await createPayment(
      "pair_report",
      pairId,
      PAIR_REPORT_PRICE,
      "xingyifu"
    );

    let payUrl: string | null = null;
    let qrCode: string | null = null;
    let gatewayOrderNo: string | undefined = undefined;
    if (isXingyifuLive()) {
      const config = readXingyifuConfig()!;
      const r = await callXingyifuApi(
        Math.round(PAIR_REPORT_PRICE * 100), // 分
        payment.id,
        "默契研究所 · 双人契合画像",
        config
      );
      if (r.ok) {
        payUrl = r.payUrl ?? null;
        qrCode = r.qrCode ?? null;
        gatewayOrderNo = r.gatewayOrderNo;
      } else {
        console.warn("[api/payments/pair] xingyifu 下单失败:", r.error);
      }
    }

    return NextResponse.json({
      payment,
      price: PAIR_REPORT_PRICE,
      payUrl,
      qrCode,
      gatewayOrderNo,
      live: isXingyifuLive(),
      notice: isXingyifuLive()
        ? undefined
        : "当前为本地开发模拟支付，云端部署时接入真实支付回调。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[api/payments/pair] failed:", error);
    return NextResponse.json({ error: "创建支付订单失败" }, { status: 500 });
  }
}
