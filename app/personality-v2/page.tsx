"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarMap, CompassDial, OrnamentDivider } from "@/app/components/decor";

const STORAGE_KEY = "personalityVisitorId_v2";
const LAST_RESULT_KEY = "personality_v2_last_result";
const LAST_TEST_KEY = "personality_v2_last_test";

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

interface Top1Memory {
  testId: string;
  cardName: string;
  testAt: string;
}

function readLastResult(): Top1Memory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_TEST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Top1Memory;
  } catch {
    return null;
  }
}

export default function PersonalityV2Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [resumedTestId, setResumedTestId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [lastResult, setLastResult] = useState<Top1Memory | null>(null);

  useEffect(() => {
    setLastResult(readLastResult());
    const visitorId = getOrCreateVisitorId();
    (async () => {
      try {
        const res = await fetch(`/api/personality-v2/tests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.testId && json.resumed) {
          setResumedTestId(json.testId);
        }
      } catch {
        /* 静默 */
      } finally {
        setReady(true);
      }
    })();
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
        router.push(`/personality/test?testId=${json.testId}`);
      }
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  return (
    <main className="relative flex-1 flex flex-col items-center px-5 py-10 sm:px-6 sm:py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <StarMap opacity={0.10} seed={9} />
        <div className="absolute left-1/2 top-20 -translate-x-1/2">
          <CompassDial size={360} opacity={0.09} />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-md sm:max-w-xl flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-6 sm:mb-8 fade-in">
          <span className="archive-label">月相人格 · v5</span>
          <span className="w-12 h-px bg-[var(--border-dim)]" />
          <span className="file-number">SELF · 30 卡</span>
        </div>

        <h1 className="display-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-warm)] leading-tight fade-in-up">
          你是哪张月相卡？
        </h1>

        <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[var(--text-muted)] leading-relaxed fade-in-up px-2" style={{ animationDelay: "0.1s" }}>
          36 个问题，看清你的六维轮廓；30 张月相卡定位你最近的自己。
        </p>

        <OrnamentDivider className="mt-7 sm:mt-8 w-48 fade-in-up" />

        <ul className="mt-7 sm:mt-8 space-y-2 text-sm text-[var(--text-muted)] fade-in-up" style={{ animationDelay: "0.2s" }}>
          <li>· 5 套题库随机抽取 1 套</li>
          <li>· 6 维度按真实感受累加</li>
          <li>· 余弦相似度匹配 Top3 月相卡</li>
          <li>· 复测可看到「上次 — 这次」的悄悄变化</li>
        </ul>

        {lastResult && (
          <div
            className="mt-6 sm:mt-7 w-full max-w-sm fade-in-up rounded-2xl border border-[var(--border-dim)] bg-[rgba(245,237,224,0.04)] px-5 py-4"
            style={{ animationDelay: "0.25s" }}
          >
            <p className="text-[11px] tracking-[0.38em] text-[var(--accent)] mb-2">
              上次测试 · {new Date(lastResult.testAt).toLocaleDateString("zh-CN")}
            </p>
            <p className="display-serif text-xl text-[var(--text-warm)] leading-snug">
              你是「{lastResult.cardName}」
            </p>
            <Link
              href={`/personality-v2/result/${lastResult.testId}`}
              className="mt-3 inline-block text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors min-h-[36px] leading-[36px]"
            >
              查看上次结果 →
            </Link>
          </div>
        )}

        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-4 fade-in-up w-full" style={{ animationDelay: "0.3s" }}>
          {resumedTestId ? (
            <>
              <button
                onClick={startTest}
                disabled={creating}
                className="btn-primary w-full sm:w-auto sm:min-w-[200px]"
              >
                继续测试 →
              </button>
              <button
                onClick={() => {
                  if (confirm("确认重新开始？未完成进度将被丢弃。")) {
                    localStorage.removeItem("personality_v2_draft");
                    startTest();
                  }
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4"
              >
                重新开始
              </button>
            </>
          ) : (
            <button
              onClick={startTest}
              disabled={creating || !ready}
              className="btn-primary w-full sm:w-auto sm:min-w-[200px]"
            >
              {creating ? "准备中..." : "开始测试"}
            </button>
          )}
          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors mt-3 sm:mt-4 min-h-[44px] inline-flex items-center px-4"
          >
            ← 返回首页
          </Link>
        </div>

        <p className="mt-12 sm:mt-16 text-[11px] text-[var(--text-muted)] leading-relaxed max-w-md fade-in px-2" style={{ animationDelay: "0.6s" }}>
          本测试用于人格探索与娱乐，不构成医学、心理学或精神健康诊断。测试结果不应代替专业意见。
        </p>
      </div>
    </main>
  );
}
