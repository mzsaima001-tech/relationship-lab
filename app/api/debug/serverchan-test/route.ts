// =====================================================
// /api/debug/serverchan-test
// 端到端测试 Server酱 推送链路是否正常。
//  - GET  → 自检 + 发送一条测试消息到站长微信
//  - POST → 同上，但允许指定自定义 title / desp
//
// 返回示例：
//   { ok: true, pushid: "...", readkey: "...", sendKeyHead: "SCT4", target: "production" }
//
// 部署后，浏览器访问：https://www.moqilab.top/api/debug/serverchan-test
// 即可在 1-3 秒内看到推送是否到达微信。
// =====================================================

import { NextResponse } from "next/server";
import { sendServerChan } from "@/lib/notify/serverchan";

export const dynamic = "force-dynamic";

export async function GET() {
  return doTest("🧪 Server酱 自检测试", "这是一条调试端点的测试消息，验证推送链路是否通畅。");
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title : "🧪 Server酱 自检测试";
    const desp = typeof body?.desp === "string" ? body.desp : "调试端点的测试消息。";
    return doTest(title, desp);
  } catch {
    return doTest("🧪 Server酱 自检测试", "这是一条调试端点的测试消息，验证推送链路是否通畅。");
  }
}

async function doTest(title: string, desp: string) {
  const sendKey = (process.env.SERVERCHAN_SENDKEY ?? "").trim();
  const target = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
  const sendKeyHead = sendKey ? `${sendKey.slice(0, 4)}...(${sendKey.length} chars)` : "(not set)";

  if (!sendKey) {
    return NextResponse.json({
      ok: false,
      reason: "no_sendkey",
      detail: "SERVERCHAN_SENDKEY env 未配置（Vercel 项目 Settings → Environment Variables）",
      sendKeyHead,
      target,
      timestamp: new Date().toISOString(),
    });
  }

  const ts = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const result = await sendServerChan(title, `${desp}\n\n**触发时间**：${ts}`);

  return NextResponse.json({
    ...result,
    sendKeyHead,
    target,
    timestamp: new Date().toISOString(),
  });
}