// =====================================================
// 默契研究所 — 统一访客身份 + 邀请归因（client-side）
//
// 背景：人格测试历史上有两个 visitor key（personalityVisitorId_v1 /
// personalityVisitorId），默契测试没有 visitor 概念。邀请积分需要
// 「同一个人只计 1 分」，因此引入统一身份 moqilab.visitorId：
//   - 首次使用时自动收养已存在的旧 key（同人同号，历史测试不断档）
//   - 都没有才生成新 id
//
// 归因：朋友通过 /?ref=CODE 打开首页 → storeRefCode() 存下，
// 之后无论做哪个测试，提交时都会带上这个码。
// =====================================================

const UNIFIED_KEY = "moqilab.visitorId";
const REF_KEY = "moqilab.refCode";
/** 收养顺序：人格入口页 key 优先（多数老用户在这里），其次答题页 key */
const LEGACY_KEYS = ["personalityVisitorId_v1", "personalityVisitorId"];

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `v_${crypto.randomUUID()}`;
    }
  } catch {
    /* 某些 webview */
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 写不动忽略 */
  }
}

/** 取统一访客 ID（没有则收养旧 key 或生成），SSR 返回 "" */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = safeGet(UNIFIED_KEY);
  if (!id) {
    for (const key of LEGACY_KEYS) {
      id = safeGet(key);
      if (id) break;
    }
  }
  if (!id) id = makeId();
  safeSet(UNIFIED_KEY, id);
  return id;
}

/** 只读统一访客 ID（不创建），SSR 返回 "" */
export function peekVisitorId(): string {
  if (typeof window === "undefined") return "";
  return safeGet(UNIFIED_KEY) || LEGACY_KEYS.map(safeGet).find(Boolean) || "";
}

/** 存下来源邀请码（朋友点开 /?ref=CODE 时调用） */
export function storeRefCode(code: string) {
  if (typeof window === "undefined" || !code) return;
  safeSet(REF_KEY, code);
}

/** 读来源邀请码（无则 ""）。优先级：调用方先查 URL ?ref，再用本函数兜底 */
export function getStoredRefCode(): string {
  if (typeof window === "undefined") return "";
  return safeGet(REF_KEY) || "";
}
