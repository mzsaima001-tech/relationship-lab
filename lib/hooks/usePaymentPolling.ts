"use client";
import { useEffect, useRef, useState } from "react";

export type PaymentPollingStatus = "pending" | "paid" | "error";

interface UsePaymentPollingOptions {
  /** 订单 ID（payment.id），没有时跳过轮询 */
  paymentId?: string;
  /** 间隔毫秒，默认 2500 */
  intervalMs?: number;
  /** 超时毫秒，到时停止轮询并调用 onTimeout；默认 5 分钟 */
  timeoutMs?: number;
  /** 到账时回调（父组件负责跳转） */
  onPaid?: (paidAt: string | null) => void;
  /** 超时时回调（父组件负责提示用户） */
  onTimeout?: () => void;
}

/**
 * 客户端轮询：每隔 intervalMs 问一次 `/api/payments/{id}/status`，
 * 看到 status === 'paid' 触发 onPaid 并停止，到 timeoutMs 触发 onTimeout。
 *
 * 设计要点：
 *  - 已到账 → 立刻停
 *  - 页面卸载 → 停（防止内存泄漏）
 *  - React 严格模式 effect 双触发 → cancelled 标志位防止重复轮询
 *  - 网络抖动 → 不报错，等下一次
 */
export function usePaymentPolling(opts: UsePaymentPollingOptions): {
  status: PaymentPollingStatus;
} {
  const {
    paymentId,
    intervalMs = 2500,
    timeoutMs = 5 * 60 * 1000,
    onPaid,
    onTimeout,
  } = opts;

  const [status, setStatus] = useState<PaymentPollingStatus>("pending");
  const onPaidRef = useRef(onPaid);
  const onTimeoutRef = useRef(onTimeout);
  onPaidRef.current = onPaid;
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!paymentId) return;
    if (status === "paid") return;

    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;

      // 超时检查
      if (Date.now() - startedAt > timeoutMs) {
        if (onTimeoutRef.current) onTimeoutRef.current();
        return;
      }

      try {
        const res = await fetch(`/api/payments/${paymentId}/status`, {
          cache: "no-store",
        });
        if (cancelled) return;

        if (!res.ok) return; // 404/500 这次跳过，下次再问

        const json = await res.json();
        if (cancelled) return;

        if (json.status === "paid") {
          setStatus("paid");
          if (onPaidRef.current) onPaidRef.current(json.paid_at ?? null);
          return; // 到账，停止后续轮询
        }
      } catch {
        // 网络抖动忽略
        return;
      }

      if (!cancelled) {
        timer = setTimeout(poll, intervalMs);
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = setTimeout(poll, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paymentId, intervalMs, timeoutMs, status]);

  return { status };
}