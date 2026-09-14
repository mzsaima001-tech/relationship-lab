#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 试卷_5套.json 转成 TypeScript papers.ts"""
import json
import os

SRC = r'C:\Users\15944\WorkBuddy\2026-09-10-11-57-45\人格测试题库\卡片设计\交付给程序员\试卷_5套.json'
DST = r'C:\Users\15944\workbuddy-ai\测试\relationship-lab\lib\personality\v2\papers.ts'

with open(SRC, 'r', encoding='utf-8') as f:
    d = json.load(f)

lines = []
lines.append("// =====================================================")
lines.append("// 人格测试 v5 — 5 套试卷题库")
lines.append("// 来源：交付/试卷_5套.json（2026-09-13 v5 月相占盘版本）")
lines.append("// 抽卷：hash(userId|testId) % 5 选 paper_id")
lines.append("// 计分：每题 5 选项自带 score（1-5），不再 reverse，按维度直接累加")
lines.append("// =====================================================")
lines.append("")
lines.append("import { V2_DIMENSIONS } from \"./dimensions\";")
lines.append("")
lines.append('export interface V2Option {')
lines.append("  text: string;")
lines.append("  /** 选项分值（已 normalize 为 1-5，按 dim 直接累加，不再 reverse） */")
lines.append("  score: number;")
lines.append("}")
lines.append("")
lines.append('export interface V2Question {')
lines.append('  /** 题号（G/X/I/F/S/E 维度前缀 + 序号 01-99） */')
lines.append('  id: string;')
lines.append('  /** 维度缩写（G=表达力 X=应对力 I=认可需求 F=方向感 S=自主性 E=情绪觉知） */')
lines.append('  dim: typeof V2_DIMENSIONS[number];')
lines.append('  stem: string;')
lines.append('  options: V2Option[];')
lines.append("}")
lines.append("")
lines.append('export interface V2Paper {')
lines.append('  paper_id: "P1" | "P2" | "P3" | "P4" | "P5";')
lines.append('  total: 36;')
lines.append('  questions: V2Question[];')
lines.append("}")
lines.append("")
lines.append("export const V2_PAPERS: readonly V2Paper[] = [")
for p in d['papers']:
    lines.append("  {")
    lines.append(f'    paper_id: "{p["paper_id"]}",')
    lines.append(f'    total: {p["total"]},')
    lines.append(f'    questions: [')
    for q in p['questions']:
        # escape
        def esc(s):
            return s.replace('\\', '\\\\').replace('"', '\\"')
        opt_lines = []
        for o in q['options']:
            opt_lines.append(f'      {{ text: "{esc(o["text"])}", score: {o["score"]} }}')
        lines.append(f'      {{ id: "{q["id"]}", dim: "{q["dim"]}", stem: "{esc(q["stem"])}", options: [')
        lines.append(',\n'.join(opt_lines))
        lines.append(f'      ] }},')
    lines.append(f'    ],')
    lines.append("  },")
lines.append("] as const;")
lines.append("")
lines.append(f'export const V2_TOTAL_QUESTIONS = {sum(len(p["questions"]) for p in d["papers"])}; // 5 套 × 36 题')
lines.append("")
lines.append("export function getPaperById(id: string): V2Paper | undefined {")
lines.append("  return V2_PAPERS.find(p => p.paper_id === id);")
lines.append("}")

os.makedirs(os.path.dirname(DST), exist_ok=True)
with open(DST, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f'OK: wrote {sum(len(p["questions"]) for p in d["papers"])} 题 to {DST}')
