"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { OrnamentDivider, StarMap } from "@/app/components/decor";
import { SafeLink } from "@/app/components/SafeLink";
import HomeFooter from "@/app/components/HomeFooter";
import { PAYMENT_CONFIG } from "@/lib/site";
import StaticQrPayCard from "@/app/components/StaticQrPayCard";
import { SINGLE_REPORT_PRICE } from "@/lib/assessment/types";

interface PayInfo {
  payment: { id: string; amount: number; status: string };
  price: number;
  payable: number;
  credits: { balance: number; shares: number };
  payUrl?: string | null;
  qrCode?: string | null;
  live?: boolean;
  unlocked?: boolean;
}

function isInWechat(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

export default function PayPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [info, setInfo] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [inWechat, setInWechat] = useState(false);

  useEffect(() => {
    setInWechat(isInWechat());
    void createOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const createOrder = async () => {
    setLoading(true);
    setError("");
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
      setError(err.message || "订单创建失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!info?.payment) return;
    const res = await fetch(`/api/payments/${info.payment.id}/confirm`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "确认失败");
    // 静态码方案：confirm 路由只把 status 改成 pending_review，不直接解锁。
    // 这里抛出去让 StaticQrPayCard 显示「已收到付款确认」等待管理员审核。
  };

  const handleUnlockWithCredits = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/credits/${sessionId}/unlock`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解锁失败");
      // 软跳转回结果页（同上）
      router.push(`/result/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "解锁失败");
      setConfirming(false);
    }
  };

  /** 真网关回调：用 payUrl / qrCode 在线返回的二维码 / 跳转链接 */
  // (静态码方案不走这条分支，留作未来接入网关时使用)

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
        <button onClick={createOrder} className="btn-ghost">重试创建订单</button>
        <Link href={`/result/${sessionId}`} className="text-xs text-[var(--text-muted)]">← 返回报告</Link>
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
            <SafeLink
              href={`/result/${sessionId}`}
              className="btn-primary w-full sm:w-auto inline-flex"
            >
              查看我的报告 →
            </SafeLink>
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

            {/* 真网关在线：按 payUrl / qrCode 分流展示 */}
            {info.live && (info.payUrl || info.qrCode) ? (
              <div className="card p-5 sm:p-6 text-center">
                <p className="archive-label mb-4">扫码或前往支付</p>
                {info.qrCode ? (
                  <>
                    <div className="inline-block rounded-xl bg-white p-3 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={info.qrCode}
                        alt="收款二维码"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-3 leading-relaxed">
                      微信 / 支付宝 / 银联 任意一个扫码即可完成支付
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      订单号 {info.payment.id.slice(0, 8).toUpperCase()}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
                      将跳转至星驿付完成支付，支付成功后系统会自动解锁完整报告。
                    </p>
                    {/* 用 a 标签直接打开外部支付网关（保留 next 路由会失败） */}
                    <a href={info.payUrl!} className="btn-primary w-full inline-flex items-center justify-center">
                      前往支付 →
                    </a>
                    {inWechat && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">
                        检测到你在微信中，点击按钮后浏览器会自动打开支付页
                      </p>
                    )}
                  </>
                )}

                <p className="text-[11px] text-[var(--text-muted)] mt-4 leading-relaxed">
                  付款成功后系统会在 3-5 秒内自动跳转至完整报告，无需任何操作。
                </p>
              </div>
            ) : (
              /* 静态收款码方案（2026-09-14 起）：扫码 → 我已支付 → 管理员后台确认 */
              <StaticQrPayCard
                amount={payable}
                orderNo={info.payment.id.slice(0, 8).toUpperCase()}
                paymentId={info.payment.id}
                confirmKind="single"
                onConfirm={handleConfirm}
                backHref={`/result/${sessionId}`}
                initialStatus={info.payment.status as "pending" | "pending_review" | "paid" | "cancelled" | "refunded"}
              />
            )}
          </>
        )}

        {error && <p className="text-sm text-center mt-4 px-3 py-2 rounded bg-[rgba(220,80,80,0.08)] border border-[rgba(220,80,80,0.25)]" style={{ color: "var(--text-warm)" }}>{error}</p>}

        <HomeFooter />
      </div>
    </main>
  );
}