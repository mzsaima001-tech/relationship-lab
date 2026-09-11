"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Question } from "@/lib/assessment/types";
import QuestionForm from "../QuestionForm";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [item, setItem] = useState<Question | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/questions/${encodeURIComponent(id)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => setItem(data.item))
      .catch(() => setError("题目不存在或加载失败"));
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!item) return <p className="text-sm text-gray-400">加载中…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">
        编辑题目 <span className="font-mono text-sm font-normal text-gray-400">{item.id}</span>
      </h1>
      <QuestionForm initial={item} isNew={false} />
    </div>
  );
}
