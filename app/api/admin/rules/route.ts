import { NextResponse } from "next/server";
import { loadRuleStore, saveRuleStore } from "@/lib/content/store";
import type { ReportRule } from "@/lib/assessment/types";

type Rule = ReportRule & { active?: boolean };
type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/rules?category=&q=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "";
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const store = loadRuleStore();
  let items = store.items as Rule[];
  if (category) items = items.filter(r => r.category === category);
  if (q) {
    items = items.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.output.headline.toLowerCase().includes(q) ||
      (r.semanticGroup ?? "").toLowerCase().includes(q)
    );
  }
  return NextResponse.json({ total: items.length, items, version: store.version, updatedAt: store.updatedAt });
}

// POST /api/admin/rules  新增规则
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Rule;
    if (!body.id || !body.category || !body.output?.headline) {
      return NextResponse.json({ error: "id / category / output.headline 为必填" }, { status: 400 });
    }
    const store = loadRuleStore();
    if (store.items.some(r => r.id === body.id)) {
      return NextResponse.json({ error: `ID ${body.id} 已存在` }, { status: 409 });
    }
    store.items.push({ ...body, active: body.active ?? true });
    saveRuleStore(store);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "新增失败，请检查数据格式" }, { status: 400 });
  }
}

// PUT /api/admin/rules?id=xxx  整体更新（id 用 query 传，避免与 [id] 路由重复目录）
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const body = (await request.json()) as Rule;
    const store = loadRuleStore();
    const index = store.items.findIndex(r => r.id === id);
    if (index < 0) return NextResponse.json({ error: "规则不存在" }, { status: 404 });
    store.items[index] = { ...body, id };
    saveRuleStore(store);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存失败，请检查数据格式" }, { status: 400 });
  }
}
