import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, checkPassword, expectedAdminToken, isAdminPasswordWeak } from "@/lib/admin/auth";

const schema = z.object({ password: z.string().min(1) });

/**
 * 简单的进程内 rate-limit：每 IP 每分钟最多 5 次密码尝试。
 *
 * 注意：Next.js dev / serverless 多实例下此 in-memory 计数只是 base-layer；
 * 生产应在 CDN/Edge（如 Cloudflare / Vercel WAF）补一刀更强的限流。
 *
 * 启动期强校验（缺 ADMIN_PASSWORD 等）由 lib/admin/auth.ts 的 bootCheck 承担；
 * 本路由不显式处理，最终会被 verifyAdminToken 阻击。
 */

type Bucket = { count: number; resetAt: number };
const BUCKETS = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const LIMIT = 5;

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

function take(ip: string): Bucket {
  const now = Date.now();
  const existing = BUCKETS.get(ip);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 0, resetAt: now + WINDOW_MS };
    BUCKETS.set(ip, fresh);
    return fresh;
  }
  return existing;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const bucket = take(ip);
  if (bucket.count >= LIMIT) {
    return NextResponse.json(
      { error: "尝试次数过多，请稍后再试。" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000))),
        },
      }
    );
  }

  let body: { password: string };
  try {
    body = schema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数无效", details: error.issues },
        { status: 400 }
      );
    }
    throw error;
  }

  // 统计：先 +1 再判断，避免错误也算次数但合法错误不增加
  bucket.count += 1;

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const token = await expectedAdminToken();
  const response = NextResponse.json({ ok: true, passwordWeak: isAdminPasswordWeak() });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
