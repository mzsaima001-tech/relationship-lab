// =====================================================
// API 路由错误处理工具（统一捕获并透传真实错误）
//
//  设计要点：
//  - catch 块统一用 respondError(error, "fallback-msg", status)
//  - Zod 校验失败单独处理（不当作 500）
//  - 生产环境错误信息不回传 stack / 内部路径，只回传 error.message
//  - 始终 console.error 完整对象，便于 Vercel logs 排查
// =====================================================

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ErrorResponseOptions {
  /** 兜底的人类可读消息（中文） */
  fallback?: string;
  /** HTTP 状态码，默认 500 */
  status?: number;
  /** 自定义日志前缀，方便排查 */
  logTag?: string;
}

/**
 * 把任意 catch 到的 error 转换为 NextResponse，统一透传 error.message。
 *
 * 约定：
 *  - 业务侧抛出的 Error（如 `[db.supabase] createShare: ...`）会直接 message 透传
 *  - 未知错误：返回 fallback + "[unknown]" 避免泄露内部信息
 *  - ZodError 走专门的 respondZodError
 */
export function respondError(
  error: unknown,
  options: ErrorResponseOptions | string = {},
  status: number = 500
): NextResponse {
  const opts: ErrorResponseOptions = typeof options === "string" ? { fallback: options } : options;
  const tag = opts.logTag ?? "[api]";
  const fallback = opts.fallback ?? "服务异常，请稍后重试";

  // Zod 校验错误：单独处理（不当 500）
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "请求参数无效", details: error.issues },
      { status: 400 }
    );
  }

  // 业务侧主动抛出的 Error：透传 message
  if (error instanceof Error) {
    console.error(`${tag} ${error.name ?? "Error"}: ${error.message}`, error.stack);
    return NextResponse.json(
      { error: `${opts.fallback ? opts.fallback + "：" : ""}${error.message}` },
      { status: opts.status ?? status }
    );
  }

  // 未知错误：不透传原始内容，避免泄露
  console.error(`${tag} Unknown error:`, error);
  return NextResponse.json({ error: fallback }, { status: opts.status ?? status });
}

/**
 * Zod 校验失败的专用 helper
 */
export function respondZodError(error: ZodError): NextResponse {
  return NextResponse.json(
    { error: "请求参数无效", details: error.issues },
    { status: 400 }
  );
}

/**
 * 简单包装：把 catch 块统一收敛到一行
 *
 *  使用示例：
 *    } catch (error) {
 *      return respondError(error, { fallback: "创建测试失败", logTag: "[personality/tests]" });
 *    }
 */
export function safeHandler<T>(
  fn: () => Promise<NextResponse>,
  fallback: string,
  logTag?: string
): Promise<NextResponse> {
  return fn().catch((error) =>
    respondError(error, { fallback, logTag })
  );
}