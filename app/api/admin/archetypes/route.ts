import { NextResponse } from "next/server";
import { buildArchetypeCatalog } from "@/lib/admin/archetype-catalog";

// GET /api/admin/archetypes — 原型卡牌目录（只读，74 种全量）
export async function GET() {
  return NextResponse.json(buildArchetypeCatalog());
}
