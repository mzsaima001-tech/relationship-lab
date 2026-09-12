"use client";

import Link from "next/link";

/**
 * 全站通用的「返回首页」底部条。
 * 用于任何非首屏页面，避免用户在邀请/支付/结果/分享等场景迷路。
 *
 * 「测一测我们」是高优先级 CTA：用高亮琥珀黄 + 圆角胶囊，
 * 区分于次要链接，作为引导用户进入双人测试的主推入口。
 */
export default function HomeFooter({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 mt-8 text-xs flex-wrap ${className}`}
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
      {/* 主推 CTA — 琥珀黄胶囊（突出于次要文本链接）*/}
      <Link
        href="/start"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--highlight)] text-[var(--bg-dark)] font-semibold hover:brightness-110 transition-all shadow-md shadow-[var(--highlight)]/30"
      >
        <span>💞</span>
        <span>测一测我们</span>
      </Link>
    </div>
  );
}