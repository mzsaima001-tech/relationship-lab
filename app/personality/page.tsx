// =====================================================
// /personality → /personality-v2
//
// v5 系统已正式取代 v1。
// - 测试入口（此路径）永久重定向到 v2
// - 旧的 /personality/{test,result,report,analyzing,card-preview} 子页保留供
//   任何历史分享链接存活；新用户不再进入。
// =====================================================

import { redirect } from "next/navigation";

export default function PersonalityEntryRedirect(): never {
  redirect("/personality-v2");
}
