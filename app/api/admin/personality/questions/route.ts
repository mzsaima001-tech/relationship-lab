import { NextResponse } from "next/server";
import {
  loadPersonalityQuestionStore,
  savePersonalityQuestionStore,
} from "@/lib/content/store";
import type { PersonalityQuestion } from "@/lib/personality/questions";
import { PERSONALITY_DIMENSIONS } from "@/lib/personality/types";

// GET /api/admin/personality/questions?dimension=&active=&q=&page=&pageSize=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dimension = searchParams.get("dimension") ?? "";
  const active = searchParams.get("active") ?? "";
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "50") || 50));

  const store = loadPersonalityQuestionStore();
  let items = store.items.slice();

  if (dimension) items = items.filter(item => item.dimension === dimension);
  if (active === "true") items = items.filter(item => item.active !== false);
  if (active === "false") items = items.filter(item => item.active === false);
  if (q) {
    items = items.filter(item =>
      item.id.toLowerCase().includes(q) || item.question.toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => a.order - b.order);

  const total = items.length;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return NextResponse.json({
    total,
    page,
    pageSize,
    items: pageItems,
    version: store.version,
    updatedAt: store.updatedAt,
  });
}

// POST /api/admin/personality/questions  新增题目
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PersonalityQuestion;
    if (!body.id || !body.question || !body.dimension) {
      return NextResponse.json(
        { error: "id / question / dimension 为必填" },
        { status: 400 }
      );
    }
    if (!PERSONALITY_DIMENSIONS.includes(body.dimension as never)) {
      return NextResponse.json(
        { error: `dimension 必须为 ${PERSONALITY_DIMENSIONS.join("/")} 之一` },
        { status: 400 }
      );
    }
    const store = loadPersonalityQuestionStore();
    if (store.items.some(item => item.id === body.id)) {
      return NextResponse.json(
        { error: `ID ${body.id} 已存在` },
        { status: 409 }
      );
    }
    const next: PersonalityQuestion = {
      ...body,
      active: body.active ?? true,
      order: typeof body.order === "number" ? body.order : store.items.length + 1,
    };
    store.items.push(next);
    savePersonalityQuestionStore(store);
    return NextResponse.json({ ok: true, item: next });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "新增失败，请检查数据格式" }, { status: 400 });
  }
}
