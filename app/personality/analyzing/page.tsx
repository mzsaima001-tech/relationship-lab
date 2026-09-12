"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
  // —— 提前跳开关 —— 结果产出即可立刻跳转，不必等满 10s ——
  const jumpedRef = useRef(false);
  const doJump = () => {
    if (jumpedRef.current) return;
    jumpedRef.current = true;
    router.push(`/personality/result/${testId}`);
  };

  useEffect(() => {
    if (!testId) return;
    // ① 文案分阶段轮换（视觉缓冲，无论何时跳都有动画在转）
    const timer = setInterval(() => {
      setStage((s) => (s + 1) % (STAGES.length + 1));
    }, 900);

    // ② 轮询"已完成"端点：结果一旦就绪立刻跳
    const probe = async () => {
      try {
        const res = await fetch(`/api/personality/tests/${testId}/result`, {
          cache: "no-store",
        });
        if (res.ok) {
          // 数据已就绪 → 立刻跳
          doJump();
          return true;
        }
      } catch {
        /* 网络抖动下一轮重试 */
      }
      return false;
    };
    const pollTimer = setInterval(async () => {
      if (jumpedRef.current) return;
      const ready = await probe();
      if (ready) {
        clearInterval(pollTimer);
      }
    }, 800);

    // ③ 兜底硬上限 10s：万一端点一直 404 或网络断了，强制跳
    const hardCap = setTimeout(doJump, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(pollTimer);
      clearTimeout(hardCap);
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
        <p className="text-xs text-[var(--text-muted)]">正在为你生成报告…</p>
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
