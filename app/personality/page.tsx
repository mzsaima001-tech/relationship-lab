"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarMap, CompassDial, OrnamentDivider } from "@/app/components/decor";

// =====================================================
// /personality — v1 风格的简洁入口页（与首页 CTA 视觉一致）
//
// 底层数据走 v2（题库/算法/卡片全是 v5 月相卡）。
// 入口 URL 仍然是 /personality，确保老链接、历史分享都进得来。
// v5 专属新入口 /personality-v2 仍可独立访问。
// =====================================================

const STORAGE_KEY = "personalityVisitorId_v2";

function makeVisitorId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `v2_${crypto.randomUUID()}`;
    }
  } catch {
    /* 某些 webview */
  }
  return `v2_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id: string | null = null;
  try {
    id = localStorage.getItem(STORAGE_KEY);
  } catch {
    return makeVisitorId();
  }
  if (!id) {
    id = makeVisitorId();
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* 写不动忽略 */
    }
  }
  return id;
}

export default function PersonalityEntry() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const startTest = async () => {
    setCreating(true);
    try {
      const visitorId = getOrCreateVisitorId();
      const res = await fetch(`/api/personality-v2/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
      const json = await res.json();
      if (json.testId) {
        router.push(`/personality-v2/test?testId=${json.testId}`);
        return;
      }
    } catch (err) {
      console.error(err);
    }
    setCreating(false);
  };

  return (
    <main className="relative flex-1 flex flex-col items-center px-5 py-10 sm:px-6 sm:py-14 overflow-hidden">
      {/* 背景：星图 + 罗盘（与首页同款） */}
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
          你是哪一面镜子？
        </h1>

        <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[var(--text-muted)] leading-relaxed fade-in-up px-2" style={{ animationDelay: "0.1s" }}>
          36 个问题，看清自己最近的样子。
          <br />
          不打分，不评价，只如实呈现你当下的轮廓。
        </p>

        <OrnamentDivider className="mt-7 sm:mt-8 w-44 fade-in-up" />

        <ul className="mt-6 sm:mt-7 space-y-1.5 text-sm text-[var(--text-muted)] fade-in-up" style={{ animationDelay: "0.15s" }}>
          <li>· 约 5 分钟</li>
          <li>· 无需注册</li>
          <li>· 基础结果免费查看</li>
        </ul>

        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3 fade-in-up w-full" style={{ animationDelay: "0.25s" }}>
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
            {creating ? "准备中..." : "开始测试"}
          </button>
          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors mt-3 min-h-[44px] inline-flex items-center px-4"
          >
            ← 返回首页
          </Link>
        </div>

        <p className="mt-12 sm:mt-16 text-[11px] text-[var(--text-muted)] leading-relaxed max-w-md fade-in px-2" style={{ animationDelay: "0.5s" }}>
          本测试用于人格探索与娱乐，不构成医学、心理学或精神健康诊断。测试结果不应代替专业意见。
        </p>
      </div>
    </main>
  );
}