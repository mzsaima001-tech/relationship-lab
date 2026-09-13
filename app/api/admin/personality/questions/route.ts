import { NextResponse } from "next/server";
import { loadPersonalityQuestionStore } from "@/lib/content/store";
import { PERSONALITY_DIMENSIONS } from "@/lib/personality/types";

// GET /api/admin/personality/questions?dimension=&active=&q=&page=&pageSize=
// V3 题库 read-only：admin 可浏览，不可编辑（PUT/DELETE/POST 在 [id] route 拦截）
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
  // V3 题库全部 active=true（hardcoded TS seed），active 查询参数已不再生效
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
    readOnly: true,
  });
}

// POST 已停用：V3 题库为 hardcoded TS seed，不可编辑。
export async function POST() {
  return NextResponse.json(
    { error: "V3 题库为只读 TS seed，请修改 lib/personality/questionsData.ts 并通过版本号统一升级。" },
    { status: 410 }
  );
}
