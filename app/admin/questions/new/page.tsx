"use client";

import type { Question } from "@/lib/assessment/types";
import QuestionForm from "../QuestionForm";

const BLANK: Question = {
  id: "",
  phase: "core",
  dimension: "response_need",
  kind: "likert",
  text: "",
  scoreDirection: "positive",
  active: true,
  version: "1.0",
};

export default function NewQuestionPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">新增题目</h1>
      <QuestionForm initial={BLANK} isNew />
    </div>
  );
}
