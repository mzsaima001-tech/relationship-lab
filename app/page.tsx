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
    <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      {/* ===== 背景层：星图连线 + 慢转罗盘 ===== */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <StarMap opacity={0.13} seed={1} />
        <div className="absolute left-1/2 top-14 -translate-x-1/2">
          <CompassDial size={430} opacity={0.11} />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <div className="flex items-center gap-4 mb-10 fade-in">
          <span className="archive-label">Relationship Lab</span>
          <span className="w-12 h-px bg-[var(--border-dim)]" />
          <span className="file-number">No. {fileNo}</span>
        </div>

        <div className="text-center space-y-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="display-serif text-4xl md:text-5xl font-bold text-[var(--text-warm)] leading-tight">
            默契研究所
          </h1>
          <p className="text-sm text-[var(--text-muted)] tracking-widest">
            Relationship Lab
          </p>
        </div>

        <OrnamentDivider className="mt-8 w-56 fade-in-up" />

        {/* ===== 钩子文案（随机一套，淡入） ===== */}
        <div
          className={`mt-12 space-y-6 text-center leading-relaxed text-[15px] md:text-base transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="display-serif text-xl md:text-2xl text-[var(--text-warm)]">
            {copy.hook.map((line, i) => (
              <span key={i}>
                {line}
                {i < copy.hook.length - 1 && <br />}
              </span>
            ))}
          </p>

          <div className="space-y-2 text-[var(--text-muted)] text-sm md:text-[15px] pt-4">
            {copy.scenes.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>

          <p className="display-serif text-lg text-[var(--text-warm)] pt-4">
            {copy.insight.map((line, i) => (
              <span key={i}>
                {line}
                {i < copy.insight.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>

        {/* ===== 塔罗牌阵（随机三张，扇形悬浮） ===== */}
        <div
          className={`mt-14 flex flex-col items-center transition-opacity duration-700 delay-150 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative flex items-end justify-center">
            {spread.map((card, i) => {
              const rotate = i === 0 ? "-rotate-[9deg]" : i === 2 ? "rotate-[9deg]" : "rotate-0";
              const offset = i === 1 ? "-translate-y-3 z-10" : "z-0";
              const side = i === 0 ? "-mr-5" : i === 2 ? "-ml-5" : "";
              return (
                <span key={card.slug} className={`${rotate} ${offset} ${side} transition-transform`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tarotImage(card.slug)}
                    alt={`塔罗牌：${card.cardTitle}`}
                    className="tarot-mini floaty w-[74px] md:w-[88px]"
                    style={{ animationDelay: `${i * 1.4}s` }}
                    loading="eager"
                  />
                </span>
              );
            })}
          </div>
          <p className="mt-5 text-xs text-[var(--text-muted)] tracking-widest">
            十一面镜像，总有一面是你
          </p>
        </div>

        {/* ===== CTA（两个测试入口，并排等宽，颜色区分） ===== */}
        <div
          className="mt-12 flex flex-col items-center gap-4 fade-in-up w-full max-w-lg"
          style={{ animationDelay: "0.5s" }}
        >
          {/* 两个按钮并排等宽 */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <Link href="/start" className="w-full">
              <button
                className="w-full font-semibold text-[15px] px-5 py-3.5 rounded"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg-dark)",
                  border: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4b87a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
              >
                {HOME_CTA}
              </button>
            </Link>
            <Link href="/personality" className="w-full">
              <button
                className="w-full font-semibold text-[15px] px-5 py-3.5 rounded"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg-dark)",
                  border: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4b87a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
              >
                我的性格测试 →
              </button>
            </Link>
          </div>

          {/* 两个副说明，并排对齐各自按钮下方 */}
          <div className="grid grid-cols-2 gap-3 w-full text-xs text-[var(--text-muted)] tracking-wider">
            <p className="text-center">
              约3分钟 · 无需注册 · TA看不到你的单题答案
            </p>
            <p className="text-center">
              36题 · 约5分钟 · 基础结果免费查看
            </p>
          </div>
        </div>

        <div className="mt-20 flex items-center gap-3 fade-in" style={{ animationDelay: "0.8s" }}>
          <span className="w-8 h-px bg-[var(--border-dim)]" />
          <span className="file-number">EST. 2025</span>
          <span className="w-8 h-px bg-[var(--border-dim)]" />
        </div>
      </div>
    </main>
  );
}
