"use client";

import { useEffect, useState } from "react";
import { CompassDial, StarMap } from "./decor";

const STAGES = [
  "正在分析你的回答模式…",
  "正在比对 74 种关系原型…",
  "正在破译你的隐藏信号…",
  "正在撰写你的专属解读…",
  "正在为你翻开属于你的牌…",
];

/**
 * 全屏「分析中」过渡页：答完最后一题到报告生成之间的等待缓冲。
 * 星空背景 + 缓转罗盘 + 阶段文案轮播 + 平滑假进度条，让用户明确知道正在处理。
 * 实测 POST /complete 约 30s，进度条按 ~35s 铺满设计。
 */
export function AnalyzingScreen({
  title = "请稍候，正在分析你的结果",
  hint = "生成完整报告约需 20–40 秒，请不要关闭页面",
}: {
  title?: string;
  hint?: string;
}) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  // 阶段文案轮播
  useEffect(() => {
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2800);
    return () => clearInterval(t);
  }, []);

  // 平滑假进度：起步快、逐渐减速、封顶 96%（实测生成 ~30s，保证等待期间进度条始终在动）
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 96) return p;
        const remain = 96 - p;
        return p + Math.max(0.15, remain * 0.022);
      });
    }, 140);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="night-sky flex-1 flex flex-col items-center justify-center px-6 min-h-screen">
      <StarMap opacity={0.14} seed={7} />
      <div className="relative flex flex-col items-center text-center">
        {/* 缓转罗盘 + 中心脉动光点 */}
        <div className="relative mb-9 flex items-center justify-center">
          <CompassDial size={180} opacity={0.5} />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
        </div>

        <p className="archive-label mb-3">Analyzing</p>
        <h2 className="display-serif text-xl md:text-2xl text-[var(--text-warm)] mb-3">
          {title}
        </h2>

        {/* 阶段文案轮播（key 触发淡入动画） */}
        <p key={stage} className="fade-in-up text-sm text-[var(--accent)] h-5">
          {STAGES[stage]}
        </p>

        {/* 进度条 */}
        <div className="progress-track h-1 w-56 mt-7">
          <div
            className="progress-fill h-full"
            style={{ width: `${progress}%`, transition: "width 0.5s ease-out" }}
          />
        </div>

        <p className="text-[11px] text-[var(--text-muted)] mt-5">{hint}</p>
      </div>
    </main>
  );
}
