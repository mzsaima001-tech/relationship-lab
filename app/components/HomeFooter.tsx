"use client";

import Link from "next/link";

/**
 * 全站通用的底部条（用在任何非首屏页面，避免迷路）。
 *
 * 故意不放主推 CTA —— 高优先级操作请各页面按上下文放置，例如：
 *   - 完成人格测试后 → "解锁我们的契合画像"
 *   - 完成默契测试后 → "邀请 TA 看契合画像"
 *   - 分享页 → "保存海报 / 分享给好友"
 * 避免每次页底都跳到 /start 让用户每次都怀疑自己是不是要重测。
 */
export default function HomeFooter({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-4 mt-10 text-xs flex-wrap ${className}`}
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
    </div>
  );
}
