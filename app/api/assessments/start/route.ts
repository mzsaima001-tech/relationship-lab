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
  relationshipStage: z.enum([
    "just_met", "getting_closer", "new_relationship", "stable", "long_distance",
    "tense", "considering_future", "drifting",
  ]),
  duration: z.enum([
    "under_1_month", "1_6_months", "6_12_months", "1_3_years", "3_plus_years",
  ]),
  currentFeeling: z.enum([
    "comfortable", "mostly_good", "unclear", "frequent_friction", "thinking_seriously",
  ]),
  /** 来源分享码：朋友从 /s/[code] 落地页进入时携带，用于有效分享归因 */
  ref: z.string().min(4).max(24).optional(),
});

export async function POST(request: Request) {
  try {
    // 先 normalize：把可选字段的空字符串转成 undefined，避免 zod enum 拒绝 ""
    const raw = await request.json();
    if (typeof raw.partnerGender === "string" && raw.partnerGender === "") delete raw.partnerGender;
    if (typeof raw.lifeStage === "string" && raw.lifeStage === "") delete raw.lifeStage;
    const body = schema.parse(raw);

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
      relationshipStage: body.relationshipStage,
      duration: body.duration,
      currentFeeling: body.currentFeeling,
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
    console.error("[assessments/start] failed:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `无法开始测试: ${message}` },
      { status: 500 }
    );
  }
}
