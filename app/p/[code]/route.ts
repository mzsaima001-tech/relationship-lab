import { NextResponse } from "next/server";

// =====================================================
// 旧人格海报二维码指向 /p/[code]（该路由从未存在过，是死链）。
// 统一 308 到首页 /?ref=CODE：落地首页 + 保留归因。
// =====================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/?ref=${encodeURIComponent(code)}`, 308);
}
