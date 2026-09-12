import "server-only";
import fs from "fs";
import path from "path";
import type { Question, ReportRule, PairPattern } from "@/lib/assessment/types";
import { allQuestions as seedQuestions } from "@/lib/assessment/question-bank";
import { REPORT_RULES } from "@/lib/reports/rules";
import { PAIR_PATTERNS } from "@/lib/assessment/pair-patterns";
import type { PersonalityQuestion } from "@/lib/personality/questions";
import { PERSONALITY_QUESTIONS } from "@/lib/personality/questions";

// =====================================================
// 内容资产数据仓（可编辑 JSON 存储）
// 首次访问时从 TS 题库 seed 到 .local-db/content/*.json
// 之后以后台编辑的 JSON 为准（TS 文件仅作为初始种子）
// =====================================================

const CONTENT_DIR = path.join(process.cwd(), ".local-db", "content");
const QUESTIONS_FILE = path.join(CONTENT_DIR, "questions.json");
const RULES_FILE = path.join(CONTENT_DIR, "rules.json");
const PATTERNS_FILE = path.join(CONTENT_DIR, "patterns.json");
const PERSONALITY_QUESTIONS_FILE = path.join(CONTENT_DIR, "personality-questions.json");

export const QUESTION_BANK_VERSION = "QB-V2.0.1";
export const REPORT_RULE_VERSION = "RRE-V1.1";
export const PAIR_ENGINE_VERSION = "PAIR-V1.0";
export const PERSONALITY_QUESTION_BANK_VERSION = "PQB-V1.0.0";

export interface ContentFile<T> {
  version: string;
  updatedAt: string;
  items: T[];
}

interface CacheEntry {
  mtimeMs: number;
  data: unknown;
}
const cache = new Map<string, CacheEntry>();

function ensureDir() {
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

function loadFile<T>(file: string, version: string, seed: T[]): ContentFile<T> {
  ensureDir();
  if (!fs.existsSync(file)) {
    const data: ContentFile<T> = {
      version,
      updatedAt: new Date().toISOString(),
      items: seed,
    };
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    cache.set(file, { mtimeMs: fs.statSync(file).mtimeMs, data });
    return data;
  }
  const mtimeMs = fs.statSync(file).mtimeMs;
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit.data as ContentFile<T>;
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as ContentFile<T>;
  cache.set(file, { mtimeMs, data });
  return data;
}

function saveFile<T>(file: string, data: ContentFile<T>) {
  ensureDir();
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  cache.set(file, { mtimeMs: fs.statSync(file).mtimeMs, data });
}

// ---------- Questions ----------

export function loadQuestionStore(): ContentFile<Question> {
  return loadFile(QUESTIONS_FILE, QUESTION_BANK_VERSION, seedQuestions);
}

export function saveQuestionStore(store: ContentFile<Question>) {
  saveFile(QUESTIONS_FILE, store);
}

/** 引擎使用：返回全部题目（含 inactive，由调用方按 active 过滤） */
export function getAllQuestions(): Question[] {
  return loadQuestionStore().items;
}

export function getQuestionById(id: string): Question | undefined {
  return loadQuestionStore().items.find(q => q.id === id);
}

function activeByPhase(phase: Question["phase"]): Question[] {
  return loadQuestionStore().items.filter(q => q.phase === phase && q.active !== false);
}

export function getCoreQuestions(): Question[] {
  return activeByPhase("core");
}

export function getRelationshipQuestions(): Question[] {
  return activeByPhase("relationship");
}

export function getLifeStageQuestions(): Question[] {
  return activeByPhase("life_stage");
}

export function getConsistencyQuestions(): Question[] {
  return activeByPhase("consistency");
}

export function getFollowupQuestions(): Question[] {
  return activeByPhase("followup");
}

// ---------- Report Rules ----------

export function loadRuleStore(): ContentFile<ReportRule & { active?: boolean }> {
  return loadFile(RULES_FILE, REPORT_RULE_VERSION, [...REPORT_RULES]);
}

export function saveRuleStore(store: ContentFile<ReportRule & { active?: boolean }>) {
  saveFile(RULES_FILE, store);
}

/** 引擎使用：active === false 的规则不参与报告生成 */
export function getReportRules(): ReportRule[] {
  return loadRuleStore().items.filter(r => r.active !== false);
}

// ---------- Pair Patterns ----------

export function loadPatternStore(): ContentFile<PairPattern & { active?: boolean }> {
  return loadFile(PATTERNS_FILE, PAIR_ENGINE_VERSION, [...PAIR_PATTERNS]);
}

export function savePatternStore(store: ContentFile<PairPattern & { active?: boolean }>) {
  saveFile(PATTERNS_FILE, store);
}

/** 引擎使用：active === false 的模式不参与配对分析 */
export function getPairPatterns(): PairPattern[] {
  return loadPatternStore().items.filter(p => p.active !== false);
}

// ---------- Personality Questions ----------

export function loadPersonalityQuestionStore(): ContentFile<PersonalityQuestion> {
  return loadFile(PERSONALITY_QUESTIONS_FILE, PERSONALITY_QUESTION_BANK_VERSION, [...PERSONALITY_QUESTIONS]);
}

export function savePersonalityQuestionStore(store: ContentFile<PersonalityQuestion>) {
  saveFile(PERSONALITY_QUESTIONS_FILE, store);
}

/** 引擎使用：返回全部人格题（含 inactive，由调用方按 active 过滤） */
export function getAllPersonalityQuestions(): PersonalityQuestion[] {
  return loadPersonalityQuestionStore().items;
}

export function getPersonalityQuestionById(id: string): PersonalityQuestion | undefined {
  return loadPersonalityQuestionStore().items.find(q => q.id === id);
}

/** 引擎使用：返回启用中的人格题（按 order 升序）
 *  生产环境（Vercel serverless）下直接读 TS seed，跳过 fs 文件读写。
 */
export function getActivePersonalityQuestions(): PersonalityQuestion[] {
  const items = PERSONALITY_QUESTIONS.filter(q => q.active !== false);
  return [...items].sort((a, b) => a.order - b.order);
}

/** 引擎使用：返回启用中的 followup 题（按 order 升序）
 *  生产环境（Vercel serverless）下直接读 TS seed。
 */
export function getFollowupQuestions(): Question[] {
  const items = seedQuestions.filter(q => q.phase === "followup" && q.active !== false);
  return [...items].sort((a, b) => a.order - b.order);
}
