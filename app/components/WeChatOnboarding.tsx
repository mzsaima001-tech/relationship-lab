"use client";

import { useEffect, useState } from "react";

/**
 * 微信浏览器检测 + 首次访问引导
 *
 * 触发条件：
 * 1. UA 含 MicroMessenger（微信内置浏览器）
 * 2. 不是通过 PWA（standalone）打开
 * 3. 首次访问（localStorage 标记）
 *
 * 显示内容：
 * 1. 说明为什么微信会显示"继续访问"警告页（域名未备案 + 服务器海外）
 * 2. 教用户如何添加到桌面，后续访问不再走微信浏览器
 * 3. 提供关闭按钮，关闭后 30 天不再显示
 */
export function WeChatOnboarding() {
  const [visible, setVisible] = useState(false);
  const [wechat, setWechat] = useState(false);
  const [step, setStep] = useState<"intro" | "guide">("intro");

  useEffect(() => {
    // 1. 是否在微信浏览器
    const ua = navigator.userAgent.toLowerCase();
    const isWeChat = ua.indexOf("micromessenger") !== -1;
    setWechat(isWeChat);

    // 2. 是否已通过 PWA 打开（standalone / fullscreen）
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (!isWeChat || isStandalone) return;

    // 3. 是否首次访问（30 天内不重复）
    const KEY = "moqilab.wechat-onboarding-dismissed";
    const dismissed = localStorage.getItem(KEY);
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      if (Date.now() - ts < 30 * 24 * 60 * 60 * 1000) return;
    }

    // 4. 显示弹窗（延迟 800ms 让首屏先渲染完）
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  const dismiss = (remember = true) => {
    if (remember) {
      localStorage.setItem("moqilab.wechat-onboarding-dismissed", String(Date.now()));
    }
    setVisible(false);
  };

  if (!visible || !wechat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm safe-bottom">
      <div className="bg-[#1a1610] border border-[var(--accent)]/30 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex w-5 h-5 rounded-full bg-[var(--accent)]/15 items-center justify-center text-[var(--accent)] text-xs font-bold">i</span>
            <h2 className="text-[15px] font-semibold text-[var(--text-warm)]">
              {step === "intro" ? "关于那个「继续访问」提示" : "添加到桌面"}
            </h2>
          </div>
          <button
            onClick={() => dismiss(true)}
            className="text-[var(--text-muted)] text-xl leading-none w-7 h-7 -mt-1 -mr-1 flex items-center justify-center active:opacity-60"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {step === "intro" ? (
          <div className="px-5 pb-5 space-y-4">
            <div className="space-y-2.5 text-[14px] leading-relaxed text-[var(--text-warm)]">
              <p>
                如果你刚才看到了<strong className="text-[var(--accent)]">「该网站未完成ICP备案」</strong>的红色提示——
                别担心，网站本身是安全的。
              </p>
              <p className="text-[var(--text-muted)] text-[13px]">
                这是微信浏览器对所有"未备案 + 海外服务器"网站的统一拦截提示。点"继续访问"就能正常进入，每次首次访问会有一次。
              </p>
            </div>

            <div className="bg-[#0e0c08] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="text-[13px] text-[var(--text-warm)] font-medium">添加到手机桌面（推荐）</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">后续从桌面打开，不走微信浏览器，<strong className="text-[var(--accent)]">不会再有警告页</strong></p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-bold flex items-center justify-center">2</span>
                <div>
                  <p className="text-[13px] text-[var(--text-warm)] font-medium">用浏览器打开</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">复制链接到 Safari/Chrome，也不会有警告</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-bold flex items-center justify-center">3</span>
                <div>
                  <p className="text-[13px] text-[var(--text-warm)] font-medium">每次点"继续访问"</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">约 1 秒，不影响使用</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => dismiss(true)}
                className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[var(--text-warm)] text-[14px] font-medium active:bg-white/5"
              >
                我知道了
              </button>
              <button
                onClick={() => setStep("guide")}
                className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-[#0e0c08] text-[14px] font-bold active:opacity-80"
              >
                添加到桌面
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-[13px] text-[var(--text-muted)]">
              根据你的手机系统，按下面的步骤操作：
            </p>

            {/* iOS 步骤 */}
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--accent)] font-semibold">iPhone（Safari）</p>
              <ol className="space-y-1.5 text-[13px] text-[var(--text-warm)] pl-4 list-decimal">
                <li>点击底部的<strong>分享按钮</strong>（方框加向上箭头）</li>
                <li>向下滚动找到<strong>"添加到主屏幕"</strong></li>
                <li>点击右上角<strong>"添加"</strong></li>
                <li>回到桌面，点击<strong>"默契研究所"</strong>图标打开</li>
              </ol>
            </div>

            {/* Android 步骤 */}
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--accent)] font-semibold">Android（Chrome）</p>
              <ol className="space-y-1.5 text-[13px] text-[var(--text-warm)] pl-4 list-decimal">
                <li>点击右上角<strong>菜单按钮</strong>（三个点）</li>
                <li>选择<strong>"添加到主屏幕"</strong>或"安装应用"</li>
                <li>确认添加</li>
                <li>回到桌面，点击<strong>"默契研究所"</strong>图标打开</li>
              </ol>
            </div>

            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl p-3 text-[12px] text-[var(--text-warm)]">
              <strong className="text-[var(--accent)]">提示：</strong>
              添加到桌面后，图标是一个金色罗盘，从桌面点击打开就像原生 APP，<strong className="text-[var(--accent)]">以后再也没有警告页</strong>。
            </div>

            <button
              onClick={() => dismiss(true)}
              className="w-full h-11 rounded-xl bg-[var(--accent)] text-[#0e0c08] text-[14px] font-bold active:opacity-80"
            >
              好的，回去添加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}