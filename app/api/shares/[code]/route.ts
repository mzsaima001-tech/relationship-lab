import { NextResponse } from "next/server";
import {
  getShareByCode,
  getSession,
  getResult,
  getPersonalityTest,
  incrementShareVisits,
} from "@/lib/db";
import { matchArchetypes } from "@/lib/personality/archetypes";
import { PERSONALITY_TYPE_META, type PersonalityType } from "@/lib/personality/types";

/**
 * 普通分享落地页数据：返回分享者的公开 teaser（昵称/原型/标签/一句话），
 * 访问计数 +1。
 *
 * 同接口支持两个分享类型（向后兼容默认 couple）：
 * - share_type=undefined / "couple" → 双人默契（返回 nickname/archetype/tags/oneLiner）
 * - share_type="personality" → 人格测试（返回 primaryCn/matchScore/scores/topDimensions）
 *
 * 不含维度分等敏感细节，不暴露 sessionId 之外的来源 ID。
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

    // 分支：人格测试分享
    if (share.share_type === "personality") {
      if (!share.source_test_id) {
        return NextResponse.json({ error: "分享内容不可用" }, { status: 404 });
      }
      const test = await getPersonalityTest(share.source_test_id);
      if (!test || test.status !== "completed") {
        return NextResponse.json({ error: "分享内容不可用" }, { status: 404 });
      }
      const scores = {
        social: test.social_score ?? 0,
        rationality: test.rationality_score ?? 0,
        planning: test.planning_score ?? 0,
        risk: test.risk_score ?? 0,
        dominance: test.dominance_score ?? 0,
        sensitivity: test.sensitivity_score ?? 0,
      };
      const top3 = matchArchetypes(scores);
      const primary = top3[0];
      const primaryType = primary?.type as PersonalityType | undefined;
      const primaryMeta = primaryType ? PERSONALITY_TYPE_META[primaryType] : null;

      // 从缓存读 free tagline（如果完成了完整测试，缓存里有一条 primaryTagline）
      const cachedFree = (test as any).free_report_cache as
        | { primaryTagline: string }
        | undefined;

      const fileNo = share.source_test_id.slice(-6).toUpperCase();

      return NextResponse.json({
        code: share.code,
        visits: share.visits + 1,
        shareType: "personality" as const,
        testId: share.source_test_id,
        sharer: {
          // 隐私：人格测试无昵称（游客模式），用占位符
          nickname: "一位测试者",
          primaryCn: primaryMeta?.cn ?? primary?.type ?? "",
          primaryEn: primaryMeta?.en ?? "",
          primaryType: primaryType ?? "",
          tagline:
            cachedFree?.primaryTagline ?? primaryMeta?.tagline ?? "",
          matchScore: primary?.matchScore ?? 0,
          scores,
          fileNo,
        },
      });
    }

    // 分支：双人默契分享（默认，向后兼容）
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
