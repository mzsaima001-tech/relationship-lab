import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPayment,
  createPersonalityOrder,
  getPersonalityTest,
} from "@/lib/db";
import { PERSONALITY_REPORT_PRICE } from "@/lib/personality/types";
import { isXingyifuLive, callXingyifuApi, readXingyifuConfig } from "@/lib/payment/xingyifu";

const schema = z.object({ testId: z.string().min(4) });

/**
 * POST /api/personality/orders
 * 创建人格测试报告订单（复用现有支付底层）。
 * 返回 payment 对象（含支付跳转 URL）和订单信息。
 */
export async function POST(request: Request) {
  try {
    const { testId } = schema.parse(await request.json());
    const test = await getPersonalityTest(testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status !== "completed") {
      return NextResponse.json({ error: "测试未完成" }, { status: 400 });
    }
    if (test.is_paid) {
      return NextResponse.json({ alreadyPaid: true });
    }

    const payment = await createPayment(
      "personality_report",
      testId,
      PERSONALITY_REPORT_PRICE,
      "weixin"
    );
    const order = await createPersonalityOrder(
      testId,
      PERSONALITY_REPORT_PRICE,
      payment.id
    );

    // 真网关在线：尝试拿 payUrl（骨架模式下 callXingyifuApi 返回 ok=false）
    let payUrl: string | null = null;
    if (isXingyifuLive()) {
      const config = readXingyifuConfig()!;
      const r = await callXingyifuApi(
        Math.round(PERSONALITY_REPORT_PRICE * 100),
        payment.id,
        "默契研究所 · 人格完整报告",
        config
      );
      if (r.ok && r.payUrl) payUrl = r.payUrl;
    }

    return NextResponse.json({
      payment,
      order,
      price: PERSONALITY_REPORT_PRICE,
      payUrl,
      live: isXingyifuLive(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[personality/orders] create failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `创建订单失败: ${message}` }, { status: 500 });
  }
}