// =====================================================
// 站点级配置 — 部署时替换
// =====================================================

/**
 * 站点对外域名（用于分享文案、二维码落地页等）。
 * 部署时在环境变量设置 NEXT_PUBLIC_SITE_URL，例如：
 *   NEXT_PUBLIC_SITE_URL=https://moqi.yourdomain.com
 * 未设置时使用占位域名，仅用于本地开发。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://moqi-example.com";

/**
 * 收款配置 — 微信收款码（2026-09-14 起）
 *
 * 方案：静态微信收款码 + 手动确认。
 *   - 用户扫码付款后回到网站，点「我已支付」
 *   - 订单 status 进入 pending_review（不直接解锁）
 *   - 管理员在 /admin/operations 后台「确认已收」或「驳回」
 *   - 真正解锁通过 /api/admin/payments/{id}/approve 触发
 *
 * 没有自动回调 → 管理员每天瞄一眼后台即可。
 *
 * 未来升级路径：
 *   - 微信商户号原生 API（V3 Native/H5/JSAPI）：自动回调，无需管理员手动
 *     → lib/payment/xingyifu.ts 是早期的网关骨架，可作参考
 *   - 第三方聚合（虎皮椒 / PaysApi 等）：1-2 天实名，自动回调
 */
export const PAYMENT_CONFIG = {
  provider: "微信收款码",
  /** 静态收款码图片（public 下路径） */
  aggregateQr: "/pay/wechat-qr-v3.png",
  /** 支持的支付方式提示 */
  channels: "微信扫码",
  /**
   * 用户付款提示文案：可要求用户备注订单号前 8 位以辅助管理员对账。
   * 个人收款码没有自动对账，靠这条提示降低「金额+订单号」错位风险。
   */
  memoHint: "可在备注里写上订单号前 8 位，方便核对",
} as const;
