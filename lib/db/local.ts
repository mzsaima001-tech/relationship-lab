import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// =====================================================
// Local JSON-file-based mock database
// Replaces Supabase for local development.
// To switch to real Supabase, replace this file with
// lib/supabase/admin.ts and use the Supabase client.
// =====================================================

const DATA_DIR = path.join(process.cwd(), ".local-db");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const ANSWERS_FILE = path.join(DATA_DIR, "answers.json");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const INVITES_FILE = path.join(DATA_DIR, "invites.json");
const PAIRS_FILE = path.join(DATA_DIR, "pairs.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const SHARES_FILE = path.join(DATA_DIR, "shares.json");
const CREDITS_FILE = path.join(DATA_DIR, "credits.json");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const PERSONALITY_TESTS_FILE = path.join(DATA_DIR, "personality-tests.json");
const PERSONALITY_ANSWERS_FILE = path.join(DATA_DIR, "personality-answers.json");
const PERSONALITY_ORDERS_FILE = path.join(DATA_DIR, "personality-orders.json");

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

async function readJson<T>(file: string): Promise<T[]> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf-8");
  } catch (err: any) {
    // 文件不存在（首次启动 / 新表）— 等价于空集合，正常路径
    if (err?.code === "ENOENT") return [];
    // 其他读错误（权限、磁盘）— 让上层看出来，不要静默吞
    throw err;
  }
  try {
    const parsed = JSON.parse(raw);
    // 容错：JSON 合法但不是数组（被人为改坏 schema）— 备份 + 视为空表
    if (!Array.isArray(parsed)) {
      const corruptedAt = new Date().toISOString();
      try {
        const backupPath = `${file}.corrupt.${Date.now()}.bak`;
        await fs.rename(file, backupPath);
        console.warn(
          `[readJson] ${file} 内容不是数组（type=${typeof parsed}），已备份到 ${backupPath}，返回空集合 [${corruptedAt}]`
        );
      } catch (backupErr: any) {
        console.warn(
          `[readJson] ${file} 内容不是数组（type=${typeof parsed}），备份失败：${backupErr?.message}。直接返回空集合以保站点可用。`,
          backupErr
        );
      }
      return [];
    }
    return parsed as T[];
  } catch (parseErr: any) {
    // JSON 解析失败（文件被截断 / 写盘中断 / 手动改坏）— 备份 + 空集合
    const corruptedAt = new Date().toISOString();
    try {
      const backupPath = `${file}.corrupt.${Date.now()}.bak`;
      await fs.rename(file, backupPath);
      console.warn(
        `[readJson] ${file} JSON 解析失败 (${parseErr?.message})，已备份到 ${backupPath}，返回空集合 [${corruptedAt}]`
      );
    } catch (backupErr: any) {
      console.warn(
        `[readJson] ${file} JSON 解析失败 (${parseErr?.message})，备份失败：${backupErr?.message}。直接返回空集合以保站点可用。`,
        backupErr
      );
    }
    return [];
  }
}

async function writeJson<T>(file: string, data: T[]) {
  await ensureDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

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
  /** 来源分享码（朋友通过 /s/[code] 落地后开始测评时写入），用于有效分享归因 */
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
  /** 报告叙事层（含 LLM 润色结果），生成一次后缓存，避免重复调用 AI */
  narrative?: Record<string, any>;
  /** 叙事层元信息：source = ai | template */
  narrative_meta?: Record<string, any>;
}

export interface InviteRecord {
  id: string;
  code: string;
  source_session_id: string;
  status: string;
  created_at: string;
}

/**
 * 普通分享记录（区别于 InviteRecord：不进入双人模式、不创建 pair）。
 * 用于结果页「分享海报给朋友」裂变拉新。
 * 同表支持双人默契（share_type=undefined 兼容默认）与人格测试（share_type="personality"）。
 */
export interface ShareRecord {
  id: string;
  code: string;
  source_session_id: string;
  /** 来源类型：undefined / "couple" = 双人默契海报；"personality" = 人格测试海报；
   *  "personal" = 个人专属邀请码（每人一个、永久，落地首页 /?ref=code） */
  share_type?: "couple" | "personality" | "personal";
  /** 人格测试时填：人格测试 ID（PST_xxx） */
  source_test_id?: string;
  /** 人格测试时填：游客 ID（便于本地恢复草稿） */
  visitor_id?: string;
  visits: number;
  /**
   * 已通过此分享码完成人格测评的 visitorIds（去重）
   * 用于"有效分享"计数：每有一个新 visitor 完成，源 test +1，最多 5
   */
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

/**
 * 支付方式分类：
 *  - mock / weixin / credits：历史数据,继续保留以兼容已有支付记录
 *  - xingyifu：一律代表真实网关（聚合微信/支付宝/银联,具体由网关 pay_type 配置决定）
 *  - weixin_live / alipay_live / unionpay_live：如果日后要按渠道区分记账,可在此基础上累加
 */
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
  /** 网关订单号（星驿付 trade_no，通知 / 主动查询 对账用） */
  gateway_order_no?: string;
  /** 网关返回的支付跳转链接（H5 / 公众号跳转） */
  pay_url?: string;
  /** 网关返回的二维码图片 URL（聚合码让用户任扫） */
  qr_code?: string;
  /** 实际到账的支付渠道（用户在网关侧选择了微信/支付宝/银联） */
  paid_method?: "weixin" | "alipay" | "unionpay" | "yunshanfu" | "creditcard";
}

function genId() {
  return crypto.randomUUID();
}

// ---- Sessions ----
export async function createSession(data: Partial<SessionRecord>): Promise<SessionRecord> {
  const sessions = await readJson<SessionRecord>(SESSIONS_FILE);
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
  sessions.push(record);
  await writeJson(SESSIONS_FILE, sessions);
  return record;
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const sessions = await readJson<SessionRecord>(SESSIONS_FILE);
  return sessions.find((s) => s.id === id) || null;
}

export async function updateSession(id: string, updates: Partial<SessionRecord>): Promise<void> {
  const sessions = await readJson<SessionRecord>(SESSIONS_FILE);
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx !== -1) {
    sessions[idx] = { ...sessions[idx], ...updates };
    await writeJson(SESSIONS_FILE, sessions);
  }
}

// ---- Answers ----
export async function addAnswer(
  sessionId: string,
  questionId: string,
  value: number,
  timing?: { shownAt?: number; answeredAt?: number; responseTimeMs?: number }
): Promise<void> {
  const answers = await readJson<AnswerRecord>(ANSWERS_FILE);
  const existingIdx = answers.findIndex(
    (a) => a.session_id === sessionId && a.question_id === questionId
  );
  const timingData = {
    shown_at: timing?.shownAt,
    answered_at: timing?.answeredAt,
    response_time_ms: timing?.responseTimeMs,
  };
  if (existingIdx !== -1) {
    answers[existingIdx] = {
      ...answers[existingIdx],
      value,
      ...timingData,
    };
  } else {
    answers.push({
      id: genId(),
      session_id: sessionId,
      question_id: questionId,
      value,
      ...timingData,
      created_at: new Date().toISOString(),
    });
  }
  await writeJson(ANSWERS_FILE, answers);
}

export async function getAnswers(sessionId: string): Promise<AnswerRecord[]> {
  const answers = await readJson<AnswerRecord>(ANSWERS_FILE);
  return answers.filter((a) => a.session_id === sessionId);
}

// ---- Results ----
export async function saveResult(result: ResultRecord): Promise<void> {
  const results = await readJson<ResultRecord>(RESULTS_FILE);
  const idx = results.findIndex((r) => r.session_id === result.session_id);
  if (idx !== -1) {
    results[idx] = result;
  } else {
    results.push(result);
  }
  await writeJson(RESULTS_FILE, results);
}

export async function getResult(sessionId: string): Promise<ResultRecord | null> {
  const results = await readJson<ResultRecord>(RESULTS_FILE);
  return results.find((r) => r.session_id === sessionId) || null;
}

// ---- Invites ----
export async function createInvite(sourceSessionId: string): Promise<InviteRecord> {
  const invites = await readJson<InviteRecord>(INVITES_FILE);
  const code = crypto.randomBytes(6).toString("hex");
  const record: InviteRecord = {
    id: genId(),
    code,
    source_session_id: sourceSessionId,
    status: "waiting",
    created_at: new Date().toISOString(),
  };
  invites.push(record);
  await writeJson(INVITES_FILE, invites);
  return record;
}

export async function getInviteByCode(code: string): Promise<InviteRecord | null> {
  const invites = await readJson<InviteRecord>(INVITES_FILE);
  return invites.find((i) => i.code === code) || null;
}

export async function getInviteBySession(sessionId: string): Promise<InviteRecord | null> {
  const invites = await readJson<InviteRecord>(INVITES_FILE);
  return invites.find((i) => i.source_session_id === sessionId) || null;
}

// ---- Shares（普通分享，非双人邀请） ----
export interface CreateShareOptions {
  shareType?: "couple" | "personality" | "personal";
  sourceTestId?: string;
  visitorId?: string;
}

export async function createShare(
  sourceSessionId: string,
  options: CreateShareOptions = {}
): Promise<ShareRecord> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  const record: ShareRecord = {
    id: genId(),
    code: crypto.randomBytes(6).toString("hex"),
    source_session_id: sourceSessionId,
    ...(options.shareType ? { share_type: options.shareType } : {}),
    ...(options.sourceTestId ? { source_test_id: options.sourceTestId } : {}),
    ...(options.visitorId ? { visitor_id: options.visitorId } : {}),
    visits: 0,
    completed_visitors:
      options.shareType === "personality" || options.shareType === "personal"
        ? []
        : undefined,
    created_at: new Date().toISOString(),
  };
  shares.push(record);
  await writeJson(SHARES_FILE, shares);
  return record;
}

/**
 * 记录人格分享码的下游完成（每人一票，去重）。
 * 新访客完成测评后调用 → 给推荐者 test.shares_count +1。
 * 返回：
 * - counted: bool — 这次是否计入（首次 true，重复 false；自己扫自己也是 false）
 * - visitorCount: 当前有效完成人数
 * - recommenderTestId: 推荐者的 testId
 */
export async function recordPersonalityShareCompletion(
  code: string,
  visitorId: string
): Promise<
  | { counted: boolean; visitorCount: number; recommenderTestId: string | null }
  | null
> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  const share = shares.find((s) => s.code === code);
  if (!share || share.share_type !== "personality") return null;

  // 防 self-referral:分享者本人扫自己的码,不计有效分享
  if (share.visitor_id && share.visitor_id === visitorId) {
    return {
      counted: false,
      visitorCount: share.completed_visitors?.length ?? 0,
      recommenderTestId: share.source_test_id ?? null,
    };
  }

  const completed = share.completed_visitors ?? [];
  if (completed.includes(visitorId)) {
    return {
      counted: false,
      visitorCount: completed.length,
      recommenderTestId: share.source_test_id ?? null,
    };
  }
  completed.push(visitorId);
  share.completed_visitors = completed;
  share.visits = completed.length; // 同时刷新 visits 以便落地页展示
  await writeJson(SHARES_FILE, shares);
  return {
    counted: true,
    visitorCount: completed.length,
    recommenderTestId: share.source_test_id ?? null,
  };
}

/**
 * 人格测试专用：根据 testId 找已有分享码（幂等复用）。
 */
export async function getShareByTestId(testId: string): Promise<ShareRecord | null> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  return (
    shares.find((s) => s.share_type === "personality" && s.source_test_id === testId) ||
    null
  );
}

export async function getShareByCode(code: string): Promise<ShareRecord | null> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  return shares.find((s) => s.code === code) || null;
}

export async function getShareBySession(
  sessionId: string,
  shareType?: "couple" | "personality"
): Promise<ShareRecord | null> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  return (
    shares.find(
      (s) =>
        s.source_session_id === sessionId &&
        (!shareType || s.share_type === shareType)
    ) || null
  );
}

export async function incrementShareVisits(code: string): Promise<void> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  const share = shares.find((s) => s.code === code);
  if (share) {
    share.visits += 1;
    await writeJson(SHARES_FILE, shares);
  }
}

// ---- 个人专属邀请码（share_type="personal"）----
// 每个 visitor 一个永久码，链接 = 首页 /?ref=code。
// 积分口径：被邀请人完成任意测试并生成报告（免费/付费均可）→ 分享人 +1 分，
// 按被邀请人 visitorId 去重（同一朋友反复测只计 1 分），自己点自己的码不计。

/** 按 visitorId 查个人邀请码（不创建） */
export async function getPersonalShareByVisitor(
  visitorId: string
): Promise<ShareRecord | null> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  return (
    shares.find(
      (s) => s.share_type === "personal" && s.visitor_id === visitorId
    ) || null
  );
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
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  const share = shares.find((s) => s.code === code);
  if (!share || share.share_type !== "personal") return null;

  const completed = share.completed_visitors ?? [];
  // 防 self-referral：分享者本人不计
  if (share.visitor_id && share.visitor_id === visitorId) {
    return { counted: false, points: completed.length };
  }
  if (completed.includes(visitorId)) {
    return { counted: false, points: completed.length };
  }
  completed.push(visitorId);
  share.completed_visitors = completed;
  await writeJson(SHARES_FILE, shares);
  return { counted: true, points: completed.length };
}

/** 列出全部个人邀请码（后台「邀请积分」页用） */
export async function listPersonalShares(): Promise<ShareRecord[]> {
  const shares = await readJson<ShareRecord>(SHARES_FILE);
  return shares
    .filter((s) => s.share_type === "personal")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---- Pairs ----
export async function createPair(sessionA: string, inviteId?: string): Promise<PairRecord> {
  const pairs = await readJson<PairRecord>(PAIRS_FILE);
  const record: PairRecord = {
    id: genId(),
    session_a: sessionA,
    invite_id: inviteId,
    status: "waiting",
    created_at: new Date().toISOString(),
  };
  pairs.push(record);
  await writeJson(PAIRS_FILE, pairs);
  return record;
}

export async function getPair(id: string): Promise<PairRecord | null> {
  const pairs = await readJson<PairRecord>(PAIRS_FILE);
  return pairs.find((p) => p.id === id) || null;
}

export async function getPairByInvite(inviteId: string): Promise<PairRecord | null> {
  const pairs = await readJson<PairRecord>(PAIRS_FILE);
  return pairs.find((p) => p.invite_id === inviteId) || null;
}

/**
 * 反查：根据 session id 找到它所在的 pair。
 * 既适用于 session_a（邀请方）也适用于 session_b（被邀请方）。
 * 用于结果页 PAIR 板块：让被分享人也能直接看到双人契合画像入口。
 */
export async function getPairBySession(sessionId: string): Promise<PairRecord | null> {
  const pairs = await readJson<PairRecord>(PAIRS_FILE);
  return pairs.find(
    (p) => p.session_a === sessionId || p.session_b === sessionId,
  ) || null;
}

export async function updatePair(id: string, updates: Partial<PairRecord>): Promise<void> {
  const pairs = await readJson<PairRecord>(PAIRS_FILE);
  const idx = pairs.findIndex((p) => p.id === id);
  if (idx !== -1) {
    pairs[idx] = { ...pairs[idx], ...updates };
    await writeJson(PAIRS_FILE, pairs);
  }
}

// ---- Reports ----
export async function saveReport(report: ReportRecord): Promise<void> {
  const reports = await readJson<ReportRecord>(REPORTS_FILE);
  const idx = reports.findIndex(
    (r) =>
      (report.pair_id && r.pair_id === report.pair_id) ||
      (report.session_id && r.session_id === report.session_id)
  );
  if (idx !== -1) {
    reports[idx] = report;
  } else {
    reports.push(report);
  }
  await writeJson(REPORTS_FILE, reports);
}

export async function getReportByPair(pairId: string): Promise<ReportRecord | null> {
  const reports = await readJson<ReportRecord>(REPORTS_FILE);
  return reports.find((r) => r.pair_id === pairId) || null;
}

export async function getReportBySession(sessionId: string): Promise<ReportRecord | null> {
  const reports = await readJson<ReportRecord>(REPORTS_FILE);
  return reports.find((r) => r.session_id === sessionId) || null;
}

export async function updateReportUnlockBySession(sessionId: string, unlocked: boolean): Promise<void> {
  const reports = await readJson<ReportRecord>(REPORTS_FILE);
  const index = reports.findIndex(report => report.session_id === sessionId);
  if (index !== -1) {
    reports[index] = { ...reports[index], unlocked };
    await writeJson(REPORTS_FILE, reports);
  }
}

export async function updateReportUnlockByPair(pairId: string, unlocked: boolean): Promise<void> {
  const reports = await readJson<ReportRecord>(REPORTS_FILE);
  const index = reports.findIndex(report => report.pair_id === pairId);
  if (index !== -1) {
    reports[index] = { ...reports[index], unlocked };
    await writeJson(REPORTS_FILE, reports);
  }
}

// ---- Credits ----
export async function getCreditAccount(sessionId: string): Promise<CreditAccountRecord> {
  const accounts = await readJson<CreditAccountRecord>(CREDITS_FILE);
  const existing = accounts.find(account => account.session_id === sessionId);
  if (existing) return existing;

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
  accounts.push(created);
  await writeJson(CREDITS_FILE, accounts);
  return created;
}

export async function addCredits(
  sessionId: string,
  amount: number,
  type: CreditTransactionRecord["type"],
  description: string,
  shareToken?: string
): Promise<CreditAccountRecord> {
  const accounts = await readJson<CreditAccountRecord>(CREDITS_FILE);
  let account = accounts.find(item => item.session_id === sessionId);
  if (!account) {
    const now = new Date().toISOString();
    account = {
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
    accounts.push(account);
  }

  // 同一个分享回执只能奖励一次。
  if (shareToken && account.transactions.some(transaction => transaction.share_token === shareToken)) {
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
  await writeJson(CREDITS_FILE, accounts);
  return account;
}

export async function spendCreditsForSingleReport(
  sessionId: string,
  amount: number
): Promise<CreditAccountRecord> {
  const accounts = await readJson<CreditAccountRecord>(CREDITS_FILE);
  let account = accounts.find(item => item.session_id === sessionId);
  if (!account) {
    account = await getCreditAccount(sessionId);
    return spendCreditsForSingleReport(sessionId, amount);
  }
  if (account.report_unlocked) return account;
  if (account.balance < amount) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

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
  await writeJson(CREDITS_FILE, accounts);
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
  const account = await getCreditAccount(sessionId);
  if (account.report_unlocked) return account;

  const accounts = await readJson<CreditAccountRecord>(CREDITS_FILE);
  const target = accounts.find((item) => item.session_id === sessionId);
  if (target) {
    target.report_unlocked = true;
    target.transactions.push({
      id: genId(),
      type: "spend_report",
      amount: 0,
      description: "有效分享集齐，免费解锁单人完整报告",
      created_at: new Date().toISOString(),
    });
    target.updated_at = new Date().toISOString();
    await writeJson(CREDITS_FILE, accounts);
  }
  await updateReportUnlockBySession(sessionId, true);
  return target ?? account;
}

// ---- Payments (本地开发模拟；云端部署时替换为真实支付回调) ----
export interface CreatePaymentMeta {
  /** 网关订单号（星驿付 trade_no 等） */
  gatewayOrderNo?: string;
  /** 网关返回的支付跳转链接 */
  payUrl?: string;
  /** 网关返回的二维码图片 URL */
  qrCode?: string;
}

export async function createPayment(
  targetType: PaymentRecord["target_type"],
  targetId: string,
  amount: number,
  method: PaymentRecord["method"] = "mock",
  meta: CreatePaymentMeta = {}
): Promise<PaymentRecord> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  const existing = payments.find(payment =>
    payment.target_type === targetType &&
    payment.target_id === targetId &&
    // pending_review 也算"占位订单"：用户点过「我已支付」就在等审核，
    // 刷新页面再调 createPayment 必须返回同一单，不能再开新订单
    // ——否则审核员会收到两笔疑似重复收款，且客户能无限点按钮。
    (payment.status === "pending" || payment.status === "pending_review")
  );
  if (existing) {
    // 真网关场景下,已经创建过 pending 订单 → 把最新网关信息合并进去（防止回调到达前用户刷新页面看不到 pay_url）
    const idx = payments.indexOf(existing);
    payments[idx] = {
      ...existing,
      amount,
      method,
      ...(meta.gatewayOrderNo ? { gateway_order_no: meta.gatewayOrderNo } : {}),
      ...(meta.payUrl ? { pay_url: meta.payUrl } : {}),
      ...(meta.qrCode ? { qr_code: meta.qrCode } : {}),
    };
    await writeJson(PAYMENTS_FILE, payments);
    return payments[idx];
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
  payments.push(payment);
  await writeJson(PAYMENTS_FILE, payments);
  return payment;
}

export async function listSessions(): Promise<SessionRecord[]> {
  return readJson<SessionRecord>(SESSIONS_FILE);
}

export async function listResults(): Promise<ResultRecord[]> {
  return readJson<ResultRecord>(RESULTS_FILE);
}

export async function listReports(): Promise<ReportRecord[]> {
  return readJson<ReportRecord>(REPORTS_FILE);
}

export async function listPayments(): Promise<PaymentRecord[]> {
  return readJson<PaymentRecord>(PAYMENTS_FILE);
}

export async function getPayment(id: string): Promise<PaymentRecord | null> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  return payments.find((payment) => payment.id === id) || null;
}

/**
 * 把网关响应（trade_no / pay_url / qr_code）写回到刚创建的 payment。
 * 用于「先 createPayment、再调网关、最后回填」的链路。
 * 注意：status 永远保持 pending，由 /notify/xingyifu 异步推 paid。
 */
export async function updatePaymentGatewayMeta(
  id: string,
  meta: { gatewayOrderNo?: string; payUrl?: string; qrCode?: string }
): Promise<PaymentRecord | null> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  payments[idx] = {
    ...payments[idx],
    ...(meta.gatewayOrderNo ? { gateway_order_no: meta.gatewayOrderNo } : {}),
    ...(meta.payUrl ? { pay_url: meta.payUrl } : {}),
    ...(meta.qrCode ? { qr_code: meta.qrCode } : {}),
  };
  await writeJson(PAYMENTS_FILE, payments);
  return payments[idx];
}

/**
 * 标记"实际到账渠道"。由 /notify/xingyifu 在确认 paid 后调用,便于后台对账。
 */
export async function markPaymentPaidMethod(
  id: string,
  paidMethod: PaymentRecord["paid_method"],
  tradeNo?: string
): Promise<void> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) return;
  payments[idx] = {
    ...payments[idx],
    paid_method: paidMethod,
    gateway_order_no: tradeNo || payments[idx].gateway_order_no,
  };
  await writeJson(PAYMENTS_FILE, payments);
}

export async function markPaymentPaid(id: string): Promise<PaymentRecord> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  const index = payments.findIndex(payment => payment.id === id);
  if (index === -1) throw new Error("PAYMENT_NOT_FOUND");
  payments[index] = {
    ...payments[index],
    status: "paid",
    paid_at: new Date().toISOString(),
  };
  await writeJson(PAYMENTS_FILE, payments);

  const payment = payments[index];
  if (payment.target_type === "pair_report") {
    await updateReportUnlockByPair(payment.target_id, true);
  } else if (payment.target_type === "personality_report") {
    await markPersonalityTestPaid(payment.target_id);
  } else {
    await updateReportUnlockBySession(payment.target_id, true);
    const accounts = await readJson<CreditAccountRecord>(CREDITS_FILE);
    const account = accounts.find(item => item.session_id === payment.target_id);
    if (account) {
      account.report_unlocked = true;
      account.updated_at = new Date().toISOString();
      await writeJson(CREDITS_FILE, accounts);
    }
  }
  return payment;
}

/** 用户点「我已支付」：把订单置为 pending_review，等待管理员后台确认。不触发任何解锁。 */
export async function markPaymentPendingReview(id: string): Promise<PaymentRecord> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  const index = payments.findIndex(payment => payment.id === id);
  if (index === -1) throw new Error("PAYMENT_NOT_FOUND");
  if (payments[index].status === "paid" || payments[index].status === "pending_review") {
    return payments[index];
  }
  payments[index] = {
    ...payments[index],
    status: "pending_review",
  };
  await writeJson(PAYMENTS_FILE, payments);
  return payments[index];
}

/** 管理员在后台「确认已收」：复用 markPaymentPaid 的副作用真正解锁。 */
export async function approvePaymentReview(id: string): Promise<PaymentRecord> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  const idx = payments.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("PAYMENT_NOT_FOUND");
  if (payments[idx].status === "paid") {
    return payments[idx];
  }
  return await markPaymentPaid(id);
}

/** 管理员在后台「驳回」：把订单置为 cancelled（用户未付款却点了「我已支付」）。 */
export async function rejectPaymentReview(id: string, reason?: string): Promise<PaymentRecord> {
  const payments = await readJson<PaymentRecord>(PAYMENTS_FILE);
  const idx = payments.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("PAYMENT_NOT_FOUND");
  if (payments[idx].status === "cancelled" || payments[idx].status === "paid") {
    return payments[idx];
  }
  payments[idx] = {
    ...payments[idx],
    status: "cancelled",
    paid_method: undefined,
  };
  await writeJson(PAYMENTS_FILE, payments);
  console.warn(`[payment/reject] manual reject · paymentId=${id} · reason=${reason ?? "—"}`);
  return payments[idx];
}

// =====================================================
// 人格测试（独立模块，与原双人默契测试数据隔离）
// =====================================================

import type {
  PersonalityAnswerRecord,
  PersonalityTestRecord,
} from "@/lib/personality/types";
import { PERSONALITY_ALGORITHM_VERSION, PERSONALITY_REPORT_VERSION } from "@/lib/personality/types";

export type {
  PersonalityAnswerRecord,
  PersonalityTestRecord,
} from "@/lib/personality/types";

/** 写入人格测试答案（V3：optionIndex 0-4 + score 1-5） */
export async function addPersonalityAnswer(
  testId: string,
  questionId: string,
  paperId: PersonalityTestRecord["paper_id"],
  optionIndex: 0 | 1 | 2 | 3 | 4,
  score: number,
  answeredAtMs: number,
  answerLetter?: PersonalityAnswerRecord["answer_letter"]
): Promise<void> {
  const answers = await readJson<PersonalityAnswerRecord>(PERSONALITY_ANSWERS_FILE);
  const existingIdx = answers.findIndex(
    (a) => a.test_id === testId && a.question_id === questionId
  );
  const baseFields: PersonalityAnswerRecord = {
    id: "",
    test_id: testId,
    question_id: questionId,
    paper_id: paperId,
    option_index: optionIndex,
    score,
    answer_letter: answerLetter,
    answered_at_ms: answeredAtMs,
    created_at: new Date().toISOString(),
  };
  if (existingIdx !== -1) {
    answers[existingIdx] = { ...answers[existingIdx], ...baseFields };
  } else {
    answers.push({ ...baseFields, id: crypto.randomUUID() });
  }
  await writeJson(PERSONALITY_ANSWERS_FILE, answers);
}

export async function getPersonalityAnswers(
  testId: string
): Promise<PersonalityAnswerRecord[]> {
  const answers = await readJson<PersonalityAnswerRecord>(PERSONALITY_ANSWERS_FILE);
  return answers.filter((a) => a.test_id === testId);
}

export async function createPersonalityTest(
  visitorId: string,
  referredByCode?: string,
  paperId?: PersonalityTestRecord["paper_id"]
): Promise<PersonalityTestRecord> {
  const tests = await readJson<PersonalityTestRecord>(PERSONALITY_TESTS_FILE);
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
  tests.push(record);
  await writeJson(PERSONALITY_TESTS_FILE, tests);
  return record;
}

export async function getPersonalityTest(
  id: string
): Promise<PersonalityTestRecord | null> {
  const tests = await readJson<PersonalityTestRecord>(PERSONALITY_TESTS_FILE);
  return tests.find((t) => t.id === id) || null;
}

export async function listPersonalityTestsByVisitor(
  visitorId: string
): Promise<PersonalityTestRecord[]> {
  const tests = await readJson<PersonalityTestRecord>(PERSONALITY_TESTS_FILE);
  return tests.filter((t) => t.visitor_id === visitorId);
}

/** admin 运维用：列出全部人格测试（无 visitor 过滤），按 updated_at 倒序 */
export async function listPersonalityTests(): Promise<PersonalityTestRecord[]> {
  const tests = await readJson<PersonalityTestRecord>(PERSONALITY_TESTS_FILE);
  return tests.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function updatePersonalityTest(
  id: string,
  updates: Partial<PersonalityTestRecord>
): Promise<PersonalityTestRecord | null> {
  const tests = await readJson<PersonalityTestRecord>(PERSONALITY_TESTS_FILE);
  const idx = tests.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tests[idx] = {
    ...tests[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await writeJson(PERSONALITY_TESTS_FILE, tests);
  return tests[idx];
}

export async function markPersonalityTestPaid(testId: string): Promise<void> {
  await updatePersonalityTest(testId, {
    is_paid: true,
    paid_at: new Date().toISOString(),
  });
}

/**
 * 分享满 N 人 → 自动写 is_paid=true 并标记 unlocked_via_share
 * （与现有支付链路互斥但同时存在：只要任一通道付费即可全量下发报告）
 */
export async function markPersonalityTestUnlockedViaShare(testId: string): Promise<{
  sharesCount: number;
  unlocked: boolean;
} | null> {
  const tests = await readJson<PersonalityTestRecord>(PERSONALITY_TESTS_FILE);
  const test = tests.find((t) => t.id === testId);
  if (!test) return null;
  const next = (test.shares_count ?? 0) + 1;
  const unlocked = next >= 5 && !test.is_paid;
  await updatePersonalityTest(testId, {
    shares_count: next,
    unlocked_via_share: unlocked || test.unlocked_via_share,
    is_paid: test.is_paid || unlocked,
    paid_at: test.is_paid ? test.paid_at : unlocked ? new Date().toISOString() : test.paid_at,
  });
  return { sharesCount: next, unlocked };
}

// ---- 人格测试订单（与 payments 表隔离，便于独立管理） ----
import type { PersonalityOrderRecord } from "@/lib/personality/types";

export type { PersonalityOrderRecord } from "@/lib/personality/types";

export async function createPersonalityOrder(
  testId: string,
  amount: number,
  paymentId: string
): Promise<PersonalityOrderRecord> {
  const orders = await readJson<PersonalityOrderRecord>(PERSONALITY_ORDERS_FILE);
  const record: PersonalityOrderRecord = {
    id: crypto.randomUUID(),
    order_no: `PO${Date.now()}${Math.floor(Math.random() * 1000)}`,
    test_id: testId,
    amount,
    payment_id: paymentId,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  orders.push(record);
  await writeJson(PERSONALITY_ORDERS_FILE, orders);
  return record;
}

export async function getPersonalityOrderByPayment(
  paymentId: string
): Promise<PersonalityOrderRecord | null> {
  const orders = await readJson<PersonalityOrderRecord>(PERSONALITY_ORDERS_FILE);
  return orders.find((o) => o.payment_id === paymentId) || null;
}

export async function markPersonalityOrderPaid(
  paymentId: string
): Promise<PersonalityOrderRecord | null> {
  const orders = await readJson<PersonalityOrderRecord>(PERSONALITY_ORDERS_FILE);
  const idx = orders.findIndex((o) => o.payment_id === paymentId);
  if (idx === -1) return null;
  // 幂等：已 paid 不重复处理
  if (orders[idx].status === "paid") return orders[idx];
  orders[idx] = {
    ...orders[idx],
    status: "paid",
    paid_at: new Date().toISOString(),
  };
  await writeJson(PERSONALITY_ORDERS_FILE, orders);
  return orders[idx];
}

export async function listPersonalityOrders(): Promise<PersonalityOrderRecord[]> {
  return readJson<PersonalityOrderRecord>(PERSONALITY_ORDERS_FILE);
}
