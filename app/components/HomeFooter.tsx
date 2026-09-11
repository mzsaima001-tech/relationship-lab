"use client";

import Link from "next/link";

/**
 * 全站通用的「返回首页」底部条。
 * 用于任何非首屏页面，避免用户在邀请/支付/结果/分享等场景迷路。
 */
export default function HomeFooter({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-4 mt-8 text-xs ${className}`}
    >
      <Link
        href="/"
        className="text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
      >
        ← 回到首页
      </Link>
      <span className="text-[var(--text-muted)]/40">·</span>
      <Link
        href="/personality"
        className="text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
      >
        测一测我的人格
      </Link>
      <span className="text-[var(--text-muted)]/40">·</span>
      <Link
        href="/start"
        className="text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
      >
        测一测我们
      </Link>
    </div>
  );
}
