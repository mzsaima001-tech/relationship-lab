// =====================================================
// DB 抽象层入口（统一对外接口）
// dev / production 兼容：
//   - DB_MODE=force_local → 强制本地 JSON（debug 用）
//   - DB_MODE=auto (默认) → 有 SUPABASE_URL + SERVICE_ROLE_KEY 自动走云端
//                          否则降级本地 JSON
//
// 切换无需改 import 路径：所有业务文件 import "@/lib/db" 即可。
// =====================================================

import * as localMod from "@/lib/db/local";
import * as supaMod from "@/lib/db/supabase";
import { isSupabaseConfigured } from "@/lib/db/supabase";

function shouldUseSupabase(): boolean {
  const mode = (process.env.DB_MODE ?? "auto").toLowerCase();
  if (mode === "force_local") return false;
  return isSupabaseConfigured();
}

// 注意：此分支在模块首次加载时评估。
// dev 环境永远走 localMod（即使写了 SUPABASE_URL）。production 默认走 supaMod。
const USE_SUPABASE = shouldUseSupabase();

if (process.env.NODE_ENV !== "test") {
  console.log(
    `[db] backend=${USE_SUPABASE ? "supabase" : "local-json"} mode=${process.env.DB_MODE ?? "auto"}`
  );
}

// 用条件 re-export 透传当前 backend 的全部命名导出。
// export * 在每个分支内只跑一次，因此一个进程内只会看到一个实现。
/* eslint-disable @typescript-eslint/no-var-requires */
import type * as LocalBackend from "@/lib/db/local";
const backend: typeof LocalBackend = USE_SUPABASE ? supaMod : localMod;

export const {
  // Sessions
  createSession,
  getSession,
  updateSession,
  // Answers
  addAnswer,
  getAnswers,
  // Results
  saveResult,
  getResult,
  // Invites
  createInvite,
  getInviteByCode,
  getInviteBySession,
  // Shares
  createShare,
  recordPersonalityShareCompletion,
  getShareByTestId,
  getShareByCode,
  getShareBySession,
  incrementShareVisits,
  // 个人专属邀请码
  getPersonalShareByVisitor,
  getOrCreatePersonalShare,
  recordPersonalShareCompletion,
  listPersonalShares,
  unlockReportViaShares,
  // Pairs
  createPair,
  getPair,
  getPairByInvite,
  getPairBySession,
  updatePair,
  // Reports
  saveReport,
  getReportByPair,
  getReportBySession,
  updateReportUnlockBySession,
  updateReportUnlockByPair,
  // Credits
  getCreditAccount,
  addCredits,
  spendCreditsForSingleReport,
  // Payments
  createPayment,
  getPayment,
  updatePaymentGatewayMeta,
  markPaymentPaidMethod,
  markPaymentPaid,
  markPaymentPendingReview,
  approvePaymentReview,
  rejectPaymentReview,
  // Personality tests / answers / orders
  addPersonalityAnswer,
  getPersonalityAnswers,
  createPersonalityTest,
  getPersonalityTest,
  listPersonalityTestsByVisitor,
  listPersonalityTests,
  updatePersonalityTest,
  markPersonalityTestPaid,
  markPersonalityTestUnlockedViaShare,
  createPersonalityOrder,
  getPersonalityOrderByPayment,
  markPersonalityOrderPaid,
  listPersonalityOrders,
  // Admin listings
  listSessions,
  listResults,
  listReports,
  listPayments,
} = backend;

// 类型 re-export（始终用 local 的，因为 supabase 字段一致但 TS 类型可能推断弱）
export type {
  SessionRecord,
  AnswerRecord,
  ResultRecord,
  InviteRecord,
  ShareRecord,
  PairRecord,
  ReportRecord,
  CreditTransactionRecord,
  CreditAccountRecord,
  PaymentRecord,
  CreateShareOptions,
  PersonalityAnswerRecord,
  PersonalityTestRecord,
  PersonalityOrderRecord,
} from "@/lib/db/local";