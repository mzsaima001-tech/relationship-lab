import { NextResponse } from "next/server";
import { loadPersonalityQuestionStore } from "@/lib/content/store";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/personality/questions/[id]
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const store = loadPersonalityQuestionStore();
  const item = store.items.find(q => q.id === id);
  if (!item) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  return NextResponse.json({ item });
}

// PUT/DELETE 已停用：V3 题库为 hardcoded TS seed，不可编辑。
async function readOnly(_request: Request, _ctx: Ctx) {
  return NextResponse.json(
    { error: "V3 题库为只读 TS seed，请修改 lib/personality/questionsData.ts 并通过版本号统一升级。" },
    { status: 410 }
  );
}
export const PUT = readOnly;
export const DELETE = readOnly;
