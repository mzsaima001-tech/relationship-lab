import { NextResponse } from "next/server";
import {
  getShareByCode,
  getSession,
  getResult,
  getPersonalityTest,
  incrementShareVisits,
} from "@/lib/db";
import { matchCards } from "@/lib/personality/match";
import { PERSONALITY_CARDS } from "@/lib/personality/cards";
import { PERSONALITY_DIMENSIONS, type PersonalityDimension } from "@/lib/personality/types";

/**
 * 普通分享落地页数据：返回分享者的公开 teaser。
 *
 * 同接口支持两个分享类型：
 * - share_type=undefined / "couple" → 双人默契
 * - share_type="personality" → 人格测试（V3：6 维 G/X/I/F/S/E + 30 张月相卡）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const share = await getShareByCode(code);
    if (!share) {
      return NextResponse.json({ error: "分享不存在或已过期" }, { status: 404 });
    }

    await incrementShareVisits(code);

    if (share.share_type === "personality") {
      if (!share.source_test_id) {
        return NextResponse.json({ error: "分享内容不可用" }, { status: 404 });
      }
      const test = await getPersonalityTest(share.source_test_id);
      if (!test || test.status !== "completed") {
        return NextResponse.json({ error: "分享内容不可用" }, { status: 404 });
      }

      // V3 6 维
      const scores: Record<PersonalityDimension, number> = {
        G: test.g_score ?? 50,
        X: test.x_score ?? 50,
        I: test.i_score ?? 50,
        F: test.f_score ?? 50,
        S: test.s_score ?? 50,
        E: test.e_score ?? 50,
      };

      const matchResult = matchCards(
        PERSONALITY_DIMENSIONS.map(d => scores[d]),
        PERSONALITY_CARDS
      );
      const primary = matchResult.top1;

      const cachedFree = (test as any).free_report_cache as
        | { primaryTagline?: string; main_card?: { name: string; line: string } }
        | undefined;

      const fileNo = share.source_test_id.slice(-6).toUpperCase();

      return NextResponse.json({
        code: share.code,
        visits: share.visits + 1,
        shareType: "personality" as const,
        testId: share.source_test_id,
        sharer: {
          nickname: "一位测试者",
          primaryCn: primary.card.name,
          primaryEn: primary.card.phase_en,
          primaryType: primary.card.id,
          tagline:
            cachedFree?.primaryTagline
            ?? cachedFree?.main_card?.line
            ?? primary.card.line,
          matchScore: primary.similarity,
          scores,
          fileNo,
        },
      });
    }

    // 分支：双人默契分享
    const [session, result] = await Promise.all([
      getSession(share.source_session_id),
      getResult(share.source_session_id),
    ]);
    if (!session || !result) {
      return NextResponse.json({ error: "分享内容不可用" }, { status: 404 });
    }

    const narrative = result.narrative as any;
    return NextResponse.json({
      code: share.code,
      visits: share.visits + 1,
      shareType: "couple" as const,
      sharer: {
        nickname: session.nickname,
        archetype: result.archetype,
        tags: result.tags ?? [],
        oneLiner: narrative?.oneLiner ?? "",
        fileNo: share.source_session_id.slice(0, 6).toUpperCase(),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "加载分享失败" }, { status: 400 });
  }
}