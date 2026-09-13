"use client";

import { useEffect, useState } from "react";

type PaymentRow = {
  id: string;
  target_type: string;
  target_id: string;
  amount: number;
  status: string;
  created_at: string;
};

type ActionResult = {
  ok: boolean;
  message: string;
};

/**
 * 待复核订单列表 + 管理员手动确认 / 驳回操作。
 * 静态收款码 + 手动确认方案专用。
 *
 * 数据来源：复用 /api/admin/overview 已有的 payments 列表（不要重复拉）。
 * 操作端点：/api/admin/payments/{id}/approve 或 /reject（需 admin cookie）。
 */
export default function PendingReviewTable({
  payments,
  onChanged,
}: {
  payments: PaymentRow[];
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pendingReview = payments.filter((p) => p.status === "pending_review");

  async function callApproveReject(action: "approve" | "reject", paymentId: string) {
    setBusy(`${action}:${paymentId}`);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "操作失败");
      setSuccess(action === "approve" ? "已确认收款，报告已解锁" : "已驳回该订单");
      onChanged?.();
    } catch (e: any) {
      setError(e.message || "操作失败");
    } finally {
      setBusy(null);
    }
  }

  if (pendingReview.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        暂无待复核订单。用户点击支付页「我已支付」后会出现在这里。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {success && (
        <div
          className="text-sm px-3 py-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-700"
        >
          {success}
        </div>
      )}
      {error && (
        <div
          className="text-sm px-3 py-2 rounded border border-rose-200 bg-rose-50 text-rose-700"
        >
          {error}
        </div>
      )}
      <div className="space-y-2.5">
        {pendingReview.map((p) => {
          const label =
            p.target_type === "pair_report"
              ? "双人报告"
              : p.target_type === "personality_report"
              ? "人格报告"
              : "单人报告";
          const isBusy = busy === `approve:${p.id}` || busy === `reject:${p.id}`;
          return (
            <div
              key={p.id}
              className="border border-[var(--border-dim)] rounded-lg p-3.5 sm:p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] tracking-wider font-medium bg-amber-100 text-amber-800">
                      待复核
                    </span>
                    <span className="text-[var(--text-warm)] font-medium text-sm">{label}</span>
                    <span className="font-mono text-[var(--accent)] text-sm">¥{p.amount}</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] space-y-0.5">
                    <div>
                      订单号{" "}
                      <span className="font-mono">{p.id.slice(0, 8).toUpperCase()}</span>
                      {" · "}
                      目标 {p.target_id.slice(0, 8)}
                    </div>
                    <div>用户上报于 {new Date(p.created_at).toLocaleString("zh-CN")}</div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => callApproveReject("reject", p.id)}
                    className="text-xs px-3 py-1.5 rounded border border-[var(--border-dim)] hover:bg-[var(--border-dim)] disabled:opacity-50"
                  >
                    {busy === `reject:${p.id}` ? "处理中..." : "驳回"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => callApproveReject("approve", p.id)}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === `approve:${p.id}` ? "处理中..." : "确认已收"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}