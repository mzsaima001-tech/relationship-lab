import { NextResponse } from "next/server";
import { listPersonalityTests } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/keepalive
 * Vercel Cron 每天调用一次（vercel.json: 0 1 * * *，UTC 01:00 = 北京 09:00）。
 * 仅做一次最轻量的 Supabase 读，防止免费版项目 7 天闲置被自动暂停。
 * degraded 也返回 200，避免 cron 告警噪音（真故障由业务接口暴露）。
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await listPersonalityTests();
    return NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.warn("[keepalive] supabase ping degraded:", message);
    return NextResponse.json({
      ok: false,
      degraded: true,
      reason: message,
      at: new Date().toISOString(),
    });
  }
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
