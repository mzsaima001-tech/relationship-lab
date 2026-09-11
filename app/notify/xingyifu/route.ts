// /notify/xingyifu
//
// 星驿付异步通知入口（生产链路）。
// 上游完成扣款后会向这里 POST 通知（带签名），服务端需要：
//   1) 立即返回 200 OK（防止上游重试）
//   2) 异步校验签名 + 业务幂等
//
// ⚠️ 当前为骨架 — 等用户提供真实网关文档后：
//   - 在 lib/payment/xingyifu.ts 的 callXingyifuApi 实现下单
//   - 把 REQUIRED_NOTIFY_FIELDS 替换成上游文档约定的字段
//   - 联调后切到 isXingyifuLive() === true 路径

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readXingyifuConfig,
  verifyNotifySignature,
  REQUIRED_NOTIFY_FIELDS,
} from "@/lib/payment/xingyifu";
import { getPayment, markPaymentPaid } from "@/lib/db";

// 上游回包：form-encoded 或 JSON 都可能；先接受 form（更符合国内网关惯例）
// shape 用 zod 校验必填字段存在即可，具体字段含义以正式接入时上游文档为准
const notifySchema = z.object({
  mch_id: z.string(),
  out_trade_no: z.string(),
  amount: z.string(),
  status: z.string(),
  sign: z.string(),
}).passthrough();

export async function POST(request: Request) {
  const config = readXingyifuConfig();
  if (!config) {
    // 骨架状态：未配置真网关 → 立即 200，防止上游误触发
    // （生产环境补 env 后这里会进入真实回调处理）
    return new NextResponse("ok (xingyifu not configured)", { status: 200 });
  }

  // 1) 解析 body（form-encoded；上游回包用 urlencoded 是国内主流）
  let payload: Record<string, string>;
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      payload = Object.fromEntries(
        [...form.entries()].map(([k, v]) => [k, String(v)])
      );
    }
  } catch {
    return new NextResponse("bad body", { status: 400 });
  }

  // 2) 必填字段兜底
  for (const f of REQUIRED_NOTIFY_FIELDS) {
    if (!payload[f]) return new NextResponse(`missing field: ${f}`, { status: 400 });
  }

  // 3) 校验入参
  const parsed = notifySchema.safeParse(payload);
  if (!parsed.success) return new NextResponse("bad schema", { status: 400 });

  // 4) 验签 — 一切业务变更前必须验签通过
  const signOk = verifyNotifySignature(
    payload,
    config.mchKey,
    payload.sign
  );
  if (!signOk) {
    return new NextResponse("invalid sign", { status: 401 });
  }

  // 5) 校验商户号
  if (payload.mch_id !== config.mchId) {
    return new NextResponse("mch mismatch", { status: 401 });
  }

  // 6) 状态校验（成功 / 失败两种；当前骨架只处理 "paid"）
  if (payload.status !== "paid") {
    return new NextResponse(`ignored status=${payload.status}`, { status: 200 });
  }

  // 7) 业务幂等：markPaymentPaid 内部已做（再次支付不会重复发报告）
  try {
    const payment = await getPayment(payload.out_trade_no);
    if (!payment) return new NextResponse("payment not found", { status: 404 });
    if (payment.status === "paid") return new NextResponse("ok (already paid)", { status: 200 });

    await markPaymentPaid(payload.out_trade_no);
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
