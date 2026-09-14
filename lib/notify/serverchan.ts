// =====================================================
// Server酱·Turbo 推送（消息直达微信服务号）
//
// 原理：站长微信关注「Server酱·Turbo」服务号并扫码绑定后，
// 服务端 POST https://sctapi.ftqq.com/<SENDKEY>.send 即可把消息
// 推到站长微信——用来通知「有新订单待复核」，消息里带免登录审批链接。
//
// 配置：环境变量 SERVERCHAN_SENDKEY（sct.ftqq.com 登录后在「SendKey」页复制）
// 未配置时静默跳过（只打日志），不影响主流程。
// =====================================================

const TIMEOUT_MS = 8000;

/**
 * 发送 Server酱 推送。fire-and-forget 使用（调用方 .catch 忽略即可）。
 * @param title 消息标题（微信里直接可见）
 * @param desp  消息内容（支持 Markdown）
 */
export async function sendServerChan(title: string, desp: string): Promise<void> {
  const sendKey = (process.env.SERVERCHAN_SENDKEY ?? "").trim();
  if (!sendKey) {
    console.log(`[serverchan] 未配置 SERVERCHAN_SENDKEY，跳过推送：${title}`);
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = new URLSearchParams({ title: title.slice(0, 32), desp: desp.slice(0, 8000) });
    const res = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    // Server酱成功返回 code===0；失败常见：KEY 错误 / 超出免费额度
    if (!json || json.code !== 0) {
      console.warn(`[serverchan] 推送失败: ${JSON.stringify(json)?.slice(0, 200)}`);
    }
  } catch (e) {
    console.warn(`[serverchan] 推送异常: ${e instanceof Error ? e.message : e}`);
  } finally {
    clearTimeout(timer);
  }
}

const TARGET_LABEL: Record<string, string> = {
  single_report: "默契测试 · 单人报告",
  pair_report: "默契测试 · 双人报告",
  personality_report: "性格测试 · 完整报告",
};

/** 「我已支付」触发的新待复核订单通知 */
export async function notifyPaymentPendingReview(input: {
  paymentId: string;
  targetType: string;
  amount: number;
  reviewUrl: string;
}): Promise<void> {
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
  await sendServerChan(title, desp);
}
