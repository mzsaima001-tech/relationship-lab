import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "默契研究所 · Relationship Lab";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://moqi-example.com"
) as string;
const DESCRIPTION =
  "你们之间，有没有一种问题，总是在重复发生？默契研究所用 29 原型人格 + 双人默契测评，帮你看见那些被忽略的信号。";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0c08",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s · 默契研究所",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "默契研究所" }],
  keywords: [
    "默契测试",
    "双人关系测评",
    "人格测试",
    "29 原型",
    "亲密关系",
    "依恋类型",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
