import { NextResponse } from "next/server";
import { loadQuestionStore, saveQuestionStore } from "@/lib/content/store";
import { matchBank } from "@/lib/admin/banks";
import type { Question } from "@/lib/assessment/types";

// GET /api/admin/questions?phase=&kind=&dimension=&bank=&active=&q=&page=&pageSize=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase") ?? "";
  const kind = searchParams.get("kind") ?? "";
  const dimension = searchParams.get("dimension") ?? "";
  const bank = searchParams.get("bank") ?? "";
  const active = searchParams.get("active") ?? "";
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "30") || 30));

  const store = loadQuestionStore();
  let items = store.items as Question[];

  if (phase) items = items.filter(item => item.phase === phase);
  if (kind) items = items.filter(item => item.kind === kind);
  if (dimension) items = items.filter(item => item.dimension === dimension);
  if (bank) items = items.filter(item => matchBank(item, bank));
  if (active === "true") items = items.filter(item => item.active !== false);
  if (active === "false") items = items.filter(item => item.active === false);
  if (q) {
    items = items.filter(item =>
      item.id.toLowerCase().includes(q) || item.text.toLowerCase().includes(q)
    );
  }

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

// POST /api/admin/questions  新增题目
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Question;
    if (!body.id || !body.text || !body.phase || !body.kind) {
      return NextResponse.json({ error: "id / text / phase / kind 为必填" }, { status: 400 });
    }
    const store = loadQuestionStore();
    if (store.items.some(item => item.id === body.id)) {
      return NextResponse.json({ error: `ID ${body.id} 已存在` }, { status: 409 });
    }
    store.items.push({ ...body, active: body.active ?? true });
    saveQuestionStore(store);
    return NextResponse.json({ ok: true, item: body });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "新增失败，请检查数据格式" }, { status: 400 });
  }
}
