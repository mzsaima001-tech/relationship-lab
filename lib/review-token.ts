// =====================================================
// 订单复核链接签名（免登录审批）
//
// 场景：用户点「我已支付」→ 订单 pending_review → 站长的微信收到
// Server酱推送，消息里带 /review/<paymentId>?t=<token> 链接。
// 点开链接无需登录后台即可「确认已收 / 驳回」。
//
// 安全模型：
//   token = HMAC-SHA256(secret, paymentId) 取前 32 位（base64url）
//   - 无状态、不过期（订单处理完链接自然失效——状态非 pending_review 时拒绝操作）
//   - secret 优先级：REVIEW_LINK_SECRET > ADMIN_PASSWORD > 内置兜底
//   - 泄露面 ≈ 后台密码本身，可接受；验证用 timingSafeEqual 防时序侧信道
// =====================================================

import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return (
    (process.env.REVIEW_LINK_SECRET ?? "").trim() ||
    (process.env.ADMIN_PASSWORD ?? "").trim() ||
    "moqilab-review-fallback"
  );
}

export function signReviewToken(paymentId: string): string {
  return createHmac("sha256", secret())
    .update(`review:${paymentId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyReviewToken(paymentId: string, token: string): boolean {
  if (!token || token.length > 64) return false;
  const expected = signReviewToken(paymentId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 生成完整复核链接（供推送消息使用） */
export function buildReviewUrl(origin: string, paymentId: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/review/${paymentId}?t=${signReviewToken(paymentId)}`;
}
