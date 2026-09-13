"use client";

import { useState } from "react";
import Link from "next/link";
import { OrnamentDivider } from "@/app/components/decor";
import { PAYMENT_CONFIG } from "@/lib/site";

/**
 * 静态收款码 + 手动确认方案（2026-09-14 起）
 *
 * 用户旅程：
 *   1) 展示 PAYMENT_CONFIG.aggregateQr + 应付金额 + 订单号
 *   2) 用户扫码付款（建议备注订单号前 8 位以辅助对账）
 *   3) 用户回到网站点「我已支付」按钮 → 调 confirm/callback 路由
 *      → payment.status 进入 pending_review（不直接解锁）
 *   4) 显示「已收到付款确认，等待管理员核对」状态
 *
 * 没有自动回调。管理员在 /admin/operations 后台手动「确认已收」后，
 * 用户刷新报告页（通常下个页面 fetch 已能拿到 unlocked=true）即可看到完整内容。
 */
export default function StaticQrPayCard(props: {
  amount: number;
  orderNo: string;
  paymentId: string;
  /** 哪种支付方式：单测 / 人格 */
  confirmKind: "single" | "pair" | "personality";
  /** 「我已支付」按钮点击后调用的接口 */
  onConfirm: () => Promise<void>;
  /** 返回链接（已付费报告的中间态页面） */
  backHref: string;
  backLabel?: string;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (status === "submitting" || status === "submitted") return;
    setStatus("submitting");
    setError("");
    try {
      await props.onConfirm();
      setStatus("submitted");
    } catch (e: any) {
      setError(e?.message || "提交失败，请稍后重试");
      setStatus("idle");
    }
  };

  const isWechat = typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);

  return (
    <div className="card p-5 sm:p-6 text-center">
      <p className="archive-label mb-4">扫码付款</p>

      <div className="inline-block rounded-xl bg-white p-3 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PAYMENT_CONFIG.aggregateQr}
          alt="微信收款码"
          className="w-52 h-52 object-contain"
          style={{ WebkitTouchCallout: "default" }}
        />
      </div>

      <p className="text-sm text-[var(--text-warm)] mt-4">
        请支付{" "}
        <span className="text-[var(--accent)] font-medium">¥{props.amount.toFixed(1)}</span>
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-1">
        {isWechat ? "长按二维码识别即可扫一扫付款" : `${PAYMENT_CONFIG.channels} · 长按或截图扫码支付`}
      </p>
      <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
        {PAYMENT_CONFIG.memoHint}：<span className="font-mono">{props.orderNo}</span>
      </p>

      <OrnamentDivider className="my-5" />

      {status === "submitted" ? (
        <div className="space-y-2">
          <p className="text-[15px] text-[var(--accent)] font-medium">
            ✓ 已收到你的付款确认
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            管理员核对后会立即解锁，<br />
            大约 1-30 分钟，请耐心等待。
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            如果着急可以加微信 <span className="text-[var(--accent)]">moonphase_helper</span> 催一下
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "submitting"}
          className="btn-primary w-full"
        >
          {status === "submitting" ? "提交中..." : "我已支付"}
        </button>
      )}

      {error && (
        <p className="text-[12px] text-[var(--danger)] mt-3 leading-relaxed">{error}</p>
      )}

      <p className="text-[11px] text-[var(--text-muted)] mt-4 leading-relaxed">
        没收到确认？检查微信支付是否成功 → 重新点「我已支付」即可。
      </p>

      <div className="mt-5">
        <Link
          href={props.backHref}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
        >
          ← {props.backLabel ?? "返回我的报告"}
        </Link>
      </div>
    </div>
  );
}