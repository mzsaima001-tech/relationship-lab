"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarMap, CompassDial, OrnamentDivider } from "../components/decor";

const STORAGE_KEY = "personalityVisitorId";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `v_${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export default function PersonalityHome() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [resumedTestId, setResumedTestId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    // 检查是否有未完成测试
    (async () => {
      try {
        const res = await fetch(`/api/personality/tests`, {
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
        // 静默失败：测试创建按钮仍可点
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const startTest = async () => {
    setCreating(true);
    try {
      const visitorId = getOrCreateVisitorId();
      const res = await fetch(`/api/personality/tests`, {
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
    <main className="relative flex-1 flex flex-col items-center px-6 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <StarMap opacity={0.10} seed={9} />
        <div className="absolute left-1/2 top-20 -translate-x-1/2">
          <CompassDial size={360} opacity={0.09} />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-8 fade-in">
          <span className="archive-label">人格实验室</span>
          <span className="w-12 h-px bg-[var(--border-dim)]" />
          <span className="file-number">SELF · 36</span>
        </div>

        <h1 className="display-serif text-4xl md:text-5xl font-bold text-[var(--text-warm)] leading-tight fade-in-up">
          你真的了解自己吗？
        </h1>

        <p className="mt-6 text-base md:text-lg text-[var(--text-muted)] leading-relaxed fade-in-up" style={{ animationDelay: "0.1s" }}>
          36 个问题，看清你的真实人格、隐藏性格和决策模式。
        </p>

        <OrnamentDivider className="mt-8 w-48 fade-in-up" />

        <ul className="mt-8 space-y-2 text-sm text-[var(--text-muted)] fade-in-up" style={{ animationDelay: "0.2s" }}>
          <li>· 约 5 分钟完成</li>
          <li>· 无需注册即可测试</li>
          <li>· 基础结果免费查看</li>
        </ul>

        <div className="mt-12 flex flex-col items-center gap-4 fade-in-up" style={{ animationDelay: "0.3s" }}>
          {resumedTestId ? (
            <>
              <button onClick={startTest} disabled={creating} className="btn-primary">
                继续测试 →
              </button>
              <button
                onClick={() => {
                  if (confirm("确认重新开始？未完成进度将被丢弃。")) {
                    localStorage.removeItem("personalityResumeTestId");
                    setResumedTestId(null);
                    startTest();
                  }
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
              >
                重新开始
              </button>
            </>
          ) : (
            <button onClick={startTest} disabled={creating || !ready} className="btn-primary">
              {creating ? "准备中..." : "开始测试"}
            </button>
          )}
          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors mt-4"
          >
            ← 返回首页
          </Link>
        </div>

        <p className="mt-16 text-[11px] text-[var(--text-muted)] leading-relaxed max-w-md fade-in" style={{ animationDelay: "0.6s" }}>
          本测试用于人格探索与娱乐，不构成医学、心理学或精神健康诊断。测试结果不应代替专业意见。
        </p>
      </div>
    </main>
  );
}