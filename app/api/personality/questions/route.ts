import { NextResponse } from "next/server";
import { getActivePersonalityQuestions } from "@/lib/content/store";

/**
 * GET /api/personality/questions
 * 返回启用中的题目列表（不含分值，避免前端直接作弊）
 */
export async function GET() {
  const questions = getActivePersonalityQuestions().map((q) => ({
    id: q.id,
    order: q.order,
    question: q.question,
    dimension: q.dimension,
    // reverse 字段故意不返回（防作弊）
  }));
  return NextResponse.json({
    total: questions.length,
    questions,
  });
}