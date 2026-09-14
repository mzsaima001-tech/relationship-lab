"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { peekVisitorId } from "@/lib/visitor";

/**
 * 全局「我的结果」浮动按钮（挂在 root layout，除 /admin 外每页可见）。
 *
 * 场景：用户测到一半/付完款退出页面，回来找不到结果。
 * 逻辑：
 * - 默契测试：/start 提交时会把最新 sessionId 写进 localStorage("sessionId")，
 *   这里用它查 complete 接口判断状态（已完成 → /result/:id；未完成 → /test/:id 续答）。
 * - 性格测试：用统一访客 ID 查 /api/personality/tests/latest
 *   （已完成 → 结果页/已付费完整报告；未完成 → 续答页）。
 * - 两个都有 → 弹出选择卡；都没有 → 提示「请先测试」。
 *
 * 注意：两种记录都基于本机浏览器（localStorage / visitorId），
 * 覆盖"同一台设备上退出后找回"的场景；换设备无法找回（无账号体系）。
 */

type ResultEntry = {
  key: "couple" | "personality";
  title: string;
  done: boolean;
  href: string;
};

export default function MyResultsButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [modal, setModal] = useState<"none" | "empty" | "choose">("none");
  const [entries, setEntries] = useState<ResultEntry[]>([]);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/review")) return null;

  const close = () => setModal("none");

  const handleClick = async () => {
    if (checking) return;
    setChecking(true);
    const found: ResultEntry[] = [];
    const tasks: Promise<void>[] = [];

    // ---- 默契测试：localStorage 里的最新 sessionId ----
    let sid = "";
    try {
      sid = localStorage.getItem("sessionId") || "";
    } catch {
      /* localStorage 不可用 */
    }
    if (sid) {
      tasks.push(
        (async () => {
          try {
            // lite=1：跳过 AI 重润色，只取状态，秒回
            const res = await fetch(`/api/assessments/${sid}/complete?lite=1`);
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.sessionId) {
              found.push({
                key: "couple",
                title: "默契测试",
                done: true,
                href: `/result/${sid}`,
              });
            } else if (json?.status === "started") {
              found.push({
                key: "couple",
                title: "默契测试",
                done: false,
                href: `/test/${sid}`,
              });
            }
            // 其它情况（记录不存在等）视为无记录
          } catch {
            /* 网络失败不阻塞 */
          }
        })()
      );
    }

    // ---- 性格测试：统一访客 ID 查最近一次 ----
    const vid = peekVisitorId();
    if (vid) {
      tasks.push(
        (async () => {
          try {
            const res = await fetch(
              `/api/personality/tests/latest?visitorId=${encodeURIComponent(vid)}`
            );
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.testId) {
              if (json.status === "completed") {
                found.push({
                  key: "personality",
                  title: "性格测试",
                  done: true,
                  href: json.isPaid
                    ? `/personality/report/${json.testId}`
                    : `/personality/result/${json.testId}`,
                });
              } else {
                found.push({
                  key: "personality",
                  title: "性格测试",
                  done: false,
                  href: `/personality/test?testId=${json.testId}`,
                });
              }
            }
          } catch {
            /* 网络失败不阻塞 */
          }
        })()
      );
    }

    await Promise.all(tasks);
    setChecking(false);

    if (!found.length) {
      setEntries([]);
      setModal("empty");
      return;
    }
    if (found.length === 1) {
      router.push(found[0].href);
      return;
    }
    // 两个测试都有记录：完成的排前面，让用户选
    found.sort((a, b) => Number(b.done) - Number(a.done));
    setEntries(found);
    setModal("choose");
  };

  return (
    <>
      {/* 浮动入口 */}
      <button
        type="button"
        onClick={handleClick}
        disabled={checking}
        aria-label="查看我的测试结果"
        className="fixed z-40 flex items-center gap-1.5 rounded-full border border-[var(--border-dim)] px-3.5 text-xs tracking-wider text-[var(--text-warm)] shadow-lg backdrop-blur transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{
          right: "14px",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          background: "rgba(20,17,11,0.88)",
          minHeight: "36px",
        }}
      >
        <span aria-hidden>📜</span>
        {checking ? "查找中…" : "我的结果"}
      </button>

      {/* 弹层 */}
      {modal !== "none" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xs rounded-lg border border-[var(--border-dim)] p-6 text-center"
            style={{ background: "#14110b" }}
            onClick={(e) => e.stopPropagation()}
          >
            {modal === "empty" ? (
              <>
                <p className="display-serif text-lg text-[var(--text-warm)] mb-2">
                  请先测试
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-5">
                  这台设备上还没有你的测试记录。
                  <br />
                  先去测一个，结果会为你留在这里。
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => router.push("/start")}
                    className="w-full rounded-md border border-[var(--accent)]/50 py-2.5 text-sm text-[var(--accent)] tracking-wider hover:bg-[var(--accent)]/10 transition-colors"
                  >
                    默契测试 · 约 3 分钟
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/personality")}
                    className="w-full rounded-md border border-[var(--border-dim)] py-2.5 text-sm text-[var(--text-warm)] tracking-wider hover:bg-white/5 transition-colors"
                  >
                    性格测试 · 约 5 分钟
                  </button>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
                >
                  先不了
                </button>
              </>
            ) : (
              <>
                <p className="display-serif text-lg text-[var(--text-warm)] mb-1.5">
                  我的测试结果
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-5">
                  你在这台设备上有 {entries.length} 份记录
                </p>
                <div className="flex flex-col gap-2.5">
                  {entries.map((e) => (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => router.push(e.href)}
                      className="w-full rounded-md border border-[var(--border-dim)] py-3 px-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="block text-sm text-[var(--text-warm)] tracking-wider">
                        {e.title}
                        {e.done ? "报告" : ""}
                      </span>
                      <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                        {e.done ? "已完成 · 点击查看" : "未完成 · 点击继续作答"}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
                >
                  关闭
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
