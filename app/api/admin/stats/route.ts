import { NextResponse } from "next/server";
import {
  loadQuestionStore,
  loadRuleStore,
  loadPatternStore,
  QUESTION_BANK_VERSION,
  REPORT_RULE_VERSION,
  PAIR_ENGINE_VERSION,
} from "@/lib/content/store";
import { questionBank, BANK_GROUPS } from "@/lib/admin/banks";
import { buildArchetypeCatalog } from "@/lib/admin/archetype-catalog";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/assessment/types";

export async function GET() {
  const qStore = loadQuestionStore();
  const rStore = loadRuleStore();
  const pStore = loadPatternStore();

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
    versions: {
      questionBank: qStore.version ?? QUESTION_BANK_VERSION,
      reportRules: rStore.version ?? REPORT_RULE_VERSION,
      pairEngine: pStore.version ?? PAIR_ENGINE_VERSION,
    },
    updatedAt: {
      questions: qStore.updatedAt,
      rules: rStore.updatedAt,
      patterns: pStore.updatedAt,
    },
  });
}
