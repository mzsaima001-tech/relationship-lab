// =====================================================
// Server酱·Turbo 推送（消息直达微信服务号）
//
// 原理：站长微信关注「Server酱·Turbo」服务号并扫码绑定后，
// 服务端 POST https://sctapi.ftqq.com/<SENDKEY>.send 即可把消息
// 推到站长微信——用来通知「有新订单待复核」，消息里带免登录审批链接。
//
// 配置：环境变量 SERVERCHAN_SENDKEY（sct.ftqq.com 登录后在「SendKey」页复制）
// 未配置时返回 ok:false、静默跳过（只打日志），不影响主流程。
//
// 2026-09-15 强化：
//   - 加重试（最多 2 次，指数退避）
//   - 返回结构化结果（含 Server酱 errno / 推送失败原因）
//   - 区分「未配置 / 推送失败 / 成功」三种状态，方便上游决定是否 fallback
// =====================================================

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

/** 推送结果（给上层路由决定后续处理） */
export type ServerChanResult =
  | { ok: true; pushid?: string; readkey?: string }
  | { ok: false; reason: "no_sendkey" | "fetch_error" | "biz_error" | "bad_response"; detail: string };

/**
 * 发送 Server酱 推送。
 * @param title 消息标题（微信里直接可见）
 * @param desp  消息内容（支持 Markdown）
 * @param opts.retries 失败时重试次数（默认 2）
 */
export async function sendServerChan(
  title: string,
  desp: string,
  opts: { retries?: number } = {}
): Promise<ServerChanResult> {
  const sendKey = (process.env.SERVERCHAN_SENDKEY ?? "").trim();
  if (!sendKey) {
    console.log(`[serverchan] 未配置 SERVERCHAN_SENDKEY，跳过推送：${title}`);
    return { ok: false, reason: "no_sendkey", detail: "SERVERCHAN_SENDKEY env 未配置" };
  }

  const retries = opts.retries ?? MAX_RETRIES;
  const safeTitle = title.slice(0, 32);
  const safeDesp = desp.slice(0, 8000);

  let lastErr: ServerChanResult | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // 指数退避：1s, 2s, 4s ...
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.log(`[serverchan] 第 ${attempt} 次重试（${delay}ms 后）: ${safeTitle}`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const result = await sendOnce(sendKey, safeTitle, safeDesp);
    if (result.ok) {
      console.log(
        `[serverchan] 推送成功: ${safeTitle} pushid=${result.pushid ?? "?"} attempt=${attempt}`
      );
      return result;
    }
    lastErr = result;
    // no_sendkey 不重试
    if (result.reason === "no_sendkey") break;
  }

  // 全部重试都失败
  console.error(
    `[serverchan] 推送最终失败: ${safeTitle} | ${lastErr ? `${lastErr.reason}: ${lastErr.detail}` : "未知原因"}`
  );
  return lastErr ?? { ok: false, reason: "fetch_error", detail: "未知错误" };
}

async function sendOnce(
  sendKey: string,
  title: string,
  desp: string
): Promise<ServerChanResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = new URLSearchParams({ title, desp });
    const res = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false,
        reason: "bad_response",
        detail: `非 JSON 响应 status=${res.status} body=${text.slice(0, 200)}`,
      };
    }
    // Server酱 成功返回 code===0 / errno===0
    const code = json?.code;
    const errno = json?.errno;
    if (code === 0 && (errno === undefined || errno === 0)) {
      return {
        ok: true,
        pushid: json?.data?.pushid,
        readkey: json?.data?.readkey,
      };
    }
    return {
      ok: false,
      reason: "biz_error",
      detail: `code=${code} errno=${errno} message=${json?.message ?? ""} error=${json?.data?.error ?? ""}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "fetch_error", detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

const TARGET_LABEL: Record<string, string> = {
  single_report: "默契测试 · 单人报告",
  pair_report: "默契测试 · 双人报告",
  personality_report: "性格测试 · 完整报告",
};

/** 「我已支付」触发的新待复核订单通知（返回推送结果，给上层路由决定后续） */
export async function notifyPaymentPendingReview(input: {
  paymentId: string;
  targetType: string;
  amount: number;
  reviewUrl: string;
}): Promise<ServerChanResult> {
  const label = TARGET_LABEL[input.targetType] ?? input.targetType;
  const title = `💰 新订单待复核 ¥${input.amount.toFixed(2)}`;
  const desp = [
    `**类型**：${label}`,
    `**金额**：¥${input.amount.toFixed(2)}`,
    `**订单号**：${input.paymentId}`,
    `**时间**：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    ``,
    `👉 [点我打开复核页（确认已收 / 驳回）](${input.reviewUrl})`,
    ``,
    `核对微信收款到账后再点「确认已收」，未付款点「驳回」。`,
  ].join("\n\n");
  return sendServerChan(title, desp);
}