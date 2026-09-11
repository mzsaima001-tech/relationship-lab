import { NextResponse } from "next/server";
import { loadPatternStore, savePatternStore } from "@/lib/content/store";
import type { PairPattern } from "@/lib/assessment/types";

type Pattern = PairPattern & { active?: boolean };

// GET /api/admin/patterns?category=&q=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "";
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const store = loadPatternStore();
  let items = store.items as Pattern[];
  if (category) items = items.filter(p => p.category === category);
  if (q) {
    items = items.filter(p =>
      p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }
  return NextResponse.json({ total: items.length, items, version: store.version, updatedAt: store.updatedAt });
}

// PUT /api/admin/patterns?id=xxx  整体更新
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const body = (await request.json()) as Pattern;
    if (!body.name || !body.category) {
      return NextResponse.json({ error: "name / category 为必填" }, { status: 400 });
    }
    const store = loadPatternStore();
    const index = store.items.findIndex(p => p.id === id);
    if (index < 0) return NextResponse.json({ error: "模式不存在" }, { status: 404 });
    store.items[index] = { ...body, id };
    savePatternStore(store);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存失败，请检查数据格式" }, { status: 400 });
  }
}
