import { NextResponse } from "next/server";
import { z } from "zod";
import { getPair, getSession, getResult, getReportByPair, saveReport } from "@/lib/db";
import { generatePairReport, polishPairReportWithLLM } from "@/lib/reports/generate";

const schema = z.object({
  pairId: z.string(),
});

function buildPairPreview(report: any) {
  return {
    relationshipType: report.relationshipType,
    headline: report.headline,
    summary: report.summary,
    attraction: report.attraction,
    personANeeds: "解锁后查看 A 在关系中的核心需要。",
    personBNeeds: "解锁后查看 B 在关系中的核心需要。",
    interactionCycle: report.interactionCycle?.split("\n").slice(0, 2).join("\n") || "互动循环已识别，解锁后查看完整链路。",
    conflictPattern: "完整冲突模式、双方体验与触发条件需解锁后查看。",
    risks: [],
    suggestions: [],
    communicationScripts: [],
  };
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const pair = await getPair(body.pairId);
    if (!pair) {
      return NextResponse.json({ error: "Pair not found" }, { status: 404 });
    }

    // Check if report already exists
    const existing = await getReportByPair(body.pairId);
    if (existing && existing.full_content) {
      return NextResponse.json({
        report: existing.unlocked ? existing.full_content : buildPairPreview(existing.full_content),
        unlocked: existing.unlocked,
        price: 19.9,
      });
    }

    const sessionA = await getSession(pair.session_a);
    const sessionB = pair.session_b ? await getSession(pair.session_b) : null;

    if (!sessionA || !sessionB) {
      return NextResponse.json({ error: "Sessions not complete" }, { status: 400 });
    }

    const resultA = await getResult(pair.session_a);
    const resultB = pair.session_b ? await getResult(pair.session_b) : null;

    if (!resultA || !resultB) {
      return NextResponse.json({ error: "Results not complete" }, { status: 400 });
    }

    const { detectPairPatterns } = await import("@/lib/assessment/pair-score");
    const patterns = detectPairPatterns(
      resultA.dimension_scores as any,
      resultB.dimension_scores as any,
      {
        signalsA: resultA.signals,
        signalsB: resultB.signals,
        relationshipType: sessionA.relationship_type as any,
        relationshipStage: sessionA.relationship_stage as any,
      }
    );

    const templateReport = await generatePairReport({
      relationship: {
        type: sessionA.relationship_type,
        duration: sessionA.duration,
      },
      personA: {
        nickname: sessionA.nickname,
        archetype: resultA.archetype,
        scores: resultA.dimension_scores as any,
        signals: resultA.signals,
      },
      personB: {
        nickname: sessionB.nickname,
        archetype: resultB.archetype,
        scores: resultB.dimension_scores as any,
        signals: resultB.signals,
      },
      pairPatterns: patterns.map(pattern => pattern.pattern),
    });

    // AI 润色表达层（未开启/失败自动降级模板版，绝不阻塞出报告）
    const { report, applied, model } = await polishPairReportWithLLM(templateReport);

    await saveReport({
      id: crypto.randomUUID(),
      report_type: "pair",
      pair_id: body.pairId,
      full_content: report,
      preview_content: buildPairPreview(report),
      unlocked: false,
      prompt_version: "v2.1-ai-polish",
      model_name: applied ? (model ?? "ai") : "local-template",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      report: buildPairPreview(report),
      unlocked: false,
      price: 19.9,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error("[reports/generate] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `生成报告失败: ${message}` }, { status: 500 });
  }
}
