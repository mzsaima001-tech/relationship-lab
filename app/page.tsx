"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HOME_COPY_SETS, HOME_CTA } from "@/lib/home-copy";
import { TAROT_CARDS, tarotImage } from "@/lib/reports/tarot";
import { CompassDial, StarMap, OrnamentDivider } from "./components/decor";

/** 洗牌：返回不重复的随机索引 */
function shuffledIndexes(length: number, count: number): number[] {
  const pool = Array.from({ length }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export default function Home() {
  // SSR 与首帧渲染用固定默认值，mount 后随机切换（避免 hydration 不一致）
  const [copyIdx, setCopyIdx] = useState(0);
  const [cardIdxs, setCardIdxs] = useState<number[]>([0, 3, 7]);
  const [fileNo, setFileNo] = useState("004173");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCopyIdx(Math.floor(Math.random() * HOME_COPY_SETS.length));
    setCardIdxs(shuffledIndexes(TAROT_CARDS.length, 3));
    setFileNo(String(Math.floor(100000 + Math.random() * 900000)));
    setReady(true);
  }, []);

  const copy = HOME_COPY_SETS[copyIdx];
  const spread = cardIdxs.map((i) => TAROT_CARDS[i]);

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-6 sm:py-16 overflow-hidden">
      {/* ===== 背景层：星图连线 + 慢转罗盘 ===== */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <StarMap opacity={0.13} seed={1} />
        <div className="absolute left-1/2 top-14 -translate-x-1/2">
          <CompassDial size={430} opacity={0.11} />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-md sm:max-w-lg md:max-w-2xl flex-col items-center">
        <div className="flex items-center gap-4 mb-10 fade-in">
          <span className="archive-label">Relationship Lab</span>
          <span className="w-12 h-px bg-[var(--border-dim)]" />
          <span className="file-number">No. {fileNo}</span>
        </div>

        <div className="text-center space-y-4 sm:space-y-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="display-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-warm)] leading-tight">
            默契研究所
          </h1>
          <p className="text-sm text-[var(--text-muted)] tracking-widest">
            Relationship Lab
          </p>
        </div>

        <OrnamentDivider className="mt-6 sm:mt-8 w-56 fade-in-up" />

        {/* ===== 钩子文案（随机一套，淡入） ===== */}
        <div
          className={`mt-8 sm:mt-12 space-y-5 sm:space-y-6 text-center leading-relaxed text-[15px] md:text-base transition-opacity duration-700 px-1 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="display-serif text-lg sm:text-xl md:text-2xl text-[var(--text-warm)]">
            {copy.hook.map((line, i) => (
              <span key={i}>
                {line}
                {i < copy.hook.length - 1 && <br />}
              </span>
            ))}
          </p>

          <div className="space-y-2 text-[var(--text-muted)] text-sm md:text-[15px] pt-3 sm:pt-4">
            {copy.scenes.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>

          <p className="display-serif text-base sm:text-lg text-[var(--text-warm)] pt-3 sm:pt-4">
            {copy.insight.map((line, i) => (
              <span key={i}>
                {line}
                {i < copy.insight.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>

        {/* ===== 塔罗牌阵（随机三张，扇形悬浮 + 3D 透视） ===== */}
        <div
          className={`mt-10 sm:mt-14 flex flex-col items-center transition-opacity duration-700 delay-150 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative flex items-end justify-center" style={{ perspective: "900px" }}>
            {spread.map((card, i) => {
              // —— 角度稍微大一点，配合 3D 透视更立体 ——
              const rotate = i === 0 ? "-rotate-[12deg]" : i === 2 ? "rotate-[12deg]" : "rotate-0";
              const offset = i === 1 ? "-translate-y-4 z-20" : i === 0 ? "z-10" : "z-10";
              const side = i === 0 ? "-mr-6 sm:-mr-8" : i === 2 ? "-ml-6 sm:-ml-8" : "";
              const isCenter = i === 1;
              return (
                <span
                  key={card.slug}
                  className={`${rotate} ${offset} ${side} transition-transform popin-3d wobble-3d ${
                    isCenter ? "glow-pulse" : ""
                  }`}
                  style={{ animationDelay: `${i * 0.18}s, ${i * 1.6 + 0.4}s` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tarotImage(card.slug)}
                    alt={`塔罗牌：${card.cardTitle}`}
                    className="tarot-mini w-[110px] sm:w-[130px] md:w-[160px]"
                    style={{ animationDelay: `${i * 1.4}s` }}
                    loading="eager"
                  />
                </span>
              );
            })}
          </div>
          <p className="mt-5 sm:mt-6 text-xs sm:text-sm text-[var(--text-muted)] tracking-widest">
            七十四面镜子，总有一面是你
          </p>
        </div>

        {/* ===== CTA（两个测试入口：手机端竖排满宽，桌面端并排等宽 + 颜色区分） ===== */}
        <div
          className="mt-10 sm:mt-12 flex flex-col items-center gap-3 sm:gap-4 fade-in-up w-full max-w-md sm:max-w-lg"
          style={{ animationDelay: "0.5s" }}
        >
          {/* 两个按钮：手机竖排，桌面并排 */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-3 w-full gap-3">
            <Link href="/start" className="w-full">
              <button
                className="w-full font-semibold text-[15px] px-5 py-3.5 rounded min-h-[48px]"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg-dark)",
                  border: "none",
                  transition: "all 0.2s ease",
                }}
              >
                {HOME_CTA}
              </button>
            </Link>
            <Link href="/personality" className="w-full">
              <button
                className="w-full font-semibold text-[15px] px-5 py-3.5 rounded min-h-[48px]"
                style={{
                  background: "transparent",
                  color: "var(--text-warm)",
                  border: "1px solid var(--accent-dim)",
                  transition: "all 0.2s ease",
                }}
              >
                我的性格测试 →
              </button>
            </Link>
          </div>

          {/* 两个副说明：手机端竖排+居左，桌面端并排 */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-3 w-full text-xs text-[var(--text-muted)] tracking-wider gap-1.5">
            <p className="text-center sm:text-center">
              约 3 分钟 · 无需注册 · TA 看不到你的单题答案
            </p>
            <p className="text-center sm:text-center">
              36 题 · 约 5 分钟 · 基础结果免费查看
            </p>
          </div>
        </div>

        <div className="mt-14 sm:mt-20 flex items-center gap-3 fade-in" style={{ animationDelay: "0.8s" }}>
          <span className="w-8 h-px bg-[var(--border-dim)]" />
          <span className="file-number">EST. 2025</span>
          <span className="w-8 h-px bg-[var(--border-dim)]" />
        </div>
      </div>
    </main>
  );
}
