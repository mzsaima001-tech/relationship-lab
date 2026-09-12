// =====================================================
// 默契研究所 — 分享页「神秘暗号」生成
// 目的：让接收人对"分享人是谁"产生好奇（看到一句钩子）
//      但不暴露直接的身份信息（昵称 / 类型编号 / 标签）
// 用法：share/personality/[code] 与 share/[sessionId] 复用
//
// 设计规则：
//   - 一句"暗号" = 这个人的关系签名（来自 archetype meta tagline）
//   - 末尾署名 = 一位走过默契研究所的 TA（不点名）
//   - 失败兜底：给一句通用关系钩子，保证页面永远有意义
// =====================================================

export interface MysteryHookline {
  /** 神秘钩子本身：一句话描述这个人/这对人在关系里的样子 */
  body: string;
  /** 署名行：模糊身份 */
  byline: string;
}

/** 拿不到任何信号时的兜底人格钩子 */
export const FALLBACK_PERSONALITY: MysteryHookline = {
  body: "我以为我了解自己，做完测试才发现另一面。",
  byline: "—— 一位走过默契研究所的 TA",
};

/** 拿不到任何信号时的兜底默契钩子 */
export const FALLBACK_COUPLE: MysteryHookline = {
  body: "我们之间，有些默契没说出来——但没想到会有那么准。",
  byline: "—— 我们已经测过默契研究所",
};

/** 抹除字符串首尾的中英文引号，避免外面再包「」时出现「「xx」」嵌套 */
function stripEdgeQuotes(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length >= 2) {
    const pairs: [string, string][] = [
      ["「", "」"],
      ["『", "』"],
      ['"', '"'],
      ["'", "'"],
      ["《", "》"],
    ];
    for (const [l, r] of pairs) {
      if (trimmed.startsWith(l) && trimmed.endsWith(r)) {
        return trimmed.slice(l.length, trimmed.length - r.length).trim();
      }
    }
  }
  return trimmed;
}

/**
 * 包装一个秘密钩子：保证 body 已剥外层引号、署名非空。
 * Canvas 海报直接用 stripEdgeQuotes 后的纯 body，外面再画引号；
 * HTML 用 wrappedBody() 一键得到「body」。
 */
export function wrapMystery(
  body: string | null | undefined,
  byline: string,
  fallback: MysteryHookline
): MysteryHookline {
  const stripped = stripEdgeQuotes((body ?? "").trim());
  return {
    body: stripped || fallback.body,
    byline: byline || fallback.byline,
  };
}

/** HTML/Canvas 展示用：返回外包了「」的 body */
export function wrappedBody(m: MysteryHookline): string {
  return `「${m.body}」`;
}
