import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPersonalityTest,
  getShareByTestId,
  createShare,
  updatePersonalityTest,
} from "@/lib/db";

const schema = z.object({
  testId: z.string(),
  visitorId: z.string().optional(),
});

/**
 * 创建/复用人格测试分享码（与双人分享链路完全隔离）。
 * 同 testId 幂等复用已有 share_code，避免刷码。
 * 返回 code + url 用于生成海报与二维码。
 *
 * 同时把 shareCode 持久化到 test 记录上，结果页可直接读取。
 *
 * 注意：
 * - 必须 test.status === "completed" 才允许分享（避免分享一份空报告）
 * - 不进入双人模式、不创建 pair
 * - 沙箱环境无 session 验证（人格测试本身是游客 ID 模型）
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const test = await getPersonalityTest(body.testId);
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (test.status !== "completed") {
      return NextResponse.json({ error: "测试完成后才能分享" }, { status: 400 });
    }

    let share = await getShareByTestId(body.testId);
    if (!share) {
      share = await createShare(
        // 用 `personality:<testId>` 作 source_session_id 占位，避免和真实 sessionId 混淆。
        // 真正的人格来源用 source_test_id + share_type 识别。
        `personality:${body.testId}`,
        {
          shareType: "personality",
          sourceTestId: body.testId,
          visitorId: body.visitorId,
        }
      );
      // 持久化到 test 记录上，方便 result / report 页直接读
      await updatePersonalityTest(body.testId, { share_code: share.code });
      test.share_code = share.code;
    } else if (test.share_code !== share.code) {
      // 同步修正历史记录
      await updatePersonalityTest(body.testId, { share_code: share.code });
      test.share_code = share.code;
    }

    return NextResponse.json({
      code: share.code,
      visits: share.visits,
      url: `/s/${share.code}`,
      shareType: "personality",
      testId: body.testId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请求参数无效", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create personality share" }, { status: 500 });
  }
}
