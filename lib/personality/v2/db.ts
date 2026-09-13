// =====================================================
// 人格测试 v5 — 独立 DB（不依赖 lib/db/local.ts 的 v1 schema）
//
// 设计原则：
//   1. 完全独立：只读 .local-db/personality-v2-*.json
//   2. 写 IO 不依赖 supabase / local.ts：v5 数据规模小，本地 JSON 完全够用
//   3. 接口与 v1 db 一致（createTest/getTest/updateTest/addAnswer/...）便于对外调用
// =====================================================

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { V2TestRecord, V2AnswerRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), ".local-db");
const TESTS_FILE = path.join(DATA_DIR, "personality-v2-tests.json");
const ANSWERS_FILE = path.join(DATA_DIR, "personality-v2-answers.json");

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

// ---------------- 测试会话 ----------------

export async function v2CreateTest(
  visitorId: string,
  paperId: V2TestRecord["paper_id"]
): Promise<V2TestRecord> {
  const tests = await readJson<V2TestRecord>(TESTS_FILE);
  const now = new Date().toISOString();
  const record: V2TestRecord = {
    id: `PV2_${crypto.randomBytes(4).toString("hex")}`,
    visitor_id: visitorId,
    paper_id: paperId,
    status: "started",
    started_at: now,
    algorithm_version: "v5-moonphase-2026-09-13",
  };
  tests.push(record);
  await writeJson(TESTS_FILE, tests);
  return record;
}

export async function v2GetTest(id: string): Promise<V2TestRecord | null> {
  const tests = await readJson<V2TestRecord>(TESTS_FILE);
  return tests.find((t) => t.id === id) || null;
}

export async function v2UpdateTest(
  id: string,
  patch: Partial<V2TestRecord>
): Promise<V2TestRecord | null> {
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
  const tests = await readJson<V2TestRecord>(TESTS_FILE);
  return tests
    .filter((t) => t.visitor_id === visitorId)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

// ---------------- 单题答案 ----------------

export async function v2AddAnswer(
  testId: string,
  questionId: string,
  optionIndex: number,
  score: number,
  answeredAtMs: number
): Promise<void> {
  const answers = await readJson<V2AnswerRecord>(ANSWERS_FILE);
  // 同 questionId 覆盖（允许用户回退修改）
  const filtered = answers.filter(
    (a) => !(a.test_id === testId && a.question_id === questionId)
  );
  filtered.push({
    test_id: testId,
    paper_id: "", // complete 时回填（patch），不强制每答一题就写
    question_id: questionId,
    option_index: optionIndex,
    score,
    answered_at_ms: answeredAtMs,
  });
  await writeJson(ANSWERS_FILE, filtered);
}

export async function v2PatchAnswersPaper(testId: string, paperId: string) {
  const answers = await readJson<V2AnswerRecord>(ANSWERS_FILE);
  let changed = false;
  for (const a of answers) {
    if (a.test_id === testId && !a.paper_id) {
      a.paper_id = paperId;
      changed = true;
    }
  }
  if (changed) await writeJson(ANSWERS_FILE, answers);
}

export async function v2GetAnswers(testId: string): Promise<V2AnswerRecord[]> {
  const answers = await readJson<V2AnswerRecord>(ANSWERS_FILE);
  return answers.filter((a) => a.test_id === testId);
}
