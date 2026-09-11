// =====================================================
// 星驿付支付网关（v1 骨架）
// =====================================================
// 本文件只搭骨架 — 真实接入需要用户提供：
//   1) 商户号（XINGYIFU_MCH_ID）
//   2) 商户密钥（XINGYIFU_MCH_KEY）
//   3) 异步回调地址（XINGYIFU_NOTIFY_URL，例如 https://yourdomain.com/notify/xingyifu）
//   4) 上游网关地址与签名算法文档
//
// 真实接入前，所有 createOrder 仍走「聚合收款码 + 主动确认」开发模式；
// 一旦真实网关文档就绪，把 callXingyifuApi() 中的 HTTP 请求实现填上即可。
//
// 安全规范（任何支付实现都要遵循）：
//   - 通知必须做 RSA/MD5 签名校验
//   - 通知必须做幂等（同 paymentId 只生效一次）
//   - 必须返回 200 OK 给网关，否则网关会重试（建议规定 1.5s 内返回）
//   - 业务状态写入必须在收到通知并校验通过后才执行
// =====================================================

import crypto from "crypto";

export interface XingyifuConfig {
  mchId: string;
  mchKey: string;
  notifyUrl: string;
  /** 上游网关地址（用户后续补文档时填入） */
  gatewayUrl?: string;
}

export function readXingyifuConfig(): XingyifuConfig | null {
  const mchId = process.env.XINGYIFU_MCH_ID;
  const mchKey = process.env.XINGYIFU_MCH_KEY;
  const notifyUrl = process.env.XINGYIFIF_NOTIFY_URL || process.env.XINGYIFU_NOTIFY_URL;
  // 三者任一缺失 → 返回 null（骨架模式）
  if (!mchId || !mchKey || !notifyUrl) return null;
  return {
    mchId,
    mchKey,
    notifyUrl,
    gatewayUrl: process.env.XINGYIFU_GATEWAY_URL,
  };
}

export function isXingyifuLive(): boolean {
  return readXingyifuConfig() !== null;
}

// =====================================================
// 签名工具（v1 骨架：使用 HMAC-SHA256 占位；真实接入时换成上游文档约定的算法）
// =====================================================

/**
 * 计算通知/订单签名。骨架用 HMAC-SHA256，真实接入时按官方文档替换。
 * 参数按字典序排序后拼接为 `k1=v1&k2=v2` 再加密。
 */
export function signPayload(
  payload: Record<string, string | number>,
  mchKey: string
): string {
  const sorted = Object.keys(payload)
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join("&");
  return crypto.createHmac("sha256", mchKey).update(sorted).digest("hex");
}

/**
 * 校验上游通知签名是否匹配（恒定时间比较，防时序攻击）
 */
export function verifyNotifySignature(
  payload: Record<string, string>,
  mchKey: string,
  expectedSign: string
): boolean {
  const { sign: _ignored, ...withoutSign } = payload;
  const actual = signPayload(withoutSign as any, mchKey);
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expectedSign, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// =====================================================
// 业务支付下单（骨架：返回占位结果，等待真实网关对接）
// =====================================================

export interface XingyifuOrderResult {
  ok: boolean;
  /** 网关订单号（如果有） */
  gatewayOrderNo?: string;
  /** 网关返回的支付链接或二维码 URL（如果有，骨架期不一定有） */
  payUrl?: string;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 调星驿付下单（骨架接口）。
 * 真实接入时：构造请求参数 → 调上游 HTTP → 解析回包 → 签名校验 → 返回。
 *
 * 当前调用方（pay/[sessionId] 与 pay/personality/[testId]）会判断：
 *   - isXingyifuLive() === false → 走「静态收款码 + 主动确认」开发模式（不动）
 *   - isXingyifuLive() === true  → 走真网关（需要实现 callXingyifuApi）
 */
export async function callXingyifuApi(
  _amount: number,
  _orderNo: string,
  _subject: string,
  config: XingyifuConfig
): Promise<XingyifuOrderResult> {
  // ⚠️ 骨架占位：等真实文档就绪后实现
  //     1) POST 到 config.gatewayUrl + '/pay/create'
  //     2) 构造签名：signPayload({ mch_id, out_trade_no, amount, subject }, config.mchKey)
  //     3) fetch → 解析 → 校验响应签名 → 返回 payUrl
  // 这里只做 warn + 返回模拟成功（不会走通，但不会让流程崩）
  console.warn(
    `[xingyifu] 骨架模式：callXingyifuApi 尚未实现。\n` +
      `  - mchId: ${config.mchId}\n` +
      `  - notifyUrl: ${config.notifyUrl}\n` +
      `  - 当前走「收款码 + 主动确认」流程\n` +
      `  - 等真实接入文档就绪后，到 lib/payment/xingyifu.ts 实现本函数。`
  );
  return { ok: false, error: "xingyifu api not yet implemented" };
}

// =====================================================
// 通知幂等工具（lib/db/local.ts 已经有 PaymentRecord，
//   markPaymentPaid 本身就是幂等的；这里只做签名校验快照）
// =====================================================

/**
 * 校验通过的通知最少需要的字段；骨架先列必填，等真实文档后追加。
 */
export const REQUIRED_NOTIFY_FIELDS = [
  "mch_id",
  "out_trade_no", // 我们的 paymentId
  "amount",
  "status", // "paid" = 已支付
  "sign",
] as const;
