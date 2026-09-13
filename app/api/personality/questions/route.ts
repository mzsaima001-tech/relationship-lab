import { NextResponse } from "next/server";
import { getPersonalityTest } from "@/lib/db";
import { PERSONALITY_QUESTIONS_BY_PAPER, type PaperId } from "@/lib/personality/questions";
import type { PersonalityQuestion } from "@/lib/personality/types";

/**
 * GET /api/personality/questions?testId=xxx
 * 返回当前测试对应的卷（36 道题，不含分值，防作弊）。
 *
 * 设计：5 套卷 × 36 题 = 180 题库，每个用户抽 1 卷答 36 题（每维 6 题）。
 * 卷号由 testId 决定（建测试时 FNV-1a(visitorId) % 5 抽取，同 visitor 复测同卷）。
 *
 * 不传 testId：返回 P1（开发兜底，避免空题导致页面渲染卡住）
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId")?.trim() || "";

  let paperId: PaperId = "P1";
  if (testId) {
    const test = await getPersonalityTest(testId);
    if (test?.paper_id) {
      paperId = test.paper_id;
    }
  }

  const paperQuestions = PERSONALITY_QUESTIONS_BY_PAPER[paperId] ?? [];
  const questions = paperQuestions.map((q: PersonalityQuestion, i: number) => ({
    id: q.id,
    order: i + 1,
    question: q.text,
    dimension: q.dimension,
    paper: q.paper,
    mother_question_id: q.mother_question_id,
    options: q.options,
    // scores 字段故意不返回（防作弊）
  }));

  return NextResponse.json({
    total: questions.length,
    paperId,
    questions,
  });
}