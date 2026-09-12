"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 分享页通用操作组件（V2 设计 — 2 按钮方案）：
 *  - 主按钮 ①「保存相册」：立刻弹出大图预览（长按即可保存）
 *  - 主按钮 ②「分享图片」：触发后弹出底部 Action Sheet
 *      ├─ 微信好友（系统选择 sheet）
 *      ├─ 朋友圈（写入剪贴板 + 弹预览长按图）
 *      └─ 复制文案（纯复制）
 *  - 自动渲染一次备用（用户进页面立刻备好图，不再让操作卡顿）
 *
 * 用法（不变）：
 *   <SharePosterActions
 *     renderPoster={async (canvas) => renderPosterToCanvas(canvas)}
 *     defaultCaption="..."
 *     fileName="默契研究所-关系牌.png"
 *   />
 */
export interface SharePosterActionsProps {
  /** 用户点保存图片时，你来把海报画到传入的 canvas 上 */
  renderPoster: (canvas: HTMLCanvasElement) => Promise<void>;
  /** 一段默认的转发文案（写入剪贴板，给朋友圈） */
  defaultCaption: string;
  /** 导出 PNG 的文件名 */
  fileName: string;
  /** 海报 PNG 渲染完成后，会被回写到 <img> 供长按保存 */
  posterWidth?: number;
  posterHeight?: number;
}

type Action = "save" | "share" | "wxFriend" | "timeline" | "copy";
type Hint = "idle" | "rendered" | "copied" | "shared" | "saved";

export default function SharePosterActions({
  renderPoster,
  defaultCaption,
  fileName,
  posterWidth = 900,
  posterHeight = 1420,
}: SharePosterActionsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [hint, setHint] = useState<Hint>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const showHint = (h: Hint) => {
    setHint(h);
    setTimeout(() => setHint("idle"), 2400);
  };

  // —— 1) 自动渲染一次备用（进页面立刻备好图，不再让操作按钮卡顿） ——
  useEffect(() => {
    let cancelled = false;
    if (!canvasRef.current) return;
    (async () => {
      try {
        setRendering(true);
        await renderPoster(canvasRef.current!);
        if (cancelled) return;
        const url = canvasRef.current!.toDataURL("image/png");
        setPosterUrl(url);
        showHint("rendered");
      } catch {
        /* 容忍：用户点操作时会再试 */
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [renderPoster]);

  /** 强制重新渲染（如果还没拿到 URL） */
  const ensureRendered = async () => {
    if (posterUrl) return;
    if (!canvasRef.current) return;
    await renderPoster(canvasRef.current);
    const url = canvasRef.current.toDataURL("image/png");
    setPosterUrl(url);
  };

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

  /** —— 主按钮 ①：保存到相册 —— */
  const handleSave = async () => {
    setSheetOpen(false);
    setRendering(true);
    try {
      await ensureRendered();
      setPreviewOpen(true);
      showHint("saved");
    } finally {
      setRendering(false);
    }
  };

  /** —— 主按钮 ②：分享图片 ——  */
  const handleShare = async () => {
    setRendering(true);
    try {
      await ensureRendered();
      setSheetOpen(true);
    } finally {
      setRendering(false);
    }
  };

  /** —— Sheet 子项：微信好友 ——  */
  const handleWxFriend = async () => {
    setSheetOpen(false);
    const inWechat = /MicroMessenger/i.test(navigator.userAgent);
    const hasShare = typeof navigator.canShare === "function";

    // 先把文案备好
    await writeClipboard(defaultCaption);

    if (!inWechat && hasShare && posterUrl) {
      try {
        const blob = await (await fetch(posterUrl)).blob();
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "默契研究所",
            text: defaultCaption,
            files: [file],
          });
          showHint("shared");
          return;
        }
      } catch {
        /* 走兜底 */
      }
    }
    // 兜底：弹预览，用户长按图片后→返回微信选好友
    setPreviewOpen(true);
    showHint("copied");
  };

  /** —— Sheet 子项：朋友圈 ——  */
  const handleTimeline = async () => {
    setSheetOpen(false);
    const timelineCaption =
      defaultCaption +
      "\n\n——\n测一测你和 TA 的默契\n默契研究所 · 3 分钟出报告";
    await writeClipboard(timelineCaption);
    setPreviewOpen(true);
    showHint("copied");
  };

  /** —— Sheet 子项：复制分享文案 ——  */
  const handleCopy = async () => {
    setSheetOpen(false);
    await writeClipboard(defaultCaption);
    showHint("copied");
  };

  const onSheet = (a: Action) => {
    if (a === "wxFriend") handleWxFriend();
    else if (a === "timeline") handleTimeline();
    else if (a === "copy") handleCopy();
  };

  return (
    <>
      {/* —— 操作区（V2：2 按钮） —— */}
      <div className="space-y-3 fade-in-up" style={{ animationDelay: "0.18s" }}>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSave}
            disabled={rendering}
            className="w-full px-4 py-3.5 rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2"
            style={{
              background: "transparent",
              color: "var(--accent-bright)",
              border: "1.5px solid var(--accent)",
              minHeight: 52,
            }}
          >
            <span aria-hidden>📥</span>
            <span>保存相册</span>
          </button>
          <button
            onClick={handleShare}
            disabled={rendering}
            className="w-full px-4 py-3.5 rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2"
            style={{
              background: "var(--accent)",
              color: "var(--bg-dark)",
              minHeight: 52,
            }}
          >
            <span aria-hidden>💬</span>
            <span>分享图片</span>
          </button>
        </div>

        {/* 提示条 */}
        <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
          {hint === "rendered" && "✦ 海报已备好 ✓"}
          {hint === "copied" && "✓ 文案已复制，进微信可直接粘贴"}
          {hint === "saved" && "✓ 长按下方图片即可保存到相册"}
          {hint === "shared" && "✓ 已调起系统分享"}
          {hint === "idle" && (
            <>
              ✦ 点「分享图片」→ 选<span className="text-[var(--accent-bright)]">微信好友</span> / <span className="text-[var(--accent-bright)]">朋友圈</span>
            </>
          )}
        </p>
      </div>

      {/* —— 大图预览（长按可保存） —— */}
      {previewOpen && posterUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setPreviewOpen(false)}
        >
          <p className="text-[var(--accent-bright)] text-sm mb-3 font-medium">
            ✨ 长按下方图片即可保存到相册 ✨
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt="分享海报"
            className="max-h-[78vh] max-w-[92vw] rounded-lg shadow-2xl"
            style={{ WebkitTouchCallout: "default" }}
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-4 text-center leading-relaxed">
            轻点屏幕外区域关闭
          </p>
        </div>
      )}

      {/* —— 底部 Action Sheet —— */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl px-4 pt-3 pb-6 animate-[slideUp_0.25s_ease-out]"
            style={{ background: "var(--bg-dark)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.18)" }} />
            <p className="text-center text-sm font-medium text-[var(--accent-bright)] mb-4">
              分享到哪里？
            </p>
            <div className="space-y-2">
              <button
                onClick={() => onSheet("wxFriend")}
                className="w-full px-4 py-3.5 rounded-lg text-[15px] flex items-center gap-3 font-medium"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-warm)",
                }}
              >
                <span aria-hidden className="text-lg">🟢</span>
                <span className="flex-1 text-left">微信好友</span>
                <span className="text-[11px] text-[var(--text-muted)]">弹系统 sheet</span>
              </button>
              <button
                onClick={() => onSheet("timeline")}
                className="w-full px-4 py-3.5 rounded-lg text-[15px] flex items-center gap-3 font-medium"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-warm)",
                }}
              >
                <span aria-hidden className="text-lg">📷</span>
                <span className="flex-1 text-left">朋友圈</span>
                <span className="text-[11px] text-[var(--text-muted)]">复制文案 + 长按图</span>
              </button>
              <button
                onClick={() => onSheet("copy")}
                className="w-full px-4 py-3.5 rounded-lg text-[15px] flex items-center gap-3 font-medium"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-warm)",
                }}
              >
                <span aria-hidden className="text-lg">📋</span>
                <span className="flex-1 text-left">复制分享文案</span>
                <span className="text-[11px] text-[var(--text-muted)]">纯文字</span>
              </button>
            </div>
            <button
              onClick={() => setSheetOpen(false)}
              className="w-full mt-3 px-4 py-3 rounded-lg text-[14px] font-medium"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "var(--text-muted)",
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* —— 隐藏 canvas：渲染 PNG 用 —— */}
      <canvas
        ref={canvasRef}
        width={posterWidth}
        height={posterHeight}
        className="hidden"
      />
    </>
  );
}
