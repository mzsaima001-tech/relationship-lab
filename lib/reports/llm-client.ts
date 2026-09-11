/**
 * 极简 LLM HTTP 客户端（服务端专用）
 *
 * 为什么不用全局 fetch：
 * Next.js 在 dev/prod 下会包装 globalThis.fetch，在本机代理环境（HTTP(S)_PROXY 已设置）中
 * 会出现 `TypeError: fetch failed`——undici 不吃代理环境变量，而 Next 的包装层又会干扰直连。
 * 这里直接用 node:https 发请求，行为可预测、可精确控制超时。
 */
import https from "node:https";
import { URL } from "node:url";

export interface JsonHttpResult {
  status: number;
  text: string;
}

/** 发起一次 JSON POST，带总超时；网络层错误以 reject 抛出 */
export function postJson(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs: number
): Promise<JsonHttpResult> {
  return new Promise((resolve, reject) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      reject(new Error(`bad_url: ${url}`));
      return;
    }
    if (u.protocol !== "https:") {
      reject(new Error(`unsupported_protocol: ${u.protocol}`));
      return;
    }

    const body = JSON.stringify(payload);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      res => {
        const chunks: Buffer[] = [];
        res.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          })
        );
        res.on("error", reject);
      }
    );

    // 总超时（socket 空闲超时不足以覆盖慢响应）
    const timer = setTimeout(() => req.destroy(new Error(`timeout_after_${timeoutMs}ms`)), timeoutMs);
    req.on("close", () => clearTimeout(timer));
    req.on("error", err => {
      clearTimeout(timer);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}
