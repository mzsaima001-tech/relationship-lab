import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://moqi-example.com"
) as string;

export default function robots(): MetadataRoute.Robots {
  // 注意：管理后台、API、临时会话路径（/pay/、/share/、/s/）一律禁止收录
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/pay", "/share", "/s", "/result", "/personality/result", "/personality/report"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
