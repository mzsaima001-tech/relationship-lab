"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StarMap, CompassDial } from "../../components/decor";

const STAGES = [
  "正在分析你的决策模式",
  "正在分析你的社交能量",
  "正在识别你的隐藏人格",
  "正在匹配你的八种原型",
  "正在生成你的人格画像",
];

function AnalyzingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const testId = sp.get("testId") || "";
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!testId) return;
    const timer = setInterval(() => {
      setStage((s) => (s + 1) % (STAGES.length + 1));
    }, 900);
    const nav = setTimeout(() => {
      router.push(`/personality/result/${testId}`);
    }, 4500);
    return () => {
      clearInterval(timer);
      clearTimeout(nav);
    };
  }, [testId, router]);

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <StarMap opacity={0.12} seed={11} />
        <div className="absolute left-1/2 top-20 -translate-x-1/2">
          <CompassDial size={420} opacity={0.10} spin />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-10" />
        <h2 className="display-serif text-xl md:text-2xl text-[var(--text-warm)] mb-6">
          {STAGES[stage] || "分析完成"}
        </h2>
        <p className="text-xs text-[var(--text-muted)]">约 5 秒后进入结果页</p>
      </div>
    </main>
  );
}

export default function PersonalityAnalyzing() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <AnalyzingInner />
    </Suspense>
  );
}
