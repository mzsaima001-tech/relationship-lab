// =====================================================
// 免登录订单复核 API（配合 /review/[paymentId] 审批页）
//
// GET  /api/review/[paymentId]?t=<token>  → 订单摘要（供审批页展示）
// POST /api/review/[paymentId]            → { t, action: "approve" | "reject" }
//
// 鉴权：HMAC 签名 token（lib/review-token.ts），代替 admin cookie。
// 与后台 /api/admin/payments/{id}/approve|reject 复用同一套 DB 函数，
// 解锁副作用（报告解锁等）完全一致。
// =====================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { approvePaymentReview, getPayment, rejectPaymentReview } from "@/lib/db";
import { verifyReviewToken } from "@/lib/review-token";

const postSchema = z.object({
  t: z.string().min(8).max(64),
  action: z.enum(["approve", "reject"]),
});

const TARGET_LABEL: Record<string, string> = {
  single_report: "默契测试 · 单人报告",
  pair_report: "默契测试 · 双人报告",
  personality_report: "性格测试 · 完整报告",
};

function summarize(p: NonNullable<Awaited<ReturnType<typeof getPayment>>>) {
  return {
    id: p.id,
    targetType: p.target_type,
    targetLabel: TARGET_LABEL[p.target_type] ?? p.target_type,
    amount: p.amount,
    status: p.status,
    createdAt: p.created_at,
    paidAt: p.paid_at ?? null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!verifyReviewToken(paymentId, token)) {
    return NextResponse.json({ error: "链接无效或已过期" }, { status: 403 });
  }
  const payment = await getPayment(paymentId);
  if (!payment) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  return NextResponse.json({ payment: summarize(payment) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;
    const { t, action } = postSchema.parse(await request.json().catch(() => ({})));
    if (!verifyReviewToken(paymentId, t)) {
      return NextResponse.json({ error: "链接无效或已过期" }, { status: 403 });
    }
    const payment = await getPayment(paymentId);
    if (!payment) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

    // 幂等：已终态的订单直接回报现状，不重复执行副作用
    if (payment.status === "paid") {
      return NextResponse.json({ payment: summarize(payment), message: "该订单已确认过收款" });
    }
    if (payment.status === "cancelled") {
      return NextResponse.json({ payment: summarize(payment), message: "该订单已驳回过" });
    }

    const updated =
      action === "approve"
        ? await approvePaymentReview(paymentId)
        : await rejectPaymentReview(paymentId, "复核页驳回");

    console.warn(
      `[review/${action}] paymentId=${paymentId} · target_type=${updated.target_type} · via=signed-link`
    );
    return NextResponse.json({
      payment: summarize(updated),
      message: action === "approve" ? "已确认收款，报告已解锁" : "已驳回该订单",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效" }, { status: 400 });
    }
    console.error("[review] action failed:", error);
    return NextResponse.json({ error: "操作失败，请重试" }, { status: 500 });
  }
}
