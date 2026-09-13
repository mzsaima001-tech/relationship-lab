import { NextResponse } from "next/server";
import {
  loadQuestionStore,
  loadRuleStore,
  loadPatternStore,
  loadPersonalityQuestionStore,
  QUESTION_BANK_VERSION,
  REPORT_RULE_VERSION,
  PAIR_ENGINE_VERSION,
  PERSONALITY_QUESTION_BANK_VERSION,
} from "@/lib/content/store";
import { questionBank, BANK_GROUPS } from "@/lib/admin/banks";
import { buildArchetypeCatalog } from "@/lib/admin/archetype-catalog";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/assessment/types";
import { PERSONALITY_CARDS } from "@/lib/personality/cards";
import { PERSONALITY_DIMENSIONS, PERSONALITY_DIMENSION_META } from "@/lib/personality/types";

export async function GET() {
  const qStore = loadQuestionStore();
  const rStore = loadRuleStore();
  const pStore = loadPatternStore();
  const pQStore = loadPersonalityQuestionStore();

  const questions = qStore.items;
  const byPhase: Record<string, number> = {};
  const byBank: Record<string, number> = {};
  const byDimension: Record<string, number> = {};
  let active = 0;
  for (const q of questions) {
    byPhase[q.phase] = (byPhase[q.phase] ?? 0) + 1;
    const bank = questionBank(q);
    byBank[bank] = (byBank[bank] ?? 0) + 1;
    if (q.dimension) {
      byDimension[q.dimension] = (byDimension[q.dimension] ?? 0) + 1;
    }
    if (q.active !== false) active++;
  }

  const rules = rStore.items;
  const byCategory: Record<string, number> = {};
  for (const r of rules) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }

  const patterns = pStore.items;
  const byPatternCategory: Record<string, number> = {};
  for (const p of patterns) {
    byPatternCategory[p.category] = (byPatternCategory[p.category] ?? 0) + 1;
  }

  // V3 人格测试题库：5 卷 × 36 题（110 唯一母题 + 70 跨卷锚题），按 G/X/I/F/S/E 六维分布
  const personalityByDimension: Record<string, number> = {};
  for (const d of PERSONALITY_DIMENSIONS) personalityByDimension[d] = 0;
  const personalityByPaper: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };
  for (const q of pQStore.items) {
    if (q.dimension) personalityByDimension[q.dimension] = (personalityByDimension[q.dimension] ?? 0) + 1;
    if (q.paper_id) personalityByPaper[q.paper_id] = (personalityByPaper[q.paper_id] ?? 0) + 1;
  }
  const personalityByMother: Record<string, number> = {};
  for (const q of pQStore.items) {
    if (q.mother_question_id) {
      personalityByMother[q.mother_question_id] = (personalityByMother[q.mother_question_id] ?? 0) + 1;
    }
  }
  const motherCount = Object.keys(personalityByMother).length;

  return NextResponse.json({
    questions: {
      total: questions.length,
      active,
      inactive: questions.length - active,
      byPhase,
      byBank: BANK_GROUPS.map(g => ({ bank: g.value, label: g.label, count: byBank[g.value] ?? 0 })),
      byDimension: DIMENSIONS.map(d => ({
        dimension: d,
        label: DIMENSION_LABELS[d],
        count: byDimension[d] ?? 0,
      })),
    },
    rules: {
      total: rules.length,
      active: rules.filter(r => r.active !== false).length,
      byCategory,
    },
    patterns: {
      total: patterns.length,
      active: patterns.filter(p => p.active !== false).length,
      byCategory: byPatternCategory,
    },
    archetypes: (() => {
      const catalog = buildArchetypeCatalog();
      return { total: catalog.total, byKind: catalog.byKind };
    })(),
    // V3 人格测试
    personality: {
      total: pQStore.items.length,
      version: pQStore.version ?? PERSONALITY_QUESTION_BANK_VERSION,
      mothers: motherCount,
      cards: PERSONALITY_CARDS.length,
      byPaper: ["P1", "P2", "P3", "P4", "P5"].map(p => ({
        paper: p,
        count: personalityByPaper[p] ?? 0,
      })),
      byDimension: PERSONALITY_DIMENSIONS.map(d => ({
        dimension: d,
        label: `${PERSONALITY_DIMENSION_META[d].cn}（${PERSONALITY_DIMENSION_META[d].en}）`,
        count: personalityByDimension[d] ?? 0,
      })),
    },
    versions: {
      questionBank: qStore.version ?? QUESTION_BANK_VERSION,
      reportRules: rStore.version ?? REPORT_RULE_VERSION,
      pairEngine: pStore.version ?? PAIR_ENGINE_VERSION,
      personalityBank: pQStore.version ?? PERSONALITY_QUESTION_BANK_VERSION,
    },
    updatedAt: {
      questions: qStore.updatedAt,
      rules: rStore.updatedAt,
      patterns: pStore.updatedAt,
    },
  });
}
