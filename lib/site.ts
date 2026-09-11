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
 * 收款配置 — 星驿付聚合码
 * 支持微信 / 支付宝 / 云闪付扫码。
 * 本地开发阶段为静态收款码 + 手动确认；正式部署建议升级为
 * 星驿付线上网关（t_scan 微信小程序/JSAPI）+ 服务端回调自动解锁。
 */
export const PAYMENT_CONFIG = {
  provider: "星驿付",
  /** 聚合收款码图片（public 下路径） */
  aggregateQr: "/pay/xingyifu-qr.jpg",
  /** 支持的支付方式提示 */
  channels: "微信 / 支付宝 / 云闪付",
} as const;
