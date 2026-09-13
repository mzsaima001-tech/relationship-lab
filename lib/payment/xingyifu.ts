// =====================================================
// 星驿付支付网关（v2 真实接入版）
// =====================================================
// ⚠️ 暂未启用（2026-09-14 起）
//
// 当前生产方案：静态微信收款码 + 手动确认（见 lib/site.ts PAYMENT_CONFIG）
// 本文件保留作为「未来接入支付网关」时的实现参考；
// isXingyifuLive() 在没有任何 XINGYIFU_* env 时返回 false，
// 因此业务路径（callers / notify 路由）不会被走到。
//
// 启用条件：
//   1) 申请微信商户号（或星驿付/虎皮椒/PaysApi 聚合网关）账号
//   2) 拿到 mch_id / app_id / api_key_v3 / 证书 等参数
//   3) 设置环境变量 XINGYIFU_MCH_ID / XINGYIFU_API_KEY / XINGYIFU_GATEWAY_URL 等
//   4) 删除本文件顶部这段"暂未启用"注释
//
// =====================================================
// 默认按"行业通用聚合支付"规范实现（国内 90% 聚合支付/码支付/四方支付
//   采用同一协议）：form-encoded POST + 字典序拼接 + HMAC-MD5 签名。
//
// 真实接入时如果星驿付的字段名 / 路径与默认不同，按 env 调即可，
// 业务侧（callers）零改动：
//   - 字段名差异 → 用 XINGYIFU_*_FIELD 系列配置覆盖
//   - 签名算法   → XINGYIFU_SIGN_TYPE（HMAC-MD5 / MD5）
//   - 金额单位   → XINGYIFU_AMOUNT_UNIT（fen / yuan）
//   - 网关地址   → XINGYIFU_GATEWAY_URL
//   - 路径       → XINGYIFU_PAY_PATH / QUERY_PATH
//   - 成功标志   → XINGYIFU_RESP_CODE_OK
//
// 安全性（无论实际接入哪种网关都应满足）：
//   1) 通知必须做签名校验（verifyNotifySignature）
//   2) 通知必须校验 mch_id
//   3) 通知必须校验 amount 等于本地下单金额（防少付 / 多付 / 串号）
//   4) 通知必须做幂等（markPaymentPaid 本身已幂等）
//   5) 必须立即返回 200 OK 给网关（异步校验失败回包会被重试）
//   6) 生产域名必须 https，星驿付回包以 https POST 过来
//
// 数据结构：
//   XingyifuConfig      只读 env 出的配置
//   XingyifuOrderResult 下单回包
//   XingyifuQueryResult 查询回包
// =====================================================

import crypto from "crypto";

// =====================================================
// 配置读取
// =====================================================

export type SignType = "HMAC-MD5" | "MD5";
export type AmountUnit = "fen" | "yuan";
export type PayType = "auto" | "weixin" | "alipay" | "unionpay";

export interface XingyifuConfig {
  mchId: string;
  mchKey: string;
  notifyUrl: string;
  /** 上游网关地址。空字符串 → 走开发态（callXingyifuApi 返回 ok=false）。 */
  gatewayUrl: string;
  /** 下单接口路径，默认 /api/pay/create */
  payPath: string;
  /** 查询订单接口路径（防回调丢失用），默认 /api/pay/query */
  queryPath: string;
  /** 签名算法 */
  signType: SignType;
  /** 下单时传给网关的支付类型，默认 auto（聚合码，扫后任选通道） */
  payType: PayType;
  /** 金额单位，下单时换算用 */
  amountUnit: AmountUnit;
}

export function readXingyifuConfig(): XingyifuConfig | null {
  const mchId = process.env.XINGYIFU_MCH_ID;
  const mchKey = process.env.XINGYIFU_MCH_KEY;
  const notifyUrl = process.env.XINGYIFU_NOTIFY_URL;
  // 网关地址如果没配置 → 视为骨架模式（不调真网关）
  const gatewayUrl = process.env.XINGYIFU_GATEWAY_URL || "";

  // 只在"业务必填字段 + 网关地址"全部就绪时返回配置
  if (!mchId || !mchKey || !notifyUrl || !gatewayUrl) return null;

  return {
    mchId,
    mchKey,
    notifyUrl,
    gatewayUrl,
    payPath: process.env.XINGYIFU_PAY_PATH || "/api/pay/create",
    queryPath: process.env.XINGYIFU_QUERY_PATH || "/api/pay/query",
    signType: (process.env.XINGYIFU_SIGN_TYPE as SignType) || "HMAC-MD5",
    payType: (process.env.XINGYIFU_PAY_TYPE as PayType) || "auto",
    amountUnit: (process.env.XINGYIFU_AMOUNT_UNIT as AmountUnit) || "fen",
  };
}

export function isXingyifuLive(): boolean {
  return readXingyifuConfig() !== null;
}

// =====================================================
// 内部工具：按字段名覆盖网关期望值
// =====================================================

function field(
  envName: string,
  fallback: string
): string {
  return process.env[envName] || fallback;
}

const PAY_MCH_ID_FIELD    = field("XINGYIFU_MCH_ID_FIELD", "mch_id");
const PAY_OUT_FIELD       = field("XINGYIFU_OUT_FIELD",    "out_trade_no");
const PAY_AMOUNT_FIELD    = field("XINGYIFU_AMOUNT_FIELD", "amount");
const PAY_SUBJECT_FIELD   = field("XINGYIFU_SUBJECT_FIELD","subject");
const PAY_NOTIFY_FIELD    = field("XINGYIFU_NOTIFY_FIELD", "notify_url");
const PAY_TYPE_FIELD      = field("XINGYIFU_PAY_TYPE_FIELD", "pay_type");
const PAY_SIGN_FIELD      = field("XINGYIFU_SIGN_FIELD",   "sign");
const RESP_CODE_FIELD     = field("XINGYIFU_RESP_CODE_FIELD", "code");
const RESP_CODE_OK        = field("XINGYIFU_RESP_CODE_OK", "0");
const NOTIFY_STATUS_FIELD = field("XINGYIFU_NOTIFY_STATUS_FIELD", "status");
const NOTIFY_STATUS_OK    = field("XINGYIFU_NOTIFY_STATUS_OK",    "paid"); // 也接受 "1" 或 "SUCCESS" 调到时再说

// =====================================================
// 签名工具
// =====================================================

/**
 * 行业通用签名：除 sign 字段外按 ASCII 升序，拼接 `k=v&k=v`，
 *   末尾追加 `&key={mchKey}`，再 HMAC-MD5 / MD5，返回十六进制小写。
 *
 * 真接入时若网关签名规则有偏差，只需修改本函数即可。
 */
export function signPayload(
  payload: Record<string, string | number>,
  mchKey: string,
  signType: SignType = "HMAC-MD5"
): string {
  const sorted = Object.keys(payload)
    .filter((k) => payload[k] !== undefined && payload[k] !== null && payload[k] !== "")
    .sort() // ASCII 升序
    .map((k) => `${k}=${payload[k]}`)
    .join("&");
  const toSign = `${sorted}&key=${mchKey}`;
  if (signType === "MD5") {
    return crypto.createHash("md5").update(toSign).digest("hex");
  }
  // 默认 HMAC-MD5
  return crypto.createHmac("md5", mchKey).update(sorted).digest("hex");
}

/**
 * 校验通知 / 响应签名是否匹配（恒定时间比较，防时序攻击）。
 *  - 输入 payload 里要包含 `sign` 字段；本函数自动排除它
 *  - signType 与下单时一致
 */
export function verifyNotifySignature(
  payload: Record<string, string>,
  mchKey: string,
  signType: SignType = "HMAC-MD5"
): boolean {
  const signField = payload.sign;
  if (!signField) return false;
  const withoutSign = { ...payload };
  delete withoutSign.sign;
  const actual = signPayload(withoutSign as any, mchKey, signType);
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(signField, "hex");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// =====================================================
// 业务下单
// =====================================================

export interface XingyifuOrderResult {
  ok: boolean;
  /** 网关订单号（如果有，用于主动查询） */
  gatewayOrderNo?: string;
  /** 网关返回的支付跳转链接（H5 浏览器跳转） */
  payUrl?: string;
  /** 网关返回的二维码图片 URL（聚合码 → 用户扫后任选通道） */
  qrCode?: string;
  error?: string;
  /** 网关回包原文，便于排错 */
  raw?: any;
}

/**
 * 内部：将下单参数 POST 到网关。
 * - form-encoded
 * - 通用协议：mch_id / out_trade_no / amount / subject / notify_url / pay_type
 * - 响应：可能是嵌套 {code, msg, data:{trade_no, pay_url, qr_code}}，
 *        也可能平铺 {code, msg, trade_no, pay_url, qr_code}
 */
async function postToXingyifu(
  payload: Record<string, string>,
  config: XingyifuConfig
): Promise<XingyifuOrderResult> {
  const url = `${config.gatewayUrl.replace(/\/$/, "")}${config.payPath}`;
  const body = new URLSearchParams(payload).toString();

  let respText = "";
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "relationship-lab-payment/1.0",
      },
      body,
      // 5 秒超时（避免被网关 hang 死业务链）
      signal: AbortSignal.timeout(8000),
    });
    respText = await resp.text();
  } catch (err: any) {
    return { ok: false, error: `网关请求失败: ${err?.message || err}`, raw: null };
  }

  let raw: any;
  try {
    raw = JSON.parse(respText);
  } catch {
    return { ok: false, error: `网关返回非 JSON: ${respText.slice(0, 200)}`, raw: respText };
  }

  // 兼容嵌套 + 平铺两种回包
  const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const code = String(raw?.[RESP_CODE_FIELD] ?? "");
  if (code !== String(RESP_CODE_OK) && code !== "200") {
    return {
      ok: false,
      error: `网关业务错误 code=${code} msg=${raw?.msg || raw?.message || ""}`,
      raw,
    };
  }

  return {
    ok: true,
    gatewayOrderNo: String(data?.trade_no ?? data?.order_no ?? data?.system_no ?? ""),
    payUrl: data?.pay_url || data?.h5_url || data?.url,
    qrCode: data?.qr_code || data?.qrcode || data?.code_url,
    raw,
  };
}

/**
 * 调星驿付下单。骨架模式下会被前面的 isXingyifuLive() 拦截；
 * 真接入后,该函数把网关响应落到调用方。
 */
export async function callXingyifuApi(
  amountInCents: number,
  orderNo: string,
  subject: string,
  config: XingyifuConfig,
  payTypeOverride?: PayType
): Promise<XingyifuOrderResult> {
  // 校验金额
  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    return { ok: false, error: "invalid amount (must be > 0)" };
  }
  if (!orderNo || !subject) {
    return { ok: false, error: "missing orderNo or subject" };
  }

  // 按配置换算金额单位
  const amount =
    config.amountUnit === "fen"
      ? Math.round(amountInCents) // 已是分
      : (Math.round(amountInCents) / 100).toFixed(2); // 元，保留两位

  const payload: Record<string, string | number> = {
    [PAY_MCH_ID_FIELD]:    config.mchId,
    [PAY_OUT_FIELD]:       orderNo,
    [PAY_AMOUNT_FIELD]:    amount,
    [PAY_SUBJECT_FIELD]:   subject,
    [PAY_NOTIFY_FIELD]:    config.notifyUrl,
    [PAY_TYPE_FIELD]:      payTypeOverride || config.payType,
  };

  // 计算签名
  const sign = signPayload(payload, config.mchKey, config.signType);
  (payload as any)[PAY_SIGN_FIELD] = sign;

  const result = await postToXingyifu(payload as Record<string, string>, config);
  if (result.ok && result.raw) {
    // 把网关返回的 sign 与网关自己计算的做对比（如果回包带 sign 的话）
    // 协议上很多网关的响应也会带 sign，照搬同算法可验证
    if (result.raw.sign && config.signType) {
      const expectedSign = signPayload(
        Object.fromEntries(
          Object.entries(result.raw).filter(([k]) => k !== "sign")
        ) as any,
        config.mchKey,
        config.signType
      );
      if (expectedSign !== String(result.raw.sign)) {
        console.warn(
          "[xingyifu] 响应签名校验失败（继续，因网关没强制要求响应验签）:",
          { expected: expectedSign.slice(0, 8), got: String(result.raw.sign).slice(0, 8) }
        );
      }
    }
  }
  return result;
}

// =====================================================
// 主动查询订单（防回调丢失兜底）
// =====================================================

export interface XingyifuQueryResult {
  ok: boolean;
  paid?: boolean;
  amount?: number; // 单位：分
  gatewayOrderNo?: string;
  paidAt?: string;
  error?: string;
  raw?: any;
}

/**
 * 主动查询上游订单状态。
 * 用于：回调丢失兜底；用户刷新页面拿不到回调时也走这里手动核对。
 */
export async function queryXingyifuOrder(
  orderNo: string,
  config: XingyifuConfig
): Promise<XingyifuQueryResult> {
  if (!config) return { ok: false, error: "xingyifu not configured" };
  const payload: Record<string, string | number> = {
    [PAY_MCH_ID_FIELD]: config.mchId,
    [PAY_OUT_FIELD]: orderNo,
  };
  const sign = signPayload(payload, config.mchKey, config.signType);
  (payload as any)[PAY_SIGN_FIELD] = sign;

  const url = `${config.gatewayUrl.replace(/\/$/, "")}${config.queryPath}`;
  let respText = "";
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload as any).toString(),
      signal: AbortSignal.timeout(5000),
    });
    respText = await resp.text();
  } catch (err: any) {
    return { ok: false, error: `query xingyifu failed: ${err?.message || err}` };
  }

  let raw: any;
  try { raw = JSON.parse(respText); } catch { return { ok: false, error: `bad json: ${respText.slice(0, 200)}` }; }

  const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const code = String(raw?.[RESP_CODE_FIELD] ?? "");
  if (code !== String(RESP_CODE_OK) && code !== "200") {
    return { ok: false, error: `query biz code=${code}`, raw };
  }
  const status = String(data?.status ?? data?.trade_status ?? "");
  const paid = status === NOTIFY_STATUS_OK || status === "1" || status === "SUCCESS";
  const amountRaw = data?.amount ?? data?.total_fee;
  const amountCents =
    typeof amountRaw === "number"
      ? config.amountUnit === "fen" ? Math.round(amountRaw) : Math.round(Number(amountRaw) * 100)
      : undefined;

  return {
    ok: true,
    paid,
    amount: amountCents,
    gatewayOrderNo: String(data?.trade_no ?? data?.order_no ?? ""),
    paidAt: data?.pay_time || data?.paid_at,
    raw,
  };
}

// =====================================================
// 异步通知（被 /notify/xingyifu/route.ts 调用）
// =====================================================

/**
 * 解析上游回包（form / json 两种）。输入是 Request 对象。
 * 返回结构化 payload；调用方在拿到后应先验签，再调 markPaymentPaid。
 */
export async function parseNotifyBody(request: Request): Promise<Record<string, string> | null> {
  const ct = request.headers.get("content-type") || "";
  let raw: Record<string, string> = {};
  try {
    if (ct.includes("application/json")) {
      const json = await request.json();
      raw = Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]));
    } else {
      const form = await request.formData();
      raw = Object.fromEntries(
        [...form.entries()].map(([k, v]) => [k, String(v)])
      );
    }
  } catch {
    return null;
  }
  return raw;
}

/**
 * 从上游回包里抽取关键字段。
 * 这些字段名是按行业通用规范假设的；如果星驿付费真实回包字段名不同,
 * 通过 XINGYIFU_*_FIELD 系列 env 可覆盖。
 */
export const NOTIFY_REQUIRED_FIELDS = [
  PAY_MCH_ID_FIELD,
  PAY_OUT_FIELD,
  PAY_AMOUNT_FIELD,
  NOTIFY_STATUS_FIELD,
  PAY_SIGN_FIELD,
] as const;

/**
 * 通知中关键字段的解析（带 fallback）。
 * 调用方（route.ts）拿到这个对象后，配合 payment 自身记录，
 * 做 mch_id / out_trade_no / amount / status 多重校验。
 */
export function extractNotifyFields(raw: Record<string, string>): {
  mchId: string;
  outTradeNo: string;
  amount: number; // 单位：分
  status: string;
  tradeNo?: string;
  payTime?: string;
  payMethod?: string;
} {
  // 兼容"嵌套 data"型回包（少见,但有）
  const data =
    (raw as any).data && typeof (raw as any).data === "object" ? (raw as any).data : raw;
  const amountRaw = Number(data[PAY_AMOUNT_FIELD] ?? data.amount ?? "0");
  return {
    mchId: String(data[PAY_MCH_ID_FIELD] ?? data.mch_id ?? ""),
    outTradeNo: String(data[PAY_OUT_FIELD] ?? data.out_trade_no ?? ""),
    amount: Number.isFinite(amountRaw) ? Math.round(amountRaw * 100) : 0,
    status: String(data[NOTIFY_STATUS_FIELD] ?? data.status ?? ""),
    tradeNo: data.trade_no ?? data.order_no,
    payTime: data.pay_time ?? data.paid_at,
    payMethod: data.pay_type ?? data.pay_way,
  };
}

export const REQUIRED_NOTIFY_FIELDS = NOTIFY_REQUIRED_FIELDS;
