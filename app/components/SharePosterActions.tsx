"use client";

import { useState } from "react";

/**
 * 分享页操作区（V3 设计 — 提示条 + 复制文案）：
 *  - 长条提示「长按图片即可保存或分享」（页面上方就是海报大图，微信内长按即可保存/转发）
 *  - 下方唯一功能按钮「点击这里复制文案」：把分享文案写入剪贴板
 *
 * 用法：
 *   <SharePosterActions defaultCaption="..." />
 */
export interface SharePosterActionsProps {
  /** 分享文案（写入剪贴板） */
  defaultCaption: string;
}

export default function SharePosterActions({
  defaultCaption,
}: SharePosterActionsProps) {
  const [copied, setCopied] = useState(false);

  /** 通用：把文案写入剪贴板（iOS Safari 兼容） */
  const writeClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleCopy = async () => {
    const ok = await writeClipboard(defaultCaption);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    }
  };

  return (
    <div className="space-y-3 fade-in-up" style={{ animationDelay: "0.18s" }}>
      {/* —— 长条提示：长按图片即可保存或分享（核心提示语，非按钮） —— */}
      <div
        className="w-full px-4 py-3.5 rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2"
        style={{
          background: "rgba(201,169,110,0.10)",
          color: "var(--accent-bright)",
          border: "1.5px solid var(--accent)",
          minHeight: 52,
          letterSpacing: "0.02em",
        }}
      >
        <span aria-hidden>👆</span>
        <span>长按图片即可保存或分享</span>
      </div>

      {/* —— 功能按钮：复制文案 —— */}
      <button
        onClick={handleCopy}
        className="w-full px-4 py-3.5 rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2"
        style={{
          background: "var(--accent)",
          color: "var(--bg-dark)",
          minHeight: 52,
        }}
      >
        <span aria-hidden>📋</span>
        <span>{copied ? "✓ 已复制" : "点击这里复制文案"}</span>
      </button>

      {/* 状态提示 */}
      <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
        {copied
          ? "✓ 文案已复制，进微信可直接粘贴"
          : "配上文案发给 TA，效果更好"}
      </p>
    </div>
  );
}
