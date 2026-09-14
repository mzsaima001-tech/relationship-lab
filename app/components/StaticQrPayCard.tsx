"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
 * 没有自动回调。管理员在 Server酱微信推送链接 /review/[paymentId] 上审核通过后：
 *   - 用户停留在付款页时，本组件每 10s 轮询 /api/payments/[id]/status
 *   - 检测到 paid → 高亮"✓ 已通过审核，3 秒后跳转报告" → 自动 router.push
 *   - 用户切到后台再回来（visibilitychange）立即补一次查询
 *   - 始终保留"查看完整报告" 手动链接按钮，10 分钟未变 paid 时停轮询
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
  /** 服务端传入的订单初始状态（防止刷新后重新创建订单） */
  initialStatus?: "pending" | "pending_review" | "paid" | "cancelled" | "refunded";
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">(props.initialStatus === "pending_review" ? "submitted" : "idle");
  const [error, setError] = useState("");
  const [currentStatus, setCurrentStatus] = useState(props.initialStatus || "pending");
  const [reportHref, setReportHref] = useState<string | null>(null);
  const [autoJumpIn, setAutoJumpIn] = useState<number | null>(null); // 3-2-1 倒计时

  const router = useRouter();

  // 根据 target_type 拼报告链接
  const buildReportHref = (targetType: string, targetId: string) => {
    if (targetType === "personality_report") return `/personality/report/${targetId}`;
    if (targetType === "single_report" || targetType === "pair_report") return `/result/${targetId}`;
    return props.backHref;
  };

  // mount 后再 GET 一次最新状态（覆盖「已通过 / 已驳回」后客户刷新页面的情况）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/payments/${props.paymentId}/status`);
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        if (j?.status) {
          setCurrentStatus(j.status);
          if (j.status === "pending_review" && status !== "submitted") setStatus("submitted");
          if (j.status === "paid") {
            setReportHref(buildReportHref(j.target_type, j.target_id));
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
    // 仅在挂载时取一次；后续点击 handled by handleClick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.paymentId]);

  // 实时轮询（pending_review 期间，每 10s 查一次；变 paid → 1.5s 后自动跳转）
  // visibilitychange 时立即补一次（用户从微信/其他 app 切回来）
  // 10 分钟超时停轮询，避免给后端持续压力
  useEffect(() => {
    if (currentStatus === "paid" || currentStatus === "cancelled" || currentStatus === "refunded") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // 60 * 10s = 10 分钟
    const POLL_MS = 10_000;

    const jumpTo = (href: string) => {
      if (cancelled) return;
      // 3-2-1 倒计时
      setAutoJumpIn(3);
      let n = 3;
      const tick = () => {
        if (cancelled) return;
        n -= 1;
        if (n <= 0) { router.push(href); return; }
        setAutoJumpIn(n);
        setTimeout(tick, 1000);
      };
      setTimeout(tick, 1000);
    };

    const check = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const r = await fetch(`/api/payments/${props.paymentId}/status`, { cache: "no-store" });
        if (cancelled) return;
        if (!r.ok) { schedule(); return; }
        const j = await r.json();
        if (cancelled) return;
        if (j?.status === "paid") {
          const href = buildReportHref(j.target_type ?? "", j.target_id ?? "");
          setReportHref(href);
          setCurrentStatus("paid");
          jumpTo(href);
          return;
        }
      } catch {
        // 网络抖动：下次再查
      }
      schedule();
    };

    const schedule = () => {
      if (cancelled || attempts >= MAX_ATTEMPTS) return;
      timer = setTimeout(check, POLL_MS);
    };

    // 立即查一次（用户可能挂起页面很久再回来）
    check();

    // 切回前台时立刻再查（避免长间隔错过）
    const onVis = () => {
      if (!cancelled && document.visibilityState === "visible") {
        if (timer) { clearTimeout(timer); timer = null; }
        check();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [currentStatus, props.paymentId, router]);

  const handleClick = async () => {
    if (status === "submitting" || status === "submitted") return;
    if (currentStatus === "pending_review" || currentStatus === "paid" || currentStatus === "refunded") return;
    setStatus("submitting");
    setError("");
    try {
      await props.onConfirm();
      setStatus("submitted");
      setCurrentStatus("pending_review");
    } catch (e: any) {
      setError(e?.message || "提交失败，请稍后重试");
      setStatus("idle");
    }
  };

  const isWechat = typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);

  const isLocked =
    currentStatus === "pending_review" ||
    currentStatus === "paid" ||
    currentStatus === "refunded" ||
    status === "submitted";

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

      {currentStatus === "paid" ? (
        <div className="space-y-2">
          <p className="text-[15px] text-[var(--accent)] font-medium">
            ✓ 已通过审核，报告已解锁
          </p>
          {autoJumpIn !== null && (
            <p className="text-xs text-[var(--text-muted)]">
              {autoJumpIn} 秒后自动跳转到报告页…
            </p>
          )}
          <Link
            href={reportHref || props.backHref}
            className="btn-primary w-full inline-flex items-center justify-center"
          >
            立即查看完整报告 →
          </Link>
        </div>
      ) : currentStatus === "pending_review" || status === "submitted" ? (
        <div className="space-y-2">
          <p className="text-[15px] text-[var(--accent)] font-medium">
            ✓ 已收到你的付款确认
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            管理员核对后会立即解锁，<br />
            这里会在审核通过后自动跳转到报告页（约 1-30 分钟）。
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            如果着急可以加微信 <span className="text-[var(--accent)]">moonphase_helper</span> 催一下
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-2 opacity-60">
            本订单只需提交一次，刷新页面不会重复发起。
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "submitting" || isLocked}
          className="btn-primary w-full"
        >
          {status === "submitting" ? "提交中..." : "我已支付"}
        </button>
      )}

      {error && (
        <p className="text-[12px] text-[var(--danger)] mt-3 leading-relaxed">{error}</p>
      )}

      {!isLocked && (
        <p className="text-[11px] text-[var(--text-muted)] mt-4 leading-relaxed">
          没收到确认？检查微信支付是否成功 → 重新点「我已支付」即可。
        </p>
      )}

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