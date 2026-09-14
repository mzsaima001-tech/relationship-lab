"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

/**
 * /review/[paymentId]?t=<签名>
 * 免登录订单复核页：Server酱推送里的链接直达这里，
 * 站长核对微信到账后一键「确认已收 / 驳回」。
 */

type PaymentSummary = {
  id: string;
  targetType: string;
  targetLabel: string;
  amount: number;
  status: "pending" | "pending_review" | "paid" | "cancelled";
  createdAt: string;
  paidAt: string | null;
};

const STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  pending: { text: "等待用户支付", tone: "#8a6d1f" },
  pending_review: { text: "待复核（用户已点「我已支付」）", tone: "#8a6d1f" },
  paid: { text: "已确认收款 · 报告已解锁", tone: "#2e7d32" },
  cancelled: { text: "已驳回", tone: "#9a3412" },
};

function ReviewPage() {
  const params = useParams<{ paymentId: string }>();
  const sp = useSearchParams();
  const paymentId = params.paymentId;
  const token = sp.get("t") ?? "";

  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"" | "approve" | "reject">("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/review/${paymentId}?t=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setPayment(json.payment);
      } catch (e: any) {
        setError(e.message || "加载失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId, token]);

  const act = async (action: "approve" | "reject") => {
    if (busy) return;
    setBusy(action);
    setMessage("");
    try {
      const res = await fetch(`/api/review/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "操作失败");
      setPayment(json.payment);
      setMessage(json.message || "");
    } catch (e: any) {
      setMessage(e.message || "操作失败，请重试");
    } finally {
      setBusy("");
    }
  };

  const actionable = payment && (payment.status === "pending_review" || payment.status === "pending");
  const status = payment ? STATUS_LABEL[payment.status] : null;

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#26221a] px-5 py-10 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <p className="text-xs tracking-[0.3em] text-[#8a8375] mb-1 text-center">默契研究所 · 订单复核</p>
        <h1 className="text-xl font-bold text-center mb-6">收款确认</h1>

        {loading ? (
          <p className="text-center text-sm text-[#8a8375]">加载订单中…</p>
        ) : error ? (
          <div className="rounded-xl border border-[#e3ddcf] bg-white p-5 text-center">
            <p className="text-sm text-[#9a3412]">{error}</p>
            <p className="text-xs text-[#8a8375] mt-2">链接可能已被篡改，请从最新推送进入</p>
          </div>
        ) : payment ? (
          <div className="rounded-xl border border-[#e3ddcf] bg-white p-5">
            <dl className="text-sm space-y-2.5">
              <div className="flex justify-between">
                <dt className="text-[#8a8375]">类型</dt>
                <dd className="font-medium">{payment.targetLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8a8375]">金额</dt>
                <dd className="font-bold text-lg">¥{payment.amount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8a8375]">状态</dt>
                <dd className="font-medium" style={{ color: status?.tone }}>{status?.text}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8a8375]">下单时间</dt>
                <dd>{new Date(payment.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8a8375]">订单号</dt>
                <dd className="text-xs break-all ml-4 text-right">{payment.id}</dd>
              </div>
            </dl>

            {actionable ? (
              <>
                <p className="text-xs text-[#8a8375] mt-4 leading-relaxed">
                  先去微信「账单」核对这笔钱是否到账，再点下面按钮：
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => act("approve")}
                    disabled={!!busy}
                    className="flex-1 rounded-lg bg-[#2e7d32] text-white py-3 text-sm font-medium disabled:opacity-50"
                  >
                    {busy === "approve" ? "处理中…" : "✓ 确认已收"}
                  </button>
                  <button
                    type="button"
                    onClick={() => act("reject")}
                    disabled={!!busy}
                    className="flex-1 rounded-lg border border-[#d9d2c0] py-3 text-sm text-[#9a3412] disabled:opacity-50"
                  >
                    {busy === "reject" ? "处理中…" : "✕ 驳回（未付款）"}
                  </button>
                </div>
              </>
            ) : null}

            {message ? (
              <p className="text-sm text-center mt-4" style={{ color: payment.status === "paid" ? "#2e7d32" : "#9a3412" }}>
                {message}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-[11px] text-[#b3ab98] text-center mt-6">
          本页面通过签名链接访问，请勿把链接转发给他人
        </p>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ReviewPage />
    </Suspense>
  );
}
