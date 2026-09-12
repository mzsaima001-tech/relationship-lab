"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { OrnamentDivider, StarMap } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import { PAYMENT_CONFIG } from "@/lib/site";
import { SINGLE_REPORT_PRICE } from "@/lib/assessment/types";

interface PayInfo {
  payment: { id: string; amount: number; status: string };
  price: number;
  payable: number;
  credits: { balance: number; shares: number };
  payUrl?: string | null;
  live?: boolean;
  unlocked?: boolean;
}

export default function PayPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [info, setInfo] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    async function createOrder() {
      try {
        const res = await fetch("/api/payments/single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "订单创建失败");
        setInfo(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    createOrder();
  }, [sessionId]);

  const handleConfirm = async () => {
    if (!info?.payment) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/payments/${info.payment.id}/confirm`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "确认失败");
      router.push(`/result/${sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setConfirming(false);
    }
  };

  const handleUnlockWithCredits = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/credits/${sessionId}/unlock`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解锁失败");
      router.push(`/result/${sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm mt-4">正在创建订单...</p>
      </main>
    );
  }

  if (error && !info) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <Link href={`/result/${sessionId}`} className="btn-ghost">返回报告</Link>
      </main>
    );
  }

  if (!info) return null;

  const alreadyUnlocked = info.unlocked || info.payment.status === "paid";
  const payable = info.payable ?? 0;

  return (
    <main className="night-sky flex-1 px-5 py-8 sm:px-6 sm:py-12 max-w-lg mx-auto w-full safe-bottom">
      <StarMap opacity={0.12} />
      <div className="relative">
        {/* 订单头部 */}
        <div className="text-center mb-7 sm:mb-8">
          <p className="archive-label mb-3">Unlock · Complete Report</p>
          <h1 className="display-serif text-xl sm:text-2xl text-[var(--text-warm)]">解锁完整个人报告</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            原型深读 · 六维细读 · 隐藏信号 · 建议与话术，一次全部展开
          </p>
          <OrnamentDivider className="mt-5" />
        </div>

        {alreadyUnlocked ? (
          <div className="card p-5 sm:p-6 text-center">
            <p className="text-sm text-[var(--text-warm)] mb-4">这份报告已经解锁过了。</p>
            <Link href={`/result/${sessionId}`} className="btn-primary w-full sm:w-auto">查看我的报告 →</Link>
          </div>
        ) : payable === 0 ? (
          /* 积分足够 → 直接解锁 */
          <div className="card p-5 sm:p-6 text-center">
            <p className="display-serif text-lg text-[var(--text-warm)] mb-2">积分足够，直接解锁</p>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              当前积分 {info.credits.balance.toFixed(1)}，已抵扣全部 ¥{SINGLE_REPORT_PRICE.toFixed(1)}。
            </p>
            <button onClick={handleUnlockWithCredits} disabled={confirming} className="btn-primary w-full">
              {confirming ? "解锁中..." : "用积分解锁完整报告"}
            </button>
          </div>
        ) : (
          <>
            {/* 金额明细 */}
            <div className="card p-4 sm:p-5 mb-6">
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm text-[var(--text-muted)]">单人完整报告</span>
                <span className="text-sm text-[var(--text-warm)] whitespace-nowrap">¥{info.price.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm text-[var(--text-muted)]">
                  积分抵扣（余额 {info.credits.balance.toFixed(1)}）
                </span>
                <span className="text-sm text-[var(--accent)] whitespace-nowrap">
                  -¥{Math.min(info.credits.balance, info.price).toFixed(1)}
                </span>
              </div>
              <div className="h-px bg-[var(--border-dim)] my-3" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text-warm)]">应付金额</span>
                <span className="display-serif text-xl sm:text-2xl text-[var(--accent)]">¥{payable.toFixed(1)}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                差一点点？<Link href={`/result/${sessionId}`} className="text-[var(--accent)] underline underline-offset-2">分享给朋友</Link>——每 1 位朋友完成测评，得 ¥1 抵扣。
              </p>
            </div>

            {/* 真网关在线：跳转到网关 payUrl（由上游完成扣款 → 通知 → 解锁） */}
            {info.live && info.payUrl ? (
              <div className="card p-5 sm:p-6 text-center">
                <p className="archive-label mb-4">去支付</p>
                <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
                  将跳转至星驿付完成支付，支付成功后系统会自动解锁完整报告，无需刷新页面。
                </p>
                <a href={info.payUrl} className="btn-primary w-full">前往支付 →</a>
              </div>
            ) : (
              <div className="card p-5 sm:p-6 text-center">
                <p className="archive-label mb-4">扫码付款</p>
                <div className="inline-block rounded-xl bg-white p-3 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={PAYMENT_CONFIG.aggregateQr}
                    alt="收款码"
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <p className="text-sm text-[var(--text-warm)] mt-4">
                  请支付 <span className="text-[var(--accent)] font-medium">¥{payable.toFixed(1)}</span>
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {PAYMENT_CONFIG.channels} · 长按或截图扫码支付
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  订单号 {info.payment.id.slice(0, 8).toUpperCase()}
                </p>

                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="btn-primary w-full mt-6"
                >
                  {confirming ? "确认中..." : "我已完成付款，解锁报告"}
                </button>
                <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">
                  当前为开发阶段：付款后点击上方按钮立即解锁；正式部署后由支付网关异步回调自动确认。
                </p>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-[var(--danger)] text-center mt-4">{error}</p>}

        <div className="text-center mt-8">
          <Link
            href={`/result/${sessionId}`}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
          >
            ← 返回我的报告
          </Link>
        </div>

        <HomeFooter />
      </div>
    </main>
  );
}
