import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许通过环境变量切换构建输出目录，避免与 dev 服务器的 .next 锁冲突
  distDir: process.env.BUILD_DIST_DIR || ".next",
  poweredByHeader: false, // 移除 `X-Powered-By: Next.js` 信息暴露

  // 允许手机/局域网设备访问 dev server（Next 16 默认只信任 localhost，
  // 否则 HMR WebSocket 握手被拒、页面永不 hydration —— 2026-09-14 手机调试修复）
  allowedDevOrigins: ["192.168.31.210"],

  /**
   * 统一注入基础安全 HTTP 头。
   * 生产建议在部署层（CDN/Nginx）补 CSP，本配置提供 base-layer。
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // 基础 CSP：仅允许本站资源，避免常见 XSS/数据外联
          // （'unsafe-inline' 用于 Next 内联 style；如改用 nonce 需进一步缩减）
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data: https://fonts.gstatic.com",
              // 同时白名单裸域/www 域：Vercel 308 redirect + 用户从老链接进入时，CSP 才能放行
              "connect-src 'self' https://api.lk888.ai https://cloudflareinsights.com https://*.cloudflareinsights.com https://moqilab.top https://www.moqilab.top",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
