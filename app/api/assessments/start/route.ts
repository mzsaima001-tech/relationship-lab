import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, updateSession } from "@/lib/db";
import { buildInitialQuestionsFromSeed } from "@/lib/assessment/assemble";
import { createGuestToken, hashGuestToken } from "@/lib/security/guest-token";
import type { AssessmentContext } from "@/lib/assessment/types";

const schema = z.object({
  nickname: z.string().min(1).max(30),
  ageBand: z.enum(["under_18", "18_24", "25_34", "35_44", "45_plus"]),
  gender: z.enum(["male", "female", "other", "prefer_not"]),
  partnerGender: z.enum(["male", "female", "other", "prefer_not"]).optional(),
  lifeStage: z.enum([
    "student", "early_career", "career_intensive", "cohabiting", "newly_married",
    "parent_infant", "parent_school_age", "caregiver_for_parents", "dual_career",
    "empty_nest", "career_transition", "long_distance", "living_apart_together",
  ]).optional(),
  relationshipType: z.enum(["ambiguous", "dating", "long_term", "friend"]),
  relationshipStage: z.string(),
  duration: z.string(),
  currentFeeling: z.string(),
  /** 来源分享码：朋友从 /s/[code] 落地页进入时携带，用于有效分享归因 */
  ref: z.string().min(4).max(24).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const guestToken = createGuestToken();

    const session = await createSession({
      guest_token_hash: hashGuestToken(guestToken),
      nickname: body.nickname,
      age_band: body.ageBand,
      gender: body.gender,
      partner_gender: body.partnerGender,
      relationship_type: body.relationshipType,
      relationship_stage: body.relationshipStage,
      duration: body.duration,
      current_feeling: body.currentFeeling,
      life_stage: body.lifeStage,
      referred_by_code: body.ref,
    });

    const context: AssessmentContext = {
      nickname: body.nickname,
      ageBand: body.ageBand,
      lifeStage: body.lifeStage,
      gender: body.gender,
      partnerGender: body.partnerGender,
      relationshipType: body.relationshipType,
      relationshipStage: body.relationshipStage as any,
      duration: body.duration as any,
      currentFeeling: body.currentFeeling as any,
    };

    const questions = buildInitialQuestionsFromSeed(session.id, context);

    await updateSession(session.id, {
      question_ids: questions.map((q) => q.id),
    });

    return NextResponse.json({
      sessionId: session.id,
      guestToken,
      questions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "无法开始测试，请稍后重试。" },
      { status: 500 }
    );
  }
}
