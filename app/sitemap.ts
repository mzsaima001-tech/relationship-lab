import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://moqi-example.com"
) as string;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // 仅索引三大静态营销入口（其它按页面 <动态 id>） — 这里只放可被收录的入口页
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/start`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/personality`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/test`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/pair`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/invite/SAMPLE`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
