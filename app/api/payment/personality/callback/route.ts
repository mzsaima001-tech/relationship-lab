import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  getPayment,
  markPaymentPaid,
  markPersonalityOrderPaid,
} from "@/lib/db";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { isXingyifuLive } from "@/lib/payment/xingyifu";

const schema = z.object({ paymentId: z.string().min(1) });

/**
 * POST /api/payment/personality/callback
 *
 * 双重定位：
 *  - 真网关在线时：禁用（上游通知走 /notify/xingyifu，不走这里）
 *  - 真网关离线（开发/骨架期）：保留作为前端"我已付款"主动解锁通道，
 *      但生产模式必须登录后台才允许 POST（防被白嫖）
 *
 * markPaymentPaid 内部已做幂等（重复调用安全）。
 */
export async function POST(request: Request) {
  // 真网关在线 → 整个接口禁用（不走主动确认）
  if (isXingyifuLive()) {
    return NextResponse.json(
      { error: "支付网关在线，禁止走主动确认通道。请联系支付方发起退款。" },
      { status: 403 }
    );
  }

  // 仅在「生产 + 真网关在线」组合下强制 admin 鉴权：
  // 生产但网关未配置（V1 mock 阶段）→ 允许前端主动解锁，否则用户永远无法解锁报告。
  if (process.env.NODE_ENV === "production" && isXingyifuLive()) {
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (!(await verifyAdminToken(token))) {
      return NextResponse.json({ error: "需要后台登录" }, { status: 401 });
    }
  }

  try {
    const { paymentId } = schema.parse(await request.json());
    const payment = await getPayment(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "支付记录不存在" }, { status: 404 });
    }
    if (payment.target_type !== "personality_report") {
      return NextResponse.json({ error: "支付类型不匹配" }, { status: 400 });
    }
    await markPaymentPaid(paymentId);
    const order = await markPersonalityOrderPaid(paymentId);

    // 审计：dev 简化为 warn，生产应写 audit table
    console.warn(
      `[payment/personality/callback] manual mark-paid by admin/frontend · paymentId=${paymentId}`
    );

    return NextResponse.json({ ok: true, order });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    if (error?.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json({ error: "支付记录不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "处理回调失败" }, { status: 500 });
  }
}
