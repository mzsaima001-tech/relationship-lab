import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreditAccount, createPayment } from "@/lib/db";
import { SINGLE_REPORT_PRICE } from "@/lib/assessment/types";
import { isXingyifuLive, callXingyifuApi, readXingyifuConfig } from "@/lib/payment/xingyifu";

const schema = z.object({ sessionId: z.string().min(1) });

/**
 * 创建单人报告解锁订单（星驿付聚合码）。
 * 积分按 1:1 抵扣：应付金额 = max(0, 3.9 - 积分余额)。
 * 应付为 0 时前端应直接走积分解锁接口。
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
      payable === 0 ? "credits" : "weixin"
    );

    // 真网关在线：尝试拿 payUrl（骨架模式下 callXingyifuApi 会返回 ok=false）
    let payUrl: string | null = null;
    if (payable > 0 && isXingyifuLive()) {
      const config = readXingyifuConfig()!;
      const r = await callXingyifuApi(
        Math.round(payable * 100), // 真实接入时按上游文档换单位（分/元）
        payment.id,
        "默契研究所 · 单人完整报告",
        config
      );
      if (r.ok && r.payUrl) payUrl = r.payUrl;
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
