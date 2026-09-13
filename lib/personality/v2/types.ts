// =====================================================
// 人格测试 v5 — 公共类型 + 数据契约
//
// 与 lib/personality/types.ts（v1 / 8 种人格原型）完全隔离
// 这里只用一组新维度码：G / X / I / F / S / E
// =====================================================

import type { V2Dimension } from "./dimensions";
import type { V2Card } from "./cards";

export type { V2Dimension, V2Card };

/** 6 维度原始得分向量（每维 6 题 1-5 分累加，落在 [6, 30]） */
export type V2RawScoreVector = Record<V2Dimension, number>;

/** 6 维度 z-score 归一化向量（用于余弦相似度匹配卡） */
export type V2ZScoreVector = Record<V2Dimension, number>;

/** 单题答案（前端提交 → 后端存档） */
export interface V2AnswerRecord {
  test_id: string;
  paper_id: string; // "P1"-"P5"
  question_id: string; // 如 "G01"
  option_index: number; // 0..4（前端已落库时，server 不再重新计算 score）
  score: number; // 选项 score 1-5（已定值，不再 reverse）
  answered_at_ms: number;
}

/** 测试会话记录（DB 行） */
export interface V2TestRecord {
  id: string;
  visitor_id: string;
  paper_id: "P1" | "P2" | "P3" | "P4" | "P5";
  status: "started" | "completed";
  started_at: string;
  completed_at?: string;
  /** 6 维原始分（complete 时填充） */
  g_score?: number;
  x_score?: number;
  i_score?: number;
  f_score?: number;
  s_score?: number;
  e_score?: number;
  /** Top3 卡 ID（complete 时填充） */
  top1_card_id?: string;
  top2_card_id?: string;
  top3_card_id?: string;
  /** 余弦相似度 */
  top1_sim?: number;
  top2_sim?: number;
  top3_sim?: number;
  /** 是否混合型（6 维都中性 + Top1/Top2 太接近） */
  is_mixed?: boolean;
  /** 算法版本号 */
  algorithm_version: string;
}

/** 用户单次答题结果（含 Top3 命中信息） */
export interface V2MatchResult {
  top1: { card: V2Card; sim: number };
  top2: { card: V2Card; sim: number };
  top3: { card: V2Card; sim: number };
  isMixed: boolean;
  mixedNote?: string;
}

/** 算法版本号（v5 月相占盘版本） */
export const V2_ALGORITHM_VERSION = "v5-moonphase-2026-09-13";

/** 完全本地兜底（无 AI 润色）报告 — 不写完整版（v5 仅 Top3 + 判词 + 维度 + 一段文案，不再需要 16 模块报告） */
export interface V2FreeReport {
  top3: Array<{
    rank: 1 | 2 | 3;
    card_id: string;
    card_name: string;
    card_key: string;
    card_line: string;
    card_phase: string;
    card_phase_en: string;
    card_html: string; // iframe 相对路径
    sim: number;
    is_mixed_marker: boolean; // 主卡标记
  }>;
  /** 6 维原始分（前端可直接渲染雷达图） */
  raw_scores: V2RawScoreVector;
  /** 6 维归一化后的 0-100 分（归一化到单维度均值 50、标准差按 max-10 简化） */
  norm_scores: Record<V2Dimension, number>;
  /** 突出维度（按 |z| 绝对值降序取前 2） */
  top_dimensions: Array<{
    key: V2Dimension;
    raw: number;
    z: number;
    summary: string;
  }>;
  /** 上次测试结果对比（localStorage 提升用，前端复用） */
  last_result_comparison?: {
    last_test_at: string;
    last_top1_card_id: string;
    last_top1_card_name: string;
    diff_dimensions: Array<{
      key: V2Dimension;
      last: number;
      now: number;
      delta: number;
    }>;
  };
  /** 抽象一句的金句（30 卡 line 之外，再来个多卡共振句子） */
  cor_line: string;
  /** 算法元信息（debug 用） */
  meta: {
    algorithm_version: string;
    is_mixed: boolean;
    top1_sim: number;
    top2_sim: number;
    top3_sim: number;
  };
}

/** 完整版报告（仅 is_paid=true 返回）— 在 free 基础上加大段解读 */
export interface V2FullReport extends V2FreeReport {
  dimension_readings: Record<V2Dimension, {
    cn: string;
    level_label: "高" | "中高" | "中等" | "中低" | "低";
    analysis: string; // 2-4 段
    in_love: string; // 1 段
    risk: string; // 1 段
  }>;
  cor_long: string; // 600-1200 字深度解读
  action_suggestions: string[];
}
