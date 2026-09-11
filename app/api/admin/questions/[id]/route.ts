import { NextResponse } from "next/server";
import { loadQuestionStore, saveQuestionStore } from "@/lib/content/store";
import type { Question } from "@/lib/assessment/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/questions/[id]
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const store = loadQuestionStore();
  const item = store.items.find(q => q.id === id);
  if (!item) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  return NextResponse.json({ item });
}

// PUT /api/admin/questions/[id]  整体更新
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Question;
    const store = loadQuestionStore();
    const index = store.items.findIndex(q => q.id === id);
    if (index < 0) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    if (!body.text || !body.phase || !body.kind) {
      return NextResponse.json({ error: "text / phase / kind 为必填" }, { status: 400 });
    }
    // id 不可改，避免破坏答案与报告引用
    store.items[index] = { ...body, id };
    saveQuestionStore(store);
    return NextResponse.json({ ok: true, item: store.items[index] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存失败，请检查数据格式" }, { status: 400 });
  }
}

// DELETE /api/admin/questions/[id]  删除（停用题建议用 PUT active=false）
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const store = loadQuestionStore();
  const index = store.items.findIndex(q => q.id === id);
  if (index < 0) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  const removed = store.items.splice(index, 1)[0];
  saveQuestionStore(store);
  return NextResponse.json({ ok: true, removed: removed.id });
}
