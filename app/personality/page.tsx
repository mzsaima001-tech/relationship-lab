"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StarMap, CompassDial, OrnamentDivider } from "@/app/components/decor";
import {
  getOrCreateVisitorId,
  getStoredRefCode,
  peekVisitorId,
} from "@/lib/visitor";

/**
 * /personality — v1 入口页（人格测试）
 *
 * - 调 v1 后端：POST /api/personality/tests → { testId, resumed }
 * - 跳到 /personality/test?testId=...（v1 答题页，原版 UI/算法/题型）
 * - 数据/算法走 lib/personality/*（v1 questions/scoring/archetypes/report），一行未改
 */

function PersonalityEntry() {
  const router = useRouter();
  const sp = useSearchParams();
  const refCode = sp.get("ref") || "";
  const [creating, setCreating] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  /** 该访客最近一次测试（答过题的人才显示「回到结果」按钮） */
  const [existing, setExisting] = useState<
    { testId: string; status: string; isPaid: boolean } | null
  >(null);

  useEffect(() => {
    setReady(true);
    // 只读统一访客 ID（不创建新 id），查有没有历史测试
    try {
      const vid = peekVisitorId();
      if (!vid) return;
      fetch(`/api/personality/tests/latest?visitorId=${encodeURIComponent(vid)}`)
        .then((r) => r.json())
        .then((j) => {
          if (j?.testId) {
            setExisting({
              testId: j.testId,
              status: j.status,
              isPaid: Boolean(j.isPaid),
            });
          }
        })
        .catch(() => {
          /* 查询失败不阻塞开始测试 */
        });
    } catch {
      /* localStorage 不可用时静默 */
    }
  }, []);

  const startTest = async () => {
    setCreating(true);
    setError("");
    try {
      const visitorId = getOrCreateVisitorId();
      // 归因码：URL ?ref 优先，否则用首页存下的邀请码
      const ref = refCode || getStoredRefCode();
      const res = await fetch(`/api/personality/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          ...(ref ? { referredByCode: ref } : {}),
        }),
      });
      const json = await res.json();
      if (json.testId) {
        router.push(`/personality/test?testId=${json.testId}`);
        return;
      }
      throw new Error(json.error || "创建测试失败");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "出错了，请稍后再试");
      setCreating(false);
    }
  };

  return (
    <main className="relative flex-1 flex flex-col items-center px-5 py-10 sm:px-6 sm:py-14 overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <StarMap opacity={0.10} seed={7} />
        <div className="absolute left-1/2 top-16 -translate-x-1/2">
          <CompassDial size={400} opacity={0.08} />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-md sm:max-w-lg flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-8 sm:mb-10 fade-in">
          <span className="archive-label">性格测试</span>
          <span className="w-10 h-px bg-[var(--border-dim)]" />
          <span className="file-number">SELF</span>
        </div>

        <h1 className="display-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-warm)] leading-tight fade-in-up">
          走一段路，
          <br />
          看一眼当下的月相
        </h1>

        <div className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[var(--text-muted)] leading-loose fade-in-up px-2 max-w-sm" style={{ animationDelay: "0.1s" }}>
          <p>这不是考卷，没有标准答案。</p>
          <p className="mt-2">接下来是 36 个很普通的生活瞬间——</p>
          <p className="mt-2">遇到这些事的时候，你多半会怎么做。</p>
          <p className="mt-3">凭第一反应选就好。</p>
          <p>那个下意识的答案，最像现在的你。</p>
          <p className="mt-3 text-[var(--text-warm)]">走完这段路，你会收到一张只属于你的月相卡。</p>
        </div>

        <OrnamentDivider className="mt-7 sm:mt-8 w-44 fade-in-up" />

        <ul className="mt-6 sm:mt-7 space-y-1.5 text-sm text-[var(--text-muted)] fade-in-up" style={{ animationDelay: "0.15s" }}>
          <li>· 约 5 分钟</li>
          <li>· 无需注册</li>
          <li>· 基础结果免费查看</li>
        </ul>

        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3 fade-in-up w-full" style={{ animationDelay: "0.25s" }}>
          {/* 答过题的老访客：主按钮变成「回到我的结果」 */}
          {existing?.status === "completed" ? (
            <>
              <button
                onClick={() =>
                  router.push(
                    existing.isPaid
                      ? `/personality/report/${existing.testId}`
                      : `/personality/result/${existing.testId}`
                  )
                }
                className="w-full sm:w-auto sm:min-w-[220px] font-semibold text-[15px] px-6 py-3.5 rounded min-h-[48px]"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg-dark)",
                  border: "none",
                  transition: "all 0.2s ease",
                }}
              >
                {existing.isPaid ? "查看我的完整报告" : "查看我的测试结果"}
              </button>
              <button
                onClick={startTest}
                disabled={creating || !ready}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4"
              >
                {creating ? "准备中..." : "重新测一次 →"}
              </button>
            </>
          ) : (
            <button
              onClick={startTest}
              disabled={creating || !ready}
              className="w-full sm:w-auto sm:min-w-[220px] font-semibold text-[15px] px-6 py-3.5 rounded min-h-[48px]"
              style={{
                background: "var(--accent)",
                color: "var(--bg-dark)",
                border: "none",
                transition: "all 0.2s ease",
              }}
            >
              {creating
                ? "准备中..."
                : existing?.status === "started"
                  ? "继续上次未完成的测试"
                  : "开始测试"}
            </button>
          )}
          {error && (
            <p className="text-xs text-[var(--danger)] mt-2">{error}</p>
          )}
          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors mt-3 min-h-[44px] inline-flex items-center px-4"
          >
            ← 返回首页
          </Link>
          {existing && (
            <p className="text-[11px] text-[var(--text-muted)] opacity-70 mt-1">
              结果保存在本设备浏览器中
            </p>
          )}
        </div>

        <p className="mt-12 sm:mt-16 text-[11px] text-[var(--text-muted)] leading-relaxed max-w-md fade-in px-2" style={{ animationDelay: "0.5s" }}>
          本测试用于人格探索与娱乐，不构成医学、心理学或精神健康诊断。测试结果不应代替专业意见。
        </p>
      </div>
    </main>
  );
}

/**
 * 顶层默认导出包一层 Suspense(Next.js 要求 useSearchParams 必须位于 Suspense 内)
 */
export default function PersonalityEntryPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <PersonalityEntry />
    </Suspense>
  );
}