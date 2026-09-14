import { redirect } from "next/navigation";

// =====================================================
// 旧分享落地页 /s/[code]（海报 teaser）已下线。
// 新策略：所有分享链接统一落地首页 /?ref=CODE，
// 归因保留（首页会存码，朋友完成任意测试出报告 → 分享人 +1 积分）。
// 旧海报/旧链接依然有效，扫码后 308 到首页。
// =====================================================
export default async function ShareLandingRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/?ref=${encodeURIComponent(code)}`);
}
