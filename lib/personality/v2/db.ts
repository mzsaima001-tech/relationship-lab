// =====================================================
// 人格测试 v5 — 双存储后端（dev JSON / prod Supabase）
//
// dev（无 SUPABASE_URL）：读写 .local-db/personality-v2-{tests,answers}.json
// prod（Vercel + 已配 Supabase）：复用 v1 表 personality_tests / personality_answers
//   - 通过 id 前缀 `PV2_` 区分（v1 用 `PST_`）
//   - 通过 algorithm_version = 'v5-moonphase-...' 区分（v1 = 'personality_v1'）
//   - v2 私有字段（6 维分 / Top3 卡 / paper_id / mixed 标记）打包进 free_report_cache jsonb
//
// 这样无需 ALTER TABLE，复用既有 v1 schema 即可上线。
// =====================================================

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { V2TestRecord, V2AnswerRecord } from "./types";
import { V2_ALGORITHM_VERSION } from "./types";

const DATA_DIR = path.join(process.cwd(), ".local-db");
const TESTS_FILE = path.join(DATA_DIR, "personality-v2-tests.json");
const ANSWERS_FILE = path.join(DATA_DIR, "personality-v2-answers.json");

// ---------- Supabase 单例客户端（懒加载） ----------

interface SupabaseLike {
  from: (t: string) => any;
}

let _client: SupabaseLike | null = null;

async function getClient(): Promise<SupabaseLike> {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[v2 db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置（应只在 production 路径上调用到）"
    );
  }
  // 动态 import 避免 dev（无 supabase 包）时启动报错
  const { createClient } = await import("@supabase/supabase-js");
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseLike;
  return _client;
}

function isProd(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ---------- 本地 JSON helper（dev only） ----------

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    /* 已存在 */
  }
}

async function readJson<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[v2 db] ${file} 内容不是数组，返回空集合`);
      return [];
    }
    return parsed as T[];
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
}

async function writeJson<T>(file: string, data: T[]) {
  await ensureDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

// ---------- 类型守卫 + ID helper ----------

const V2_ID_PREFIX = "PV2_";
function makeV2Id(): string {
  return `${V2_ID_PREFIX}${crypto.randomBytes(4).toString("hex")}`;
}

/** v2 私有字段（6 维度 + paper_id + Top3 卡）打包到 free_report_cache JSONB */
interface V2CacheBag {
  paper_id: string;
  g_score?: number;
  x_score?: number;
  i_score?: number;
  f_score?: number;
  s_score?: number;
  e_score?: number;
  top1_card_id?: string;
  top2_card_id?: string;
  top3_card_id?: string;
  top1_sim?: number;
  top2_sim?: number;
  top3_sim?: number;
  is_mixed?: boolean;
  mixed_note?: string;
}

/** 把表行（含 free_report_cache JSONB）转换成 V2TestRecord */
function rowToV2Test(row: any): V2TestRecord {
  const cache: V2CacheBag = (row.free_report_cache as V2CacheBag) || ({} as V2CacheBag);
  return {
    id: row.id,
    visitor_id: row.visitor_id,
    paper_id: ((): V2TestRecord["paper_id"] => {
      const p = cache.paper_id;
      return p === "P1" || p === "P2" || p === "P3" || p === "P4" || p === "P5" ? p : "P1";
    })(),
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at ?? undefined,
    g_score: cache.g_score,
    x_score: cache.x_score,
    i_score: cache.i_score,
    f_score: cache.f_score,
    s_score: cache.s_score,
    e_score: cache.e_score,
    top1_card_id: cache.top1_card_id,
    top2_card_id: cache.top2_card_id,
    top3_card_id: cache.top3_card_id,
    top1_sim: cache.top1_sim,
    top2_sim: cache.top2_sim,
    top3_sim: cache.top3_sim,
    is_mixed: cache.is_mixed,
    algorithm_version: row.algorithm_version ?? V2_ALGORITHM_VERSION,
  };
}

function applyCachePatch(rec: V2TestRecord): { algorithm_version: string; free_report_cache: V2CacheBag } {
  const cache: V2CacheBag = {
    paper_id: rec.paper_id,
    g_score: rec.g_score,
    x_score: rec.x_score,
    i_score: rec.i_score,
    f_score: rec.f_score,
    s_score: rec.s_score,
    e_score: rec.e_score,
    top1_card_id: rec.top1_card_id,
    top2_card_id: rec.top2_card_id,
    top3_card_id: rec.top3_card_id,
    top1_sim: rec.top1_sim,
    top2_sim: rec.top2_sim,
    top3_sim: rec.top3_sim,
    is_mixed: rec.is_mixed,
  };
  return {
    algorithm_version: V2_ALGORITHM_VERSION,
    free_report_cache: cache,
  };
}

// ================= 测试会话 =================

export async function v2CreateTest(
  visitorId: string,
  paperId: V2TestRecord["paper_id"]
): Promise<V2TestRecord> {
  const now = new Date().toISOString();
  if (isProd()) {
    const supa = await getClient();
    const id = makeV2Id();
    const payload = {
      id,
      visitor_id: visitorId,
      status: "started",
      started_at: now,
      is_paid: false,
      shares_count: 0,
      unlocked_via_share: false,
      algorithm_version: V2_ALGORITHM_VERSION,
      report_version: "v5-moonphase",
      free_report_cache: { paper_id: paperId } as V2CacheBag,
      created_at: now,
      updated_at: now,
    };
    const { error } = await supa.from("personality_tests").insert(payload);
    if (error) throw new Error(`[v2 db] createPersonalityTest: ${error.message}`);
    return rowToV2Test(payload);
  }

  // dev: local JSON
  const tests = await readJson<V2TestRecord>(TESTS_FILE);
  const record: V2TestRecord = {
    id: makeV2Id(),
    visitor_id: visitorId,
    paper_id: paperId,
    status: "started",
    started_at: now,
    algorithm_version: V2_ALGORITHM_VERSION,
  };
  tests.push(record);
  await writeJson(TESTS_FILE, tests);
  return record;
}

export async function v2GetTest(id: string): Promise<V2TestRecord | null> {
  if (isProd()) {
    const supa = await getClient();
    const { data, error } = await supa
      .from("personality_tests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`[v2 db] getPersonalityTest: ${error.message}`);
    return data ? rowToV2Test(data) : null;
  }
  const tests = await readJson<V2TestRecord>(TESTS_FILE);
  return tests.find((t) => t.id === id) || null;
}

export async function v2UpdateTest(
  id: string,
  patch: Partial<V2TestRecord>
): Promise<V2TestRecord | null> {
  if (isProd()) {
    const supa = await getClient();
    // 读旧行 → 在新行上 apply patch → 写到 free_report_cache / status / completed_at / updated_at
    const { data: existing, error: e1 } = await supa
      .from("personality_tests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (e1) throw new Error(`[v2 db] preUpdateGet: ${e1.message}`);
    if (!existing) return null;
    const merged: V2TestRecord = { ...rowToV2Test(existing), ...patch };
    const { algorithm_version, free_report_cache } = applyCachePatch(merged);
    const updates: any = {
      status: merged.status,
      completed_at: merged.completed_at ?? existing.completed_at,
      algorithm_version,
      free_report_cache,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supa
      .from("personality_tests")
      .update(updates)
      .eq("id", id);
    if (error) throw new Error(`[v2 db] updatePersonalityTest: ${error.message}`);
    // 返回更新后的完整记录
    const { data: after } = await supa
      .from("personality_tests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return after ? rowToV2Test(after) : null;
  }

  // dev
  const tests = await readJson<V2TestRecord>(TESTS_FILE);
  const idx = tests.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tests[idx] = { ...tests[idx], ...patch };
  await writeJson(TESTS_FILE, tests);
  return tests[idx];
}

export async function v2ListTestsByVisitor(
  visitorId: string
): Promise<V2TestRecord[]> {
  if (isProd()) {
    const supa = await getClient();
    const { data, error } = await supa
      .from("personality_tests")
      .select("*")
      .eq("visitor_id", visitorId)
      .order("started_at", { ascending: false });
    if (error)
      throw new Error(`[v2 db] listPersonalityTestsByVisitor: ${error.message}`);
    return (data ?? []).map((r: any) => rowToV2Test(r));
  }
  const tests = await readJson<V2TestRecord>(TESTS_FILE);
  return tests
    .filter((t) => t.visitor_id === visitorId)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

// ================= 单题答案 =================

export async function v2AddAnswer(
  testId: string,
  questionId: string,
  optionIndex: number,
  score: number,
  answeredAtMs: number
): Promise<void> {
  if (isProd()) {
    const supa = await getClient();
    // v2 用同表 personality_answers：answer_letter 由 optionIndex 0..4 → 'A'..'E'
    const answer_letter = "ABCDE"[optionIndex] ?? "A";
    const payload: any = {
      test_id: testId,
      question_id: questionId,
      answer_letter,
      calculated_score: score,
      answered_at_ms: answeredAtMs,
    };
    // upsert：同 test_id + question_id 覆盖（允许用户回退修改）
    const { error } = await supa
      .from("personality_answers")
      .upsert(payload, { onConflict: "test_id,question_id" });
    if (error)
      throw new Error(`[v2 db] upsertPersonalityAnswer: ${error.message}`);
    return;
  }

  // dev
  const answers = await readJson<V2AnswerRecord>(ANSWERS_FILE);
  const filtered = answers.filter(
    (a) => !(a.test_id === testId && a.question_id === questionId)
  );
  filtered.push({
    test_id: testId,
    paper_id: "",
    question_id: questionId,
    option_index: optionIndex,
    score,
    answered_at_ms: answeredAtMs,
  });
  await writeJson(ANSWERS_FILE, filtered);
}

export async function v2PatchAnswersPaper(_testId: string, _paperId: string) {
  // dev only — production 中 paper_id 不存在表里（写在 test.free_report_cache.paper_id）
  if (isProd()) return;
  const answers = await readJson<V2AnswerRecord>(ANSWERS_FILE);
  let changed = false;
  for (const a of answers) {
    if (a.test_id === _testId && !a.paper_id) {
      a.paper_id = _paperId;
      changed = true;
    }
  }
  if (changed) await writeJson(ANSWERS_FILE, answers);
}

export async function v2GetAnswers(testId: string): Promise<V2AnswerRecord[]> {
  if (isProd()) {
    const supa = await getClient();
    const { data, error } = await supa
      .from("personality_answers")
      .select("*")
      .eq("test_id", testId);
    if (error) throw new Error(`[v2 db] getPersonalityAnswers: ${error.message}`);
    // 字段映射：v1 用 answer_letter(letter)，v2 期望 option_index(0..4)
    return (data ?? []).map((r: any): V2AnswerRecord => ({
      test_id: r.test_id,
      paper_id: "",
      question_id: r.question_id,
      option_index: "ABCDE".indexOf(r.answer_letter ?? "A"),
      score: r.calculated_score,
      answered_at_ms: Number(r.answered_at_ms),
    }));
  }
  const answers = await readJson<V2AnswerRecord>(ANSWERS_FILE);
  return answers.filter((a) => a.test_id === testId);
}
