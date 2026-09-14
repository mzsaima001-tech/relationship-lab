"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { OrnamentDivider, StarMap } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import StaticQrPayCard from "@/app/components/StaticQrPayCard";
import { PERSONALITY_REPORT_PRICE } from "@/lib/personality/types";

// =====================================================
// 人格测试支付页 /pay/personality/[testId]
// 与 /pay/[sessionId]（默契单测）布局同款，但订单创建走
// /api/personality/orders，确认走 /api/payment/personality/callback。
// =====================================================

interface PersonalityOrder {
  payment: { id: string; amount: number; status: string };
  order: { id: string; order_no: string; test_id: string };
  price: number;
  payUrl?: string | null;
  qrCode?: string | null;
  live?: boolean;
}

export default function PersonalityPayPage() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();
  const testId = params.testId;

  const [info, setInfo] = useState<PersonalityOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function createOrder() {
      try {
        const res = await fetch(`/api/personality/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId }),
        });
        const json = await res.json();
        if (json.alreadyPaid) {
          // 已付款 → 直接跳完整报告
          router.replace(`/personality/report/${testId}`);
          return;
        }
        if (!res.ok) throw new Error(json.error || "订单创建失败");
        setInfo(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    createOrder();
  }, [testId, router]);

  const handleConfirm = async () => {
    if (!info?.payment) return;
    const res = await fetch(`/api/payment/personality/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: info.payment.id }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "确认失败");
    // 静态码方案：callback 路由只把 status 改成 pending_review，不直接解锁。
  };

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm mt-4">正在创建人格报告订单...</p>
      </main>
    );
  }

  if (error && !info) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <Link href={`/personality/result/${testId}`} className="btn-ghost">
          返回报告
        </Link>
      </main>
    );
  }

  if (!info) return null;

  const price = info.price ?? PERSONALITY_REPORT_PRICE;

  return (
    <main className="night-sky flex-1 px-6 py-12 max-w-lg mx-auto w-full">
      <StarMap opacity={0.12} />
      <div className="relative">
        {/* 订单头部 */}
        <div className="text-center mb-8">
          <p className="archive-label mb-3">Unlock · 人格完整报告</p>
          <h1 className="display-serif text-2xl text-[var(--text-warm)]">解锁你的完整人格</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            16 个模块全展开 — 第二人格、隐藏人格、关系模式、成长建议，全部给你。
          </p>
          <OrnamentDivider className="mt-5" />
        </div>

        {/* 金额明细 */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-muted)]">完整人格报告</span>
            <span className="text-sm text-[var(--text-warm)] line-through opacity-50">
              ¥{(price * 3).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-muted)]">限时解锁价</span>
            <span className="text-sm text-[var(--accent)]">-¥{(price * 2).toFixed(1)}</span>
          </div>
          <div className="h-px bg-[var(--border-dim)] my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-warm)]">应付金额</span>
            <span className="display-serif text-2xl text-[var(--accent)]">
              ¥{price.toFixed(1)}
            </span>
          </div>
        </div>

        {/* 真网关在线：按 qrCode / payUrl 分流 */}
        {info.live && (info.payUrl || info.qrCode) ? (
          <div className="card p-6 text-center">
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
                  微信 / 支付宝 / 银联 任意扫码即可
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  订单号 {info.payment.id.slice(0, 8).toUpperCase()}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
                  将跳转至支付网关完成支付，支付成功后系统会自动解锁完整报告，无需刷新页面。
                </p>
                <a href={info.payUrl!} className="btn-primary w-full">前往支付 →</a>
              </>
            )}

            <p className="text-[11px] text-[var(--text-muted)] mt-4 leading-relaxed">
              付款成功后系统会在 3-5 秒内自动跳转至完整报告，无需任何操作。
            </p>
          </div>
        ) : (
          /* 静态收款码方案（2026-09-14 起）：扫码 → 我已支付 → 管理员后台确认 */
          <StaticQrPayCard
            amount={price}
            orderNo={info.payment.id.slice(0, 8).toUpperCase()}
            paymentId={info.payment.id}
            confirmKind="personality"
            onConfirm={handleConfirm}
            backHref={`/personality/result/${testId}`}
            backLabel="返回我的报告"
            initialStatus={info.payment.status as "pending" | "pending_review" | "paid" | "cancelled" | "refunded"}
          />
        )}

        {error && <p className="text-sm text-[var(--danger)] text-center mt-4">{error}</p>}

        <HomeFooter />
      </div>
    </main>
  );
}