// =====================================================
// 「我到底什么性格」人格测试 — AI 润色引擎外壳
//
// 沿用 lib/reports/narrative.ts 的 runPolishItems 通用引擎，只换 items 收集器和 prompt。
// 设计要点（与情感报告对齐）：
//   - 失败/超时/未开启 → applied=false，绝不阻塞出报告
//   - 模型选择：默认 gem-3.5-flash-lite（与情感报告同 model，经实测 28s 内可完成 ~6 模块润色）
//   - prompt_version：v1.0-ai-polish（人格版独立版本号，便于后续 A/B 与按版本回滚）
// =====================================================

import { runPolishItems } from "@/lib/reports/narrative";
import {
  PERSONALITY_POLISH_PROMPT_VERSION,
  PERSONALITY_POLISH_SYSTEM_PROMPT,
  collectPersonalityPolishItems,
} from "./content/polish-prompts";

export interface PersonalityPolishResult {
  fullReport: any;
  /** 是否真的调用了 LLM 并成功改写 */
  applied: boolean;
  model?: string;
  /** 失败原因（仅用于日志，不展示给用户） */
  error?: string;
  /** prompt 版本，落到数据库 narrative_meta.prompt_version */
  promptVersion: string;
}

/**
 * 用 LLM 润色人格报告全 16 模块的表达层。
 * 失败/超时/未开启 → 原样返回模板版，绝不阻塞出报告。
 *
 * 注意：人格报告一次性产出 ≈30 条文案 + 总字符量 ~5000-8000 字，
 * 上游网关约 30s 掐断连接，需分块跑（runPolishItems 内置 chunkSize=12、concurrency=4、
 * chunkChars=1200 已覆盖绝大多数场景）。
 */
export async function polishPersonalityReportWithLLM(fullReport: any): Promise<PersonalityPolishResult> {
  const items = collectPersonalityPolishItems(fullReport);
  const r = await runPolishItems(fullReport, items, PERSONALITY_POLISH_SYSTEM_PROMPT);
  return {
    fullReport,
    applied: r.applied,
    model: r.model,
    error: r.error,
    promptVersion: PERSONALITY_POLISH_PROMPT_VERSION,
  };
}
