"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { StarMap } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import { getOrCreateVisitorId } from "@/lib/visitor";

// =====================================================
// /referral — 我的邀请页
// 每人一个专属链接（指向首页），朋友点开完成任意测试、
// 生成报告（免费/付费均可）→ 你 +1 默契积分，按人去重。
// =====================================================

interface ReferralInfo {
  code: string;
  url: string;
  points: number;
  visits: number;
}

export default function ReferralPage() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [fullUrl, setFullUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const visitorId = getOrCreateVisitorId();
        const res = await fetch("/api/referral/code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setInfo(json);
        const url = `${window.location.origin}${json.url}`;
        setFullUrl(url);
        const qr = await QRCode.toDataURL(url, {
          width: 512,
          margin: 1,
          color: { dark: "#2a2118", light: "#f5ecd7" },
        });
        setQrDataUrl(qr);
      } catch (e: any) {
        setError(e?.message || "加载失败，请稍后再试");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyLink = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = fullUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2600);
  };

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm mt-4">正在取你的专属链接…</p>
      </main>
    );
  }

  if (error || !info) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[var(--text-muted)] text-sm">{error || "加载失败"}</p>
        <Link href="/" className="btn-ghost">返回首页</Link>
      </main>
    );
  }

  return (
    <main className="night-sky flex-1 px-5 py-8 max-w-sm mx-auto w-full">
      <StarMap opacity={0.12} seed={3} />
      <div className="relative">
        {/* ===== 档案头 ===== */}
        <div className="text-center mb-5 fade-in">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="archive-label">邀请有礼</span>
            <span className="w-6 h-px bg-[var(--border-dim)]" />
            <span className="file-number">REFERRAL</span>
          </div>
          <h1 className="display-serif text-2xl text-[var(--text-warm)] leading-relaxed">
            把这座研究所，
            <br />
            递给一位朋友
          </h1>
        </div>

        {/* ===== 专属链接 ===== */}
        <div className="fade-in-up mb-5" style={{ animationDelay: "0.12s" }}>
          <p className="text-[11px] tracking-[0.25em] text-[var(--text-muted)] text-center mb-2">
            你的专属邀请链接
          </p>
          <div
            className="w-full px-3 py-3 rounded-lg text-center break-all text-[13px] text-[var(--text-warm)] border border-[var(--border-dim)]"
            style={{ background: "rgba(0,0,0,0.25)" }}
          >
            {fullUrl}
          </div>
          <button onClick={copyLink} className="btn-primary w-full mt-3">
            {copied ? "✓ 已复制，去发给朋友吧" : "复制我的专属链接"}
          </button>
        </div>

        {/* ===== 二维码 ===== */}
        {qrDataUrl && (
          <div className="flex flex-col items-center mb-5 fade-in-up" style={{ animationDelay: "0.18s" }}>
            <div className="p-3 rounded-lg border border-[var(--border-dim)]" style={{ background: "#f5ecd7" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="专属邀请二维码" className="w-40 h-40" />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2 tracking-wider">
              朋友扫码也会打开首页
            </p>
          </div>
        )}

        <div className="mt-8 text-center fade-in" style={{ animationDelay: "0.24s" }}>
          <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors">
            ← 回到首页
          </Link>
        </div>

        <HomeFooter />
      </div>
    </main>
  );
}
