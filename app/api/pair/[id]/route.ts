import { NextResponse } from "next/server";
import { getPair, getSession, getResult, updatePair } from "@/lib/db";
import {
  calculatePairScores,
  detectPairPatterns,
  detectPairStrengths,
} from "@/lib/assessment/pair-score";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pair = await getPair(id);
    if (!pair) {
      return NextResponse.json({ error: "Pair not found" }, { status: 404 });
    }

    const sessionA = await getSession(pair.session_a);
    const sessionB = pair.session_b ? await getSession(pair.session_b) : null;

    if (!sessionA) {
      return NextResponse.json({ error: "Session A not found" }, { status: 404 });
    }

    const resultA = await getResult(pair.session_a);
    const resultB = pair.session_b ? await getResult(pair.session_b) : null;

    if (!resultA) {
      return NextResponse.json({
        status: "waiting_a",
        message: "A 尚未完成测评",
      });
    }

    if (!sessionB || !resultB) {
      return NextResponse.json({
        status: "waiting_b",
        message: "等待 TA 完成测评",
        personA: {
          nickname: sessionA.nickname,
          archetype: resultA.archetype,
          scores: resultA.dimension_scores,
          tags: resultA.tags,
          context: {
            relationshipType: sessionA.relationship_type,
            duration: sessionA.duration,
          },
        },
      });
    }

    // Both completed
    const scoresA = resultA.dimension_scores as any;
    const scoresB = resultB!.dimension_scores as any;
    const pairScores = calculatePairScores(scoresA, scoresB);
    const detectionOptions = {
      signalsA: resultA.signals,
      signalsB: resultB.signals,
      relationshipType: sessionA.relationship_type as any,
      relationshipStage: sessionA.relationship_stage as any,
    };
    const patterns = detectPairPatterns(scoresA, scoresB, detectionOptions);
    const strengths = detectPairStrengths(scoresA, scoresB, detectionOptions);

    if (pair.status !== "completed") {
      await updatePair(id, { status: "completed" });
    }

    return NextResponse.json({
      status: "completed",
      pairScores,
      patterns,
      strengths,
      unlockPrice: 19.9,
      personA: {
        nickname: sessionA.nickname,
        archetype: resultA.archetype,
        scores: resultA.dimension_scores,
        signals: resultA.signals,
        tags: resultA.tags,
        context: {
          relationshipType: sessionA.relationship_type,
          duration: sessionA.duration,
        },
      },
      personB: {
        nickname: sessionB.nickname,
        archetype: resultB.archetype,
        scores: resultB.dimension_scores,
        signals: resultB.signals,
        tags: resultB.tags,
        context: {
          relationshipType: sessionB.relationship_type,
          duration: sessionB.duration,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch pair data" }, { status: 400 });
  }
}
