import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPayment,
  createPersonalityOrder,
  getPersonalityTest,
  updatePaymentGatewayMeta,
} from "@/lib/db";
import { PERSONALITY_REPORT_PRICE } from "@/lib/personality/types";
import { isXingyifuLive, callXingyifuApi, readXingyifuConfig } from "@/lib/payment/xingyifu";

const schema = z.object({ testId: z.string().min(4) });

/**
 * POST /api/personality/orders
 * 创建人格测试报告订单（星驿付聚合码）。
 *
 * 返回 payUrl / qrCode / gatewayOrderNo，与 single/pair 对齐。
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
      "xingyifu"
    );
    const order = await createPersonalityOrder(
      testId,
      PERSONALITY_REPORT_PRICE,
      payment.id
    );

    let payUrl: string | null = null;
    let qrCode: string | null = null;
    let gatewayOrderNo: string | undefined = undefined;
    if (isXingyifuLive()) {
      const config = readXingyifuConfig()!;
      const r = await callXingyifuApi(
        Math.round(PERSONALITY_REPORT_PRICE * 100),
        payment.id,
        "默契研究所 · 人格完整报告",
        config
      );
      if (r.ok) {
        payUrl = r.payUrl ?? null;
        qrCode = r.qrCode ?? null;
        gatewayOrderNo = r.gatewayOrderNo;
        await updatePaymentGatewayMeta(payment.id, {
          gatewayOrderNo: r.gatewayOrderNo,
          payUrl: r.payUrl,
          qrCode: r.qrCode,
        });
      } else {
        console.warn("[api/personality/orders] xingyifu 下单失败:", r.error);
      }
    }

    return NextResponse.json({
      payment,
      order,
      price: PERSONALITY_REPORT_PRICE,
      payUrl,
      qrCode,
      gatewayOrderNo,
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
