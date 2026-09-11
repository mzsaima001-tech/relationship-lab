// 后台登录鉴权：必须设置 ADMIN_PASSWORD（带最低强度校验）。
// 使用 Web Crypto，proxy(edge) 与 route(node) 均可运行。
//
// ⚠️ 生产部署必须做的事：
//  1) 设置环境变量 ADMIN_PASSWORD（≥ 12 位，包含字母+数字）。
//  2) 不要在生产部署中保留本文件以下方硬编码的默认值。
//     我们通过「启动期强校验」检测这一问题 — 服务一旦检测到使用了
//     默认密码 / 缺失密码，进程将以非零退出码 panic。

export const ADMIN_COOKIE = "rl_admin";

/** 是否处于开发环境 */
function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

const DEFAULT_DEV_PASSWORD = "rl-admin-dev-only-2026"; // 仅本地 dev 用，禁止在生产使用

/**
 * 服务启动期一次性校验：缺 ADMIN_PASSWORD 或采用默认值 → panic。
 * 由 proxy / 路由每次启动时调用，结果会被缓存以避免重复启动检查。
 */
let _bootChecked = false;
function bootCheck() {
  if (_bootChecked) return;
  _bootChecked = true;
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) {
    if (isDev()) {
      console.warn(
        "[admin] ⚠️ 未设置 ADMIN_PASSWORD，已使用 dev 默认密码（生产会 panic）"
      );
      return;
    }
    throw new Error(
      "ADMIN_PASSWORD is required in production. Set it to a strong password (>=12 chars)."
    );
  }
  if (pwd === "admin123" || pwd.length < 12) {
    if (isDev()) {
      console.warn(
        `[admin] ⚠️ ADMIN_PASSWORD 太弱（${pwd.length} 位 / 用了默认串），dev 仍继续运行`
      );
      return;
    }
    throw new Error(
      `ADMIN_PASSWORD must be at least 12 characters and not 'admin123'. Got length=${pwd.length}.`
    );
  }
  // 强度提示
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  if (!hasLetter || !hasDigit) {
    if (isDev()) return;
    throw new Error("ADMIN_PASSWORD must contain both letters and digits.");
  }
}

function secret(): string {
  bootCheck();
  return process.env.ADMIN_PASSWORD || DEFAULT_DEV_PASSWORD;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 计算当前密码对应的无状态令牌 */
export async function expectedAdminToken(): Promise<string> {
  const data = new TextEncoder().encode("relationship-lab-admin:" + secret());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await expectedAdminToken());
}

export function checkPassword(password: string): boolean {
  return password === secret();
}

/** 用于登录页给提示：当前是否处于弱密码模式 */
export function isAdminPasswordWeak(): boolean {
  bootCheck();
  const pwd = process.env.ADMIN_PASSWORD || DEFAULT_DEV_PASSWORD;
  return pwd === DEFAULT_DEV_PASSWORD || pwd === "admin123" || pwd.length < 12;
}
