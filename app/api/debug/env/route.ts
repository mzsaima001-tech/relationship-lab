import { NextResponse } from "next/server";

/**
 * GET /api/debug/env
 * 仅用于排查 Vercel 环境变量是否配置正确。
 * - 不显示真实 key（只显示长度 + 前 4 字符）
 * - 列出所有 AI 链路相关 env vars
 */
export async function GET() {
  const aiKey = process.env.AI_API_KEY ?? "";
  const maskedKey = aiKey
    ? `${aiKey.slice(0, 4)}...(${aiKey.length} chars)`
    : "(not set)";

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    aiPolishEnabled: process.env.AI_POLISH_ENABLED ?? "(not set)",
    aiBaseUrl: process.env.AI_BASE_URL ?? "(default: https://api.lk888.ai/v1)",
    aiModel: process.env.AI_MODEL ?? "(default: deepseek-v4-flash)",
    aiModelMain: process.env.AI_MODEL_MAIN ?? "(not set)",
    aiApiKey: maskedKey,
    adminPasswordSet: !!process.env.ADMIN_PASSWORD,
    supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    dbMode: process.env.DB_MODE ?? "auto (default)",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "(not set)",
    timestamp: new Date().toISOString(),
  });
}