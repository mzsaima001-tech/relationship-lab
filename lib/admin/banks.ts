import type { Question } from "@/lib/assessment/types";

// 题目分组（按 ID 前缀），用于后台筛选
export const BANK_GROUPS = [
  { value: "core", label: "核心母题", prefixes: ["RN-", "EX-", "SP-", "ES-", "CU-", "RP-"] },
  { value: "AMB", label: "暧昧关系", prefixes: ["AMB-"] },
  { value: "NEW", label: "刚确定关系", prefixes: ["NEW-"] },
  { value: "ST", label: "稳定恋爱", prefixes: ["ST-"] },
  { value: "LDR", label: "异地恋", prefixes: ["LDR-"] },
  { value: "MAR", label: "长期伴侣", prefixes: ["MAR-"] },
  { value: "TEN", label: "关系紧张", prefixes: ["TEN-"] },
  { value: "FR", label: "朋友关系", prefixes: ["FR-"] },
  { value: "FU", label: "统一追问", prefixes: ["FU-"] },
  { value: "QC", label: "一致性校验", prefixes: ["QC-"] },
  { value: "SD", label: "社会期望两难", prefixes: ["SD-"] },
  { value: "LIFE", label: "年龄/生活阶段变体", prefixes: ["Y18-", "Y25-", "Y35-", "Y45-"] },
] as const;

export function questionBank(q: Question): string {
  if (q.phase === "core") return "core";
  if (q.phase === "followup") return "FU";
  if (q.phase === "consistency") return q.id.startsWith("SD-") ? "SD" : "QC";
  const group = BANK_GROUPS.find(g => g.prefixes.some(p => q.id.startsWith(p)));
  return group?.value ?? "OTHER";
}

export function bankLabel(value: string): string {
  return BANK_GROUPS.find(g => g.value === value)?.label ?? value;
}

export function matchBank(q: Question, bank: string): boolean {
  return questionBank(q) === bank;
}
