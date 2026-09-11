import { NextResponse } from "next/server";
import { z } from "zod";
import { getPair, createPayment, getReportByPair } from "@/lib/db";
import { PAIR_REPORT_PRICE } from "@/lib/assessment/types";

const schema = z.object({ pairId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { pairId } = schema.parse(await request.json());
    const pair = await getPair(pairId);
    if (!pair || !pair.session_b || pair.status !== "completed") {
      return NextResponse.json({ error: "双人测评尚未完成" }, { status: 400 });
    }
    const report = await getReportByPair(pairId);
    if (report?.unlocked) return NextResponse.json({ unlocked: true });

    const payment = await createPayment("pair_report", pairId, PAIR_REPORT_PRICE, "mock");
    return NextResponse.json({
      payment,
      price: PAIR_REPORT_PRICE,
      notice: "当前为本地开发模拟支付，云端部署时接入真实支付回调。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "创建支付订单失败" }, { status: 500 });
  }
}
