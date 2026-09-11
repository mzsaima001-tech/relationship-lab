import { NextResponse } from "next/server";
import {
  loadPersonalityQuestionStore,
  savePersonalityQuestionStore,
} from "@/lib/content/store";
import type { PersonalityQuestion } from "@/lib/personality/questions";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/personality/questions/[id]
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const store = loadPersonalityQuestionStore();
  const item = store.items.find(q => q.id === id);
  if (!item) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  return NextResponse.json({ item });
}

// PUT /api/admin/personality/questions/[id]  整体更新
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = (await request.json()) as PersonalityQuestion;
    const store = loadPersonalityQuestionStore();
    const index = store.items.findIndex(q => q.id === id);
    if (index < 0) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    if (!body.question || !body.dimension) {
      return NextResponse.json(
        { error: "question / dimension 为必填" },
        { status: 400 }
      );
    }
    store.items[index] = { ...body, id };
    savePersonalityQuestionStore(store);
    return NextResponse.json({ ok: true, item: store.items[index] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存失败，请检查数据格式" }, { status: 400 });
  }
}

// DELETE /api/admin/personality/questions/[id]  删除（停用题建议用 PUT active=false）
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const store = loadPersonalityQuestionStore();
  const index = store.items.findIndex(q => q.id === id);
  if (index < 0) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  const removed = store.items.splice(index, 1)[0];
  savePersonalityQuestionStore(store);
  return NextResponse.json({ ok: true, removed: removed.id });
}
