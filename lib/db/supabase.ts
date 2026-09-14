// =====================================================
// Supabase Postgres 实现
// 与 lib/db/local.ts 保持同名导出 + 同签名，
// 由 lib/db/index.ts 按 env 切换。
// 本地开发（无 SUPABASE_URL）请保持 import "@/lib/db/local"，
// 不要直接引用本文件。
// =====================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  PERSONALITY_ALGORITHM_VERSION,
  PERSONALITY_REPORT_VERSION,
  type PersonalityAnswerRecord,
  type PersonalityTestRecord,
  type PersonalityOrderRecord,
} from "@/lib/personality/types";

// ---- 单例客户端（懒加载；首次调用时才解析 env）----
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[db.supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置。dev 环境请改 import '@/lib/db/local'。"
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** admin 排查：当前是否处于 Supabase 模式（env 是否齐备） */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function genId() {
  return crypto.randomUUID();
}

const TABLE = {
  sessions: "sessions",
  answers: "answers",
  results: "results",
  invites: "invites",
  shares: "shares",
  pairs: "pairs",
  reports: "reports",
  credits: "credit_accounts",
  payments: "payments",
  personalityTests: "personality_tests",
  personalityAnswers: "personality_answers",
  personalityOrders: "personality_orders",
} as const;

// =====================================================
// 记录类型（与 local.ts 字段一一对应）
// =====================================================

export interface SessionRecord {
  id: string;
  guest_token_hash: string;
  nickname: string;
  age_band: string;
  gender: string;
  partner_gender?: string;
  relationship_type: string;
  relationship_stage: string;
  duration: string;
  current_feeling: string;
  life_stage?: string;
  referred_by_code?: string;
  question_ids: string[];
  followup_ids: string[];
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface AnswerRecord {
  id: string;
  session_id: string;
  question_id: string;
  value: number;
  shown_at?: number;
  answered_at?: number;
  response_time_ms?: number;
  created_at: string;
}

export interface ResultRecord {
  session_id: string;
  dimension_scores: Record<string, number>;
  dimension_results?: Record<string, any>;
  signals: Record<string, any>;
  response_quality?: Record<string, any>;
  consistency?: Record<string, any>;
  report_facts?: Record<string, any>;
  archetype: string;
  tags: string[];
  created_at: string;
  narrative?: Record<string, any>;
  narrative_meta?: Record<string, any>;
}

export interface InviteRecord {
  id: string;
  code: string;
  source_session_id: string;
  status: string;
  created_at: string;
}

export interface ShareRecord {
  id: string;
  code: string;
  source_session_id: string;
  /** undefined / "couple" = 双人默契海报；"personality" = 人格海报；
   *  "personal" = 个人专属邀请码（每人一个、永久，落地首页 /?ref=code） */
  share_type?: "couple" | "personality" | "personal";
  source_test_id?: string;
  visitor_id?: string;
  visits: number;
  completed_visitors?: string[];
  created_at: string;
}

export interface PairRecord {
  id: string;
  session_a: string;
  session_b?: string;
  invite_id?: string;
  status: string;
  created_at: string;
}

export interface ReportRecord {
  id: string;
  report_type: string;
  session_id?: string;
  pair_id?: string;
  preview_content?: any;
  full_content?: any;
  unlocked: boolean;
  prompt_version?: string;
  model_name?: string;
  triggered_rules?: any[];
  created_at: string;
}

export interface CreditTransactionRecord {
  id: string;
  type: "earn_share" | "earn_signup" | "earn_bonus" | "spend_report" | "admin_grant";
  amount: number;
  description: string;
  share_token?: string;
  created_at: string;
}

export interface CreditAccountRecord {
  session_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  shares: number;
  report_unlocked: boolean;
  transactions: CreditTransactionRecord[];
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  target_type: "single_report" | "pair_report" | "personality_report";
  target_id: string;
  amount: number;
  currency: "CNY";
  status: "pending" | "pending_review" | "paid" | "cancelled";
  method: "mock" | "weixin" | "credits" | "xingyifu" | "alipay" | "unionpay";
  created_at: string;
  paid_at?: string;
  gateway_order_no?: string;
  pay_url?: string;
  qr_code?: string;
  paid_method?: "weixin" | "alipay" | "unionpay" | "yunshanfu" | "creditcard";
}

export type {
  PersonalityAnswerRecord,
  PersonalityTestRecord,
  PersonalityOrderRecord,
};

// =====================================================
// Sessions
// =====================================================
export async function createSession(data: Partial<SessionRecord>): Promise<SessionRecord> {
  const record: SessionRecord = {
    id: genId(),
    guest_token_hash: data.guest_token_hash || "",
    nickname: data.nickname || "",
    age_band: data.age_band || "",
    gender: data.gender || "",
    partner_gender: data.partner_gender,
    relationship_type: data.relationship_type || "",
    relationship_stage: data.relationship_stage || "",
    duration: data.duration || "",
    current_feeling: data.current_feeling || "",
    life_stage: data.life_stage,
    referred_by_code: data.referred_by_code,
    question_ids: data.question_ids || [],
    followup_ids: data.followup_ids || [],
    status: data.status || "started",
    created_at: new Date().toISOString(),
  };
  const { error } = await getClient().from(TABLE.sessions).insert(record);
  if (error) throw new Error(`[db.supabase] createSession: ${error.message}`);
  return record;
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.sessions)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getSession: ${error.message}`);
  return (data as SessionRecord | null) ?? null;
}

export async function updateSession(id: string, updates: Partial<SessionRecord>): Promise<void> {
  const { error } = await getClient().from(TABLE.sessions).update(updates).eq("id", id);
  if (error) throw new Error(`[db.supabase] updateSession: ${error.message}`);
}

// =====================================================
// Answers
// =====================================================
export async function addAnswer(
  sessionId: string,
  questionId: string,
  value: number,
  timing?: { shownAt?: number; answeredAt?: number; responseTimeMs?: number }
): Promise<void> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.answers)
    .select("id")
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .maybeSingle();

  const payload = {
    session_id: sessionId,
    question_id: questionId,
    value,
    shown_at: timing?.shownAt ?? null,
    answered_at: timing?.answeredAt ?? null,
    response_time_ms: timing?.responseTimeMs ?? null,
  };

  if (existing) {
    const { error } = await supa.from(TABLE.answers).update(payload).eq("id", (existing as any).id);
    if (error) throw new Error(`[db.supabase] addAnswer(update): ${error.message}`);
  } else {
    const { error } = await supa.from(TABLE.answers).insert({
      id: genId(),
      ...payload,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(`[db.supabase] addAnswer(insert): ${error.message}`);
  }
}

export async function getAnswers(sessionId: string): Promise<AnswerRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.answers)
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw new Error(`[db.supabase] getAnswers: ${error.message}`);
  return (data as AnswerRecord[]) ?? [];
}

// =====================================================
// Results
// =====================================================
export async function saveResult(result: ResultRecord): Promise<void> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.results)
    .select("session_id")
    .eq("session_id", result.session_id)
    .maybeSingle();
  if (existing) {
    const { error } = await supa
      .from(TABLE.results)
      .update(result as any)
      .eq("session_id", result.session_id);
    if (error) throw new Error(`[db.supabase] saveResult(update): ${error.message}`);
  } else {
    const { error } = await supa.from(TABLE.results).insert(result as any);
    if (error) throw new Error(`[db.supabase] saveResult(insert): ${error.message}`);
  }
}

export async function getResult(sessionId: string): Promise<ResultRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.results)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getResult: ${error.message}`);
  return (data as ResultRecord | null) ?? null;
}

// =====================================================
// Invites
// =====================================================
export async function createInvite(sourceSessionId: string): Promise<InviteRecord> {
  const record: InviteRecord = {
    id: genId(),
    code: crypto.randomBytes(6).toString("hex"),
    source_session_id: sourceSessionId,
    status: "waiting",
    created_at: new Date().toISOString(),
  };
  const { error } = await getClient().from(TABLE.invites).insert(record);
  if (error) throw new Error(`[db.supabase] createInvite: ${error.message}`);
  return record;
}

export async function getInviteByCode(code: string): Promise<InviteRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.invites)
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getInviteByCode: ${error.message}`);
  return (data as InviteRecord | null) ?? null;
}

export async function getInviteBySession(sessionId: string): Promise<InviteRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.invites)
    .select("*")
    .eq("source_session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getInviteBySession: ${error.message}`);
  return (data as InviteRecord | null) ?? null;
}

// =====================================================
// Shares
// =====================================================
export interface CreateShareOptions {
  shareType?: "couple" | "personality" | "personal";
  sourceTestId?: string;
  visitorId?: string;
}

export async function createShare(
  sourceSessionId: string,
  options: CreateShareOptions = {}
): Promise<ShareRecord> {
  // personality / personal 类型的 share 没有对应的 session 行：source_session_id 必须置空
  // 以避开 shares 表上的 sessions(id) 外键约束（schema.sql 里 source_session_id 有 REFERENCES）。
  const effectiveSessionId =
    options.shareType === "personality" ||
    options.shareType === "personal" ||
    !sourceSessionId
      ? undefined
      : sourceSessionId;

  const record: ShareRecord = {
    id: genId(),
    code: crypto.randomBytes(6).toString("hex"),
    source_session_id: effectiveSessionId as string,
    share_type: options.shareType,
    source_test_id: options.sourceTestId,
    visitor_id: options.visitorId,
    visits: 0,
    completed_visitors:
      options.shareType === "personality" || options.shareType === "personal"
        ? []
        : undefined,
    created_at: new Date().toISOString(),
  };
  // 过滤 undefined 字段避免 not-null 约束（虽然定义上是可空）
  const payload = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
  const { error } = await getClient().from(TABLE.shares).insert(payload);
  if (error) throw new Error(`[db.supabase] createShare: ${error.message}`);
  return record;
}

export async function recordPersonalityShareCompletion(
  code: string,
  visitorId: string
): Promise<
  | { counted: boolean; visitorCount: number; recommenderTestId: string | null }
  | null
> {
  const supa = getClient();
  const { data: row, error } = await supa
    .from(TABLE.shares)
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] recordPersonalityShareCompletion: ${error.message}`);
  if (!row || (row as any).share_type !== "personality") return null;

  // 防 self-referral:分享者本人扫自己的码,不计有效分享
  if ((row as any).visitor_id && (row as any).visitor_id === visitorId) {
    return {
      counted: false,
      visitorCount: ((row as any).completed_visitors ?? []).length,
      recommenderTestId: (row as any).source_test_id ?? null,
    };
  }

  const completed: string[] = (row as any).completed_visitors ?? [];
  if (completed.includes(visitorId)) {
    return {
      counted: false,
      visitorCount: completed.length,
      recommenderTestId: (row as any).source_test_id ?? null,
    };
  }
  completed.push(visitorId);
  const { error: upErr } = await supa
    .from(TABLE.shares)
    .update({ completed_visitors: completed, visits: completed.length })
    .eq("code", code);
  if (upErr) throw new Error(`[db.supabase] recordPersonalityShareCompletion(update): ${upErr.message}`);
  return {
    counted: true,
    visitorCount: completed.length,
    recommenderTestId: (row as any).source_test_id ?? null,
  };
}

export async function getShareByTestId(testId: string): Promise<ShareRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.shares)
    .select("*")
    .eq("share_type", "personality")
    .eq("source_test_id", testId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getShareByTestId: ${error.message}`);
  return (data as ShareRecord | null) ?? null;
}

export async function getShareByCode(code: string): Promise<ShareRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.shares)
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getShareByCode: ${error.message}`);
  return (data as ShareRecord | null) ?? null;
}

export async function getShareBySession(
  sessionId: string,
  shareType?: "couple" | "personality"
): Promise<ShareRecord | null> {
  let q = getClient().from(TABLE.shares).select("*").eq("source_session_id", sessionId);
  if (shareType) q = q.eq("share_type", shareType);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`[db.supabase] getShareBySession: ${error.message}`);
  return (data as ShareRecord | null) ?? null;
}

export async function incrementShareVisits(code: string): Promise<void> {
  // Postgres 原子自增
  const { error } = await getClient().rpc("increment_share_visits", { p_code: code });
  if (!error) return;
  // 没建 RPC 时降级为 read-modify-write（Supabase 限制：update 不支持字段自增表达式）
  if (error.code === "PGRST202" || /function.*does not exist/i.test(error.message)) {
    const supa = getClient();
    const { data: row } = await supa.from(TABLE.shares).select("visits").eq("code", code).maybeSingle();
    if (!row) return;
    await supa
      .from(TABLE.shares)
      .update({ visits: ((row as any).visits ?? 0) + 1 })
      .eq("code", code);
    return;
  }
  throw new Error(`[db.supabase] incrementShareVisits: ${error.message}`);
}

// =====================================================
// 个人专属邀请码（share_type="personal"）
// 每个 visitor 一个永久码，链接 = 首页 /?ref=code。
// 积分口径：被邀请人完成任意测试并生成报告（免费/付费均可）→ 分享人 +1 分，
// 按被邀请人 visitorId 去重（同一朋友反复测只计 1 分），自己点自己的码不计。
// =====================================================

/** 按 visitorId 查个人邀请码（不创建） */
export async function getPersonalShareByVisitor(
  visitorId: string
): Promise<ShareRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.shares)
    .select("*")
    .eq("share_type", "personal")
    .eq("visitor_id", visitorId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getPersonalShareByVisitor: ${error.message}`);
  return (data as ShareRecord | null) ?? null;
}

/** 取/建个人邀请码（幂等）：有则复用，无则新建 */
export async function getOrCreatePersonalShare(
  visitorId: string
): Promise<ShareRecord> {
  const existing = await getPersonalShareByVisitor(visitorId);
  if (existing) return existing;
  return createShare("", { shareType: "personal", visitorId });
}

/**
 * 个人码归因计分：被邀请人完成测试生成报告后调用。
 * 返回 counted=true 表示本次 +1 分；重复完成 / 自己完成不计。
 * points = 当前累计积分（= 已成功邀请人数）。
 */
export async function recordPersonalShareCompletion(
  code: string,
  visitorId: string
): Promise<{ counted: boolean; points: number } | null> {
  const supa = getClient();
  const { data: row, error } = await supa
    .from(TABLE.shares)
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] recordPersonalShareCompletion: ${error.message}`);
  if (!row || (row as any).share_type !== "personal") return null;

  const completed: string[] = (row as any).completed_visitors ?? [];
  // 防 self-referral：分享者本人不计
  if ((row as any).visitor_id && (row as any).visitor_id === visitorId) {
    return { counted: false, points: completed.length };
  }
  if (completed.includes(visitorId)) {
    return { counted: false, points: completed.length };
  }
  completed.push(visitorId);
  const { error: upErr } = await supa
    .from(TABLE.shares)
    .update({ completed_visitors: completed })
    .eq("code", code);
  if (upErr) throw new Error(`[db.supabase] recordPersonalShareCompletion(update): ${upErr.message}`);
  return { counted: true, points: completed.length };
}

/** 列出全部个人邀请码（后台「邀请积分」页用） */
export async function listPersonalShares(): Promise<ShareRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.shares)
    .select("*")
    .eq("share_type", "personal")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[db.supabase] listPersonalShares: ${error.message}`);
  return (data as ShareRecord[]) ?? [];
}

// =====================================================
// Pairs
// =====================================================
export async function createPair(sessionA: string, inviteId?: string): Promise<PairRecord> {
  const record: PairRecord = {
    id: genId(),
    session_a: sessionA,
    invite_id: inviteId,
    status: "waiting",
    created_at: new Date().toISOString(),
  };
  const { error } = await getClient().from(TABLE.pairs).insert(record);
  if (error) throw new Error(`[db.supabase] createPair: ${error.message}`);
  return record;
}

export async function getPair(id: string): Promise<PairRecord | null> {
  const { data, error } = await getClient().from(TABLE.pairs).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`[db.supabase] getPair: ${error.message}`);
  return (data as PairRecord | null) ?? null;
}

export async function getPairByInvite(inviteId: string): Promise<PairRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.pairs)
    .select("*")
    .eq("invite_id", inviteId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getPairByInvite: ${error.message}`);
  return (data as PairRecord | null) ?? null;
}

/**
 * 反查：根据 session id 找到它所在的 pair（无论 A / B）。
 * 让被分享人（B）的结果页也能拿到 pairId 进入契合画像。
 */
export async function getPairBySession(sessionId: string): Promise<PairRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.pairs)
    .select("*")
    .or(`session_a.eq.${sessionId},session_b.eq.${sessionId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getPairBySession: ${error.message}`);
  return (data as PairRecord | null) ?? null;
}

export async function updatePair(id: string, updates: Partial<PairRecord>): Promise<void> {
  const { error } = await getClient().from(TABLE.pairs).update(updates).eq("id", id);
  if (error) throw new Error(`[db.supabase] updatePair: ${error.message}`);
}

// =====================================================
// Reports
// =====================================================
export async function saveReport(report: ReportRecord): Promise<void> {
  const supa = getClient();
  const key = report.pair_id ? "pair_id" : "session_id";
  const val = report.pair_id ?? report.session_id;
  if (!val) throw new Error("saveReport: pair_id 或 session_id 至少需要一个");

  const { data: existing } = await supa
    .from(TABLE.reports)
    .select("id")
    .eq(key, val)
    .maybeSingle();

  if (existing) {
    const { error } = await supa.from(TABLE.reports).update(report as any).eq("id", (existing as any).id);
    if (error) throw new Error(`[db.supabase] saveReport(update): ${error.message}`);
  } else {
    const { error } = await supa.from(TABLE.reports).insert(report as any);
    if (error) throw new Error(`[db.supabase] saveReport(insert): ${error.message}`);
  }
}

export async function getReportByPair(pairId: string): Promise<ReportRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.reports)
    .select("*")
    .eq("pair_id", pairId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getReportByPair: ${error.message}`);
  return (data as ReportRecord | null) ?? null;
}

export async function getReportBySession(sessionId: string): Promise<ReportRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.reports)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getReportBySession: ${error.message}`);
  return (data as ReportRecord | null) ?? null;
}

export async function updateReportUnlockBySession(
  sessionId: string,
  unlocked: boolean
): Promise<void> {
  const { error } = await getClient()
    .from(TABLE.reports)
    .update({ unlocked })
    .eq("session_id", sessionId);
  if (error) throw new Error(`[db.supabase] updateReportUnlockBySession: ${error.message}`);
}

export async function updateReportUnlockByPair(
  pairId: string,
  unlocked: boolean
): Promise<void> {
  const { error } = await getClient()
    .from(TABLE.reports)
    .update({ unlocked })
    .eq("pair_id", pairId);
  if (error) throw new Error(`[db.supabase] updateReportUnlockByPair: ${error.message}`);
}

// =====================================================
// Credits
// =====================================================
export async function getCreditAccount(sessionId: string): Promise<CreditAccountRecord> {
  const supa = getClient();
  const { data } = await supa
    .from(TABLE.credits)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (data) return data as CreditAccountRecord;

  const now = new Date().toISOString();
  const created: CreditAccountRecord = {
    session_id: sessionId,
    balance: 0,
    total_earned: 0,
    total_spent: 0,
    shares: 0,
    report_unlocked: false,
    transactions: [],
    created_at: now,
    updated_at: now,
  };
  const { error } = await supa.from(TABLE.credits).insert(created);
  if (error) throw new Error(`[db.supabase] getCreditAccount(create): ${error.message}`);
  return created;
}

export async function addCredits(
  sessionId: string,
  amount: number,
  type: CreditTransactionRecord["type"],
  description: string,
  shareToken?: string
): Promise<CreditAccountRecord> {
  const supa = getClient();
  const account = await getCreditAccount(sessionId);
  // 同分享回执只奖励一次
  if (shareToken && account.transactions.some((t) => t.share_token === shareToken)) {
    return account;
  }
  account.balance = Math.round((account.balance + amount) * 10) / 10;
  account.total_earned = Math.round((account.total_earned + Math.max(0, amount)) * 10) / 10;
  if (type === "earn_share") account.shares += 1;
  account.transactions.push({
    id: genId(),
    type,
    amount,
    description,
    share_token: shareToken,
    created_at: new Date().toISOString(),
  });
  account.updated_at = new Date().toISOString();
  const { error } = await supa
    .from(TABLE.credits)
    .update({
      balance: account.balance,
      total_earned: account.total_earned,
      shares: account.shares,
      transactions: account.transactions,
      updated_at: account.updated_at,
    })
    .eq("session_id", sessionId);
  if (error) throw new Error(`[db.supabase] addCredits: ${error.message}`);
  return account;
}

export async function spendCreditsForSingleReport(
  sessionId: string,
  amount: number
): Promise<CreditAccountRecord> {
  const supa = getClient();
  const account = await getCreditAccount(sessionId);
  if (account.report_unlocked) return account;
  if (account.balance < amount) throw new Error("INSUFFICIENT_CREDITS");

  account.balance = Math.round((account.balance - amount) * 10) / 10;
  account.total_spent = Math.round((account.total_spent + amount) * 10) / 10;
  account.report_unlocked = true;
  account.transactions.push({
    id: genId(),
    type: "spend_report",
    amount: -amount,
    description: "解锁单人完整报告",
    created_at: new Date().toISOString(),
  });
  account.updated_at = new Date().toISOString();

  const { error } = await supa
    .from(TABLE.credits)
    .update({
      balance: account.balance,
      total_spent: account.total_spent,
      report_unlocked: account.report_unlocked,
      transactions: account.transactions,
      updated_at: account.updated_at,
    })
    .eq("session_id", sessionId);
  if (error) throw new Error(`[db.supabase] spendCreditsForSingleReport: ${error.message}`);

  await updateReportUnlockBySession(sessionId, true);
  return account;
}

/**
 * 分享集齐免费解锁（不扣余额）：有效分享人数达标后由 unlock 路由调用。
 * 幂等：已解锁直接返回。
 */
export async function unlockReportViaShares(
  sessionId: string
): Promise<CreditAccountRecord> {
  const supa = getClient();
  const account = await getCreditAccount(sessionId);
  if (account.report_unlocked) return account;

  account.report_unlocked = true;
  account.transactions.push({
    id: genId(),
    type: "spend_report",
    amount: 0,
    description: "有效分享集齐，免费解锁单人完整报告",
    created_at: new Date().toISOString(),
  });
  account.updated_at = new Date().toISOString();

  const { error } = await supa
    .from(TABLE.credits)
    .update({
      report_unlocked: true,
      transactions: account.transactions,
      updated_at: account.updated_at,
    })
    .eq("session_id", sessionId);
  if (error) throw new Error(`[db.supabase] unlockReportViaShares: ${error.message}`);

  await updateReportUnlockBySession(sessionId, true);
  return account;
}

// =====================================================
// Payments
// =====================================================
export interface CreatePaymentMeta {
  gatewayOrderNo?: string;
  payUrl?: string;
  qrCode?: string;
}

export async function createPayment(
  targetType: PaymentRecord["target_type"],
  targetId: string,
  amount: number,
  method: PaymentRecord["method"] = "mock",
  meta: CreatePaymentMeta = {}
): Promise<PaymentRecord> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.payments)
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    const updated = {
      ...(existing as PaymentRecord),
      amount,
      method,
      gateway_order_no: meta.gatewayOrderNo ?? (existing as PaymentRecord).gateway_order_no,
      pay_url: meta.payUrl ?? (existing as PaymentRecord).pay_url,
      qr_code: meta.qrCode ?? (existing as PaymentRecord).qr_code,
    };
    const { error } = await supa.from(TABLE.payments).update(updated as any).eq("id", existing.id);
    if (error) throw new Error(`[db.supabase] createPayment(update): ${error.message}`);
    return updated;
  }

  const payment: PaymentRecord = {
    id: genId(),
    target_type: targetType,
    target_id: targetId,
    amount,
    currency: "CNY",
    status: "pending",
    method,
    created_at: new Date().toISOString(),
    gateway_order_no: meta.gatewayOrderNo,
    pay_url: meta.payUrl,
    qr_code: meta.qrCode,
  };
  const { error } = await supa.from(TABLE.payments).insert(payment as any);
  if (error) throw new Error(`[db.supabase] createPayment: ${error.message}`);
  return payment;
}

export async function getPayment(id: string): Promise<PaymentRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.payments)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getPayment: ${error.message}`);
  return (data as PaymentRecord | null) ?? null;
}

export async function updatePaymentGatewayMeta(
  id: string,
  meta: { gatewayOrderNo?: string; payUrl?: string; qrCode?: string }
): Promise<PaymentRecord | null> {
  const supa = getClient();
  const patch: Record<string, any> = {};
  if (meta.gatewayOrderNo) patch.gateway_order_no = meta.gatewayOrderNo;
  if (meta.payUrl) patch.pay_url = meta.payUrl;
  if (meta.qrCode) patch.qr_code = meta.qrCode;
  if (Object.keys(patch).length === 0) return await getPayment(id);
  const { data, error } = await supa
    .from(TABLE.payments)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] updatePaymentGatewayMeta: ${error.message}`);
  return (data as PaymentRecord | null) ?? null;
}

export async function markPaymentPaidMethod(
  id: string,
  paidMethod: PaymentRecord["paid_method"],
  tradeNo?: string
): Promise<void> {
  const patch: Record<string, any> = { paid_method: paidMethod };
  if (tradeNo) patch.gateway_order_no = tradeNo;
  const { error } = await getClient()
    .from(TABLE.payments)
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(`[db.supabase] markPaymentPaidMethod: ${error.message}`);
}

export async function markPaymentPaid(id: string): Promise<PaymentRecord> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.payments)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("PAYMENT_NOT_FOUND");
  const payment = existing as PaymentRecord;

  // 幂等：已 paid 直接返回
  if (payment.status === "paid") {
    return await postPaymentPaidSideEffects(payment);
  }

  const updated: PaymentRecord = {
    ...payment,
    status: "paid",
    paid_at: new Date().toISOString(),
  };
  const { error } = await supa.from(TABLE.payments).update(updated).eq("id", id);
  if (error) throw new Error(`[db.supabase] markPaymentPaid: ${error.message}`);

  return await postPaymentPaidSideEffects(updated);
}

/**
 * 用户点「我已支付」：把订单置为 pending_review，等待管理员在后台确认。
 * 此函数不触发任何解锁副作用——解锁只发生在管理员真正 approvePaymentReview 后。
 * 幂等：已是 paid 或 pending_review 的订单直接返回当前记录。
 */
export async function markPaymentPendingReview(id: string): Promise<PaymentRecord> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.payments)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("PAYMENT_NOT_FOUND");
  const payment = existing as PaymentRecord;

  if (payment.status === "paid" || payment.status === "pending_review") {
    return payment;
  }

  const updated: PaymentRecord = {
    ...payment,
    status: "pending_review",
  };
  const { error } = await supa.from(TABLE.payments).update(updated).eq("id", id);
  if (error) throw new Error(`[db.supabase] markPaymentPendingReview: ${error.message}`);
  return updated;
}

/**
 * 管理员在后台「确认已收」：把 pending_review 订单真正解锁。
 * 复用 markPaymentPaid 的副作用（报告解锁 / 人格测试付费标记 / credit 标记）。
 */
export async function approvePaymentReview(id: string): Promise<PaymentRecord> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.payments)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("PAYMENT_NOT_FOUND");
  const payment = existing as PaymentRecord;
  if (payment.status === "paid") {
    return await postPaymentPaidSideEffects(payment);
  }
  // pending_review 或 pending 都可以被管理员直接 approve（兜底）
  return await markPaymentPaid(id);
}

/**
 * 管理员在后台「驳回」（用户未付款却点了「我已支付」）：把订单置为 cancelled。
 */
export async function rejectPaymentReview(id: string, reason?: string): Promise<PaymentRecord> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.payments)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("PAYMENT_NOT_FOUND");
  const payment = existing as PaymentRecord;
  if (payment.status === "cancelled" || payment.status === "paid") {
    return payment;
  }
  const updated: PaymentRecord = {
    ...payment,
    status: "cancelled",
    paid_method: undefined,
  };
  const { error } = await supa.from(TABLE.payments).update(updated).eq("id", id);
  if (error) throw new Error(`[db.supabase] rejectPaymentReview: ${error.message}`);
  console.warn(`[payment/reject] manual reject · paymentId=${id} · reason=${reason ?? "—"}`);
  return updated;
}

/** 支付完成后的副作用：报告解锁 / 人格测试付费标记 / credit 标记 */
async function postPaymentPaidSideEffects(payment: PaymentRecord): Promise<PaymentRecord> {
  if (payment.target_type === "pair_report") {
    await updateReportUnlockByPair(payment.target_id, true);
  } else if (payment.target_type === "personality_report") {
    await markPersonalityTestPaid(payment.target_id);
  } else {
    await updateReportUnlockBySession(payment.target_id, true);
    // credit 标记：与 local 行为保持一致（report_unlocked=true）
    try {
      const account = await getCreditAccount(payment.target_id);
      if (!account.report_unlocked) {
        await addCredits(payment.target_id, 0, "admin_grant", "支付解锁单人完整报告");
        // addCredits 不会改 report_unlocked，需要直 update
        const supa = getClient();
        await supa
          .from(TABLE.credits)
          .update({
            report_unlocked: true,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", payment.target_id);
      }
    } catch {
      // 没账户也无所谓（匿名用户直接走 report.unlocked）
    }
  }
  return payment;
}

// =====================================================
// Personality
// =====================================================
export async function addPersonalityAnswer(
  testId: string,
  questionId: string,
  paperId: PersonalityTestRecord["paper_id"],
  optionIndex: 0 | 1 | 2 | 3 | 4,
  score: number,
  answeredAtMs: number,
  answerLetter?: PersonalityAnswerRecord["answer_letter"]
): Promise<void> {
  const supa = getClient();
  const { data: existing } = await supa
    .from(TABLE.personalityAnswers)
    .select("id")
    .eq("test_id", testId)
    .eq("question_id", questionId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    test_id: testId,
    question_id: questionId,
    paper_id: paperId,
    option_index: optionIndex,
    score,
    answered_at_ms: answeredAtMs,
  };
  if (answerLetter) payload.answer_letter = answerLetter;
  if (existing) {
    const { error } = await supa
      .from(TABLE.personalityAnswers)
      .update(payload)
      .eq("id", (existing as any).id);
    if (error) throw new Error(`[db.supabase] addPersonalityAnswer(update): ${error.message}`);
  } else {
    const { error } = await supa.from(TABLE.personalityAnswers).insert({
      id: genId(),
      ...payload,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(`[db.supabase] addPersonalityAnswer(insert): ${error.message}`);
  }
}

export async function getPersonalityAnswers(testId: string): Promise<PersonalityAnswerRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.personalityAnswers)
    .select("*")
    .eq("test_id", testId);
  if (error) throw new Error(`[db.supabase] getPersonalityAnswers: ${error.message}`);
  return (data as PersonalityAnswerRecord[]) ?? [];
}

export async function createPersonalityTest(
  visitorId: string,
  referredByCode?: string,
  paperId?: PersonalityTestRecord["paper_id"]
): Promise<PersonalityTestRecord> {
  const now = new Date().toISOString();
  const record: PersonalityTestRecord = {
    id: `PST_${crypto.randomBytes(4).toString("hex")}`,
    visitor_id: visitorId,
    paper_id: paperId ?? "P1",
    status: "started",
    started_at: now,
    is_paid: false,
    shares_count: 0,
    unlocked_via_share: false,
    referred_by_code: referredByCode,
    algorithm_version: PERSONALITY_ALGORITHM_VERSION,
    report_version: PERSONALITY_REPORT_VERSION,
    created_at: now,
    updated_at: now,
  };
  const payload: any = { ...record };
  if (!referredByCode) delete payload.referred_by_code;
  const { error } = await getClient().from(TABLE.personalityTests).insert(payload);
  if (error) throw new Error(`[db.supabase] createPersonalityTest: ${error.message}`);
  return record;
}

export async function getPersonalityTest(id: string): Promise<PersonalityTestRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.personalityTests)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getPersonalityTest: ${error.message}`);
  return (data as PersonalityTestRecord | null) ?? null;
}

export async function listPersonalityTestsByVisitor(
  visitorId: string
): Promise<PersonalityTestRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.personalityTests)
    .select("*")
    .eq("visitor_id", visitorId);
  if (error) throw new Error(`[db.supabase] listPersonalityTestsByVisitor: ${error.message}`);
  return (data as PersonalityTestRecord[]) ?? [];
}

export async function listPersonalityTests(): Promise<PersonalityTestRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.personalityTests)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`[db.supabase] listPersonalityTests: ${error.message}`);
  return (data as PersonalityTestRecord[]) ?? [];
}

export async function updatePersonalityTest(
  id: string,
  updates: Partial<PersonalityTestRecord>
): Promise<PersonalityTestRecord | null> {
  const payload: any = { ...updates, updated_at: new Date().toISOString() };
  const { error } = await getClient()
    .from(TABLE.personalityTests)
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(`[db.supabase] updatePersonalityTest: ${error.message}`);
  return await getPersonalityTest(id);
}

export async function markPersonalityTestPaid(testId: string): Promise<void> {
  await updatePersonalityTest(testId, {
    is_paid: true,
    paid_at: new Date().toISOString(),
  });
}

export async function markPersonalityTestUnlockedViaShare(
  testId: string
): Promise<{ sharesCount: number; unlocked: boolean } | null> {
  const supa = getClient();
  const { data: row } = await supa
    .from(TABLE.personalityTests)
    .select("*")
    .eq("id", testId)
    .maybeSingle();
  if (!row) return null;
  const next = ((row as any).shares_count ?? 0) + 1;
  const unlocked = next >= 5 && !(row as any).is_paid;
  const patch: any = {
    shares_count: next,
    unlocked_via_share: unlocked || (row as any).unlocked_via_share,
    is_paid: (row as any).is_paid || unlocked,
    updated_at: new Date().toISOString(),
  };
  if (!(row as any).is_paid && unlocked) {
    patch.paid_at = new Date().toISOString();
  } else if ((row as any).paid_at) {
    patch.paid_at = (row as any).paid_at;
  }
  const { error } = await supa.from(TABLE.personalityTests).update(patch).eq("id", testId);
  if (error) throw new Error(`[db.supabase] markPersonalityTestUnlockedViaShare: ${error.message}`);
  return { sharesCount: next, unlocked };
}

// =====================================================
// Personality Orders
// =====================================================
export async function createPersonalityOrder(
  testId: string,
  amount: number,
  paymentId: string
): Promise<PersonalityOrderRecord> {
  const record: PersonalityOrderRecord = {
    id: genId(),
    order_no: `PO${Date.now()}${Math.floor(Math.random() * 1000)}`,
    test_id: testId,
    amount,
    payment_id: paymentId,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  const { error } = await getClient().from(TABLE.personalityOrders).insert(record);
  if (error) throw new Error(`[db.supabase] createPersonalityOrder: ${error.message}`);
  return record;
}

export async function getPersonalityOrderByPayment(
  paymentId: string
): Promise<PersonalityOrderRecord | null> {
  const { data, error } = await getClient()
    .from(TABLE.personalityOrders)
    .select("*")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (error) throw new Error(`[db.supabase] getPersonalityOrderByPayment: ${error.message}`);
  return (data as PersonalityOrderRecord | null) ?? null;
}

export async function markPersonalityOrderPaid(
  paymentId: string
): Promise<PersonalityOrderRecord | null> {
  const supa = getClient();
  const { data: row } = await supa
    .from(TABLE.personalityOrders)
    .select("*")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (!row) return null;
  if ((row as any).status === "paid") return row as PersonalityOrderRecord;
  const { error } = await supa
    .from(TABLE.personalityOrders)
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("payment_id", paymentId);
  if (error) throw new Error(`[db.supabase] markPersonalityOrderPaid: ${error.message}`);
  return await getPersonalityOrderByPayment(paymentId);
}

export async function listPersonalityOrders(): Promise<PersonalityOrderRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.personalityOrders)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[db.supabase] listPersonalityOrders: ${error.message}`);
  return (data as PersonalityOrderRecord[]) ?? [];
}

// =====================================================
// Admin listing
// =====================================================
export async function listSessions(): Promise<SessionRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.sessions)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[db.supabase] listSessions: ${error.message}`);
  return (data as SessionRecord[]) ?? [];
}

export async function listResults(): Promise<ResultRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.results)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[db.supabase] listResults: ${error.message}`);
  return (data as ResultRecord[]) ?? [];
}

export async function listReports(): Promise<ReportRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.reports)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[db.supabase] listReports: ${error.message}`);
  return (data as ReportRecord[]) ?? [];
}

export async function listPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await getClient()
    .from(TABLE.payments)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[db.supabase] listPayments: ${error.message}`);
  return (data as PaymentRecord[]) ?? [];
}
