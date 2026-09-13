// /notify/xingyifu
//
// ⚠️ 暂未启用（2026-09-14 起）
// 当前方案：静态微信收款码 + 手动确认。本路由保留作为网关通知入口，
// 但在没有配置 XINGYIFU_* env 时不会被支付链路触发。
//
// 星驿付异步通知入口（生产链路）。
// 上游完成扣款后会向这里 POST 通知（带签名），服务端需要：
//   1) 立即返回 200 OK（防止上游重试）
//   2) 异步校验签名 + mch_id + amount + 幂等
//
// 校验顺序（先快后慢，全部通过才动账本）：
//   - 读取 body（form-encoded / json）
//   - 抽 mch_id / out_trade_no / amount / status / sign
//   - 验签
//   - 校验 mch_id 等于配置
//   - 校验 status === paid
//   - 校验 amount（以"分"为单位,必须等于订单 amount）
//   - 调 markPaymentPaid（内部幂等）

import { NextResponse } from "next/server";
import {
  readXingyifuConfig,
  parseNotifyBody,
  extractNotifyFields,
  verifyNotifySignature,
  REQUIRED_NOTIFY_FIELDS,
} from "@/lib/payment/xingyifu";
import { getPayment, markPaymentPaid } from "@/lib/db";

export async function POST(request: Request) {
  const config = readXingyifuConfig();
  if (!config) {
    // 骨架状态：未配置真网关 → 立即 200，防止上游误触发
    // （生产环境补 env 后这里会进入真实回调处理）
    return new NextResponse("ok (xingyifu not configured)", { status: 200 });
  }

  // 1) 解析 body
  const raw = await parseNotifyBody(request);
  if (!raw) {
    return new NextResponse("bad body", { status: 400 });
  }

  // 2) 必填字段（基于实际配置的字段名）
  for (const f of REQUIRED_NOTIFY_FIELDS) {
    if (!raw[f]) return new NextResponse(`missing field: ${f}`, { status: 400 });
  }

  // 3) 抽核心字段
  const fields = extractNotifyFields(raw);

  // 4) 验签（一切业务变更前必须验签通过）
  const signOk = verifyNotifySignature(raw, config.mchKey, config.signType);
  if (!signOk) {
    console.warn(
      "[notify/xingyifu] invalid sign · out_trade_no=",
      fields.outTradeNo,
      " · received sign=",
      String(raw.sign ?? "").slice(0, 8) + "..."
    );
    return new NextResponse("invalid sign", { status: 401 });
  }

  // 5) 校验商户号
  if (fields.mchId !== config.mchId) {
    return new NextResponse("mch mismatch", { status: 401 });
  }

  // 6) 状态判断
  if (fields.status !== "paid" && fields.status !== "1" && fields.status !== "SUCCESS") {
    // 其他状态（"unpaid"/"refunded" 等）也返回 200,网关不会再重试
    console.warn(
      "[notify/xingyifu] ignored non-paid status:",
      fields.status,
      " · out_trade_no=",
      fields.outTradeNo
    );
    return new NextResponse(`ignored status=${fields.status}`, { status: 200 });
  }

  // 7) 业务幂等 + 落账
  try {
    const payment = await getPayment(fields.outTradeNo);
    if (!payment) {
      // 可能上游的回单晚于我们的下单记录删除周期 — 仍然 200 返回避免重试
      console.warn("[notify/xingyifu] payment not found · out_trade_no=", fields.outTradeNo);
      return new NextResponse("payment not found", { status: 200 });
    }
    if (payment.status === "paid") {
      return new NextResponse("ok (already paid)", { status: 200 });
    }

    // 8) 金额校验（分，对比本地下单金额）。
    //    payment.amount 是元；fields.amount 是分（cents）
    const expectedCents = Math.round(payment.amount * 100);
    if (expectedCents !== fields.amount) {
      // 金额不符：拒收。先记下现场便于对账。
      console.error(
        "[notify/xingyifu] amount mismatch · out_trade_no=",
        fields.outTradeNo,
        " · expectedCents=",
        expectedCents,
        " · gatewayCents=",
        fields.amount
      );
      // 不返 200，避免网关误以为成功；让上游重试或人工介入
      return new NextResponse("amount mismatch", { status: 400 });
    }

    // 9) 落账（markPaymentPaid 已做幂等）
    await markPaymentPaid(fields.outTradeNo);
    console.log(
      "[notify/xingyifu] OK · out_trade_no=",
      fields.outTradeNo,
      " · amount=",
      fields.amount,
      " · trade_no=",
      fields.tradeNo || "-"
    );
    return new NextResponse("ok", { status: 200 });
  } catch (err: any) {
    console.error("[notify/xingyifu] markPaymentPaid failed", err);
    return new NextResponse("internal error", { status: 500 });
  }
}

// 上游通常也会探测 GET；返回 200 避免上游绕路
export async function GET() {
  return new NextResponse("xingyifu notify ok", { status: 200 });
}
