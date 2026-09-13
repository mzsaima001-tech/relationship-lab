"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OrnamentDivider } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";

interface FreeReport {
  top3: Array<{
    rank: 1 | 2 | 3;
    card_id: string;
    card_name: string;
    card_key: string;
    card_line: string;
    card_phase: string;
    card_phase_en: string;
    card_html: string;
    sim: number;
    is_mixed_marker: boolean;
  }>;
  raw_scores: Record<string, number>;
  norm_scores: Record<string, number>;
  top_dimensions: Array<{
    key: string;
    raw: number;
    z: number;
    summary: string;
  }>;
  last_result_comparison?: {
    last_test_at: string;
    last_top1_card_id: string;
    last_top1_card_name: string;
    diff_dimensions: Array<{
      key: string;
      last: number;
      now: number;
      delta: number;
    }>;
  };
  cor_line: string;
  meta: {
    algorithm_version: string;
    is_mixed: boolean;
    top1_sim: number;
    top2_sim: number;
    top3_sim: number;
  };
}

interface ResultData {
  testId: string;
  paperId: string;
  scores: Record<string, number>;
  freeReport: FreeReport;
  isMixed: boolean;
}

const DIM_CN: Record<string, string> = {
  G: "表达力",
  X: "应对力",
  I: "认可需求",
  F: "方向感",
  S: "自主性",
  E: "情绪觉知",
};

const DIM_ORDER: string[] = ["G", "X", "I", "F", "S", "E"];

export default function PersonalityV2Result() {
  const params = useParams();
  const testId = String(params?.testId || "");

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [iframeLoaded, setIframeLoaded] = useState<Record<string, boolean>>({});
  const [reduceMotion, setReduceMotion] = useState(false);

  // prefers-reduced-motion 检测
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const cb = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);

  useEffect(() => {
    if (!testId) return;
    (async () => {
      try {
        const res = await fetch(`/api/personality-v2/tests/${testId}/result`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setData(json);
        try {
          localStorage.setItem(
            "personality_v2_last_test",
            JSON.stringify({
              testId,
              cardName: json.freeReport.top3[0].card_name,
              testAt: new Date().toISOString(),
            })
          );
          localStorage.setItem(
            "personality_v2_last_result",
            JSON.stringify(json.freeReport)
          );
        } catch {
          /* localStorage 不可用 */
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="text-sm text-[var(--text-muted)]">报告加载中...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-[var(--danger)]">{error || "报告缺失"}</p>
        <Link href="/personality-v2" className="btn-ghost">
          返回测试入口
        </Link>
      </main>
    );
  }

  const { freeReport, scores, isMixed } = data;
  const top1 = freeReport.top3[0];
  const top2 = freeReport.top3[1];
  const top3 = freeReport.top3[2];

  const radarLabels = DIM_ORDER.map((d) => DIM_CN[d]);
  const radarValues = DIM_ORDER.map((d) => freeReport.norm_scores[d] ?? 50);

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 sm:px-6 sm:py-10 max-w-3xl mx-auto w-full safe-bottom">
      {/* ============ 标题区 ============ */}
      <div className="w-full text-center fade-in-up">
        <p className="text-[11px] tracking-[0.38em] text-[var(--accent)] mb-2">
          MOONPHASE · v5
        </p>
        <h1 className="display-serif text-2xl sm:text-3xl md:text-4xl text-[var(--text-warm)] leading-tight">
          你是
          <span className="block sm:inline sm:ml-2 mt-2 sm:mt-0">
            「{top1.card_name}」
          </span>
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-3">
          密钥：{top1.card_key} · 相似度 {(top1.sim * 100).toFixed(1)}%
        </p>
        <OrnamentDivider className="mt-5 w-40 mx-auto" />
      </div>

      {/* ============ Top1 真动画卡 ============ */}
      <CardFrame
        card={top1}
        rank={1}
        animate={!reduceMotion}
        loaded={!!iframeLoaded[`top1`]}
        onLoad={() => setIframeLoaded((s) => ({ ...s, top1: true }))}
        isMain
      />

      {/* ============ cor_line 判词 ============ */}
      <div className="w-full mt-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
        <p className="display-serif text-base sm:text-lg text-[var(--text-warm)] leading-loose text-center">
          {freeReport.cor_line}
        </p>
      </div>

      {/* ============ 混合型/Top2/Top3 ============ */}
      <div className="w-full mt-10 fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="display-serif text-lg sm:text-xl text-[var(--text-warm)]">
            你还靠近这两张
          </h2>
          <span className="text-[10px] tracking-[0.38em] text-[var(--accent)]">
            TOP2 & TOP3
          </span>
        </div>

        <CardFrame
          card={top2}
          rank={2}
          animate={false}
          loaded={!!iframeLoaded[`top2`]}
          onLoad={() => setIframeLoaded((s) => ({ ...s, top2: true }))}
          isMain={false}
        />
        <div className="h-3" />
        <CardFrame
          card={top3}
          rank={3}
          animate={false}
          loaded={!!iframeLoaded[`top3`]}
          onLoad={() => setIframeLoaded((s) => ({ ...s, top3: true }))}
          isMain={false}
        />
      </div>

      {/* ============ 混合型兜底 ============ */}
      {isMixed && (
        <div className="w-full mt-8 fade-in-up rounded-2xl border border-[var(--accent-dim)] bg-[rgba(201,169,110,0.06)] px-5 py-4">
          <p className="text-[11px] tracking-[0.38em] text-[var(--accent)] mb-2">
            混合型 · 没有被一张主卡独占
          </p>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            你在六个方向上都很均衡——这是少见的「在中间」的状态。同一张主卡能解释你 80% 的样子，剩下那 20% 留给你自己。
          </p>
        </div>
      )}

      {/* ============ 6 维度雷达图 ============ */}
      <div className="w-full mt-12 fade-in-up" style={{ animationDelay: "0.3s" }}>
        <h2 className="display-serif text-lg sm:text-xl text-[var(--text-warm)] mb-2">
          六个维度上的你
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">
          50 = 中性。越往边缘，越贴近这一维度的极端。
        </p>
        <div className="flex justify-center">
          <V2Radar values={radarValues} labels={radarLabels} size={340} />
        </div>
      </div>

      {/* ============ 突出维度解读 ============ */}
      <div className="w-full mt-10 fade-in-up" style={{ animationDelay: "0.35s" }}>
        <h2 className="display-serif text-lg sm:text-xl text-[var(--text-warm)] mb-4">
          你最有方向感的两个维度
        </h2>
        <div className="space-y-3">
          {freeReport.top_dimensions.map((d) => (
            <div
              key={d.key}
              className="rounded-xl border border-[var(--border-dim)] bg-[rgba(245,237,224,0.04)] px-4 py-3"
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm text-[var(--text-warm)] font-medium">
                  {DIM_CN[d.key]} ·{" "}
                  <span className="text-[var(--accent)] font-mono text-xs">
                    raw {d.raw} / z {d.z.toFixed(2)}
                  </span>
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {d.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ 上次对比 ============ */}
      {freeReport.last_result_comparison && (
        <div className="w-full mt-10 fade-in-up" style={{ animationDelay: "0.4s" }}>
          <h2 className="display-serif text-lg sm:text-xl text-[var(--text-warm)] mb-2">
            上一次你是「{freeReport.last_result_comparison.last_top1_card_name}」
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">
            复测：六维细微偏移——
          </p>
          <div className="space-y-2">
            {freeReport.last_result_comparison.diff_dimensions.map((d) => {
              const arrow =
                d.delta > 0
                  ? "↑"
                  : d.delta < 0
                  ? "↓"
                  : "·";
              const color =
                Math.abs(d.delta) < 0.5
                  ? "text-[var(--text-muted)]"
                  : d.delta > 0
                  ? "text-[var(--accent)]"
                  : "text-[var(--accent-dim)]";
              return (
                <div
                  key={d.key}
                  className="flex items-center justify-between text-sm border-b border-[var(--border-dim)]/50 pb-2"
                >
                  <span className="text-[var(--text-warm)]">{DIM_CN[d.key]}</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {d.last} → {d.now}
                  </span>
                  <span className={`font-mono text-sm ${color}`}>
                    {arrow} {Math.abs(d.delta).toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ 底部操作 ============ */}
      <div className="w-full mt-12 flex flex-col sm:flex-row items-center gap-3 justify-center fade-in-up" style={{ animationDelay: "0.45s" }}>
        <button
          onClick={() => window.location.reload()}
          className="btn-ghost w-full sm:w-auto"
        >
          再测一次（看变化）
        </button>
        <Link href="/personality-v2" className="btn-primary w-full sm:w-auto">
          返回月相首页
        </Link>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] mt-10 leading-relaxed max-w-md text-center fade-in px-2" style={{ animationDelay: "0.6s" }}>
        算法 v5-moonphase-2026-09-13 · 余弦相似度匹配 30 张月相卡 ·
        本测试用于人格探索与娱乐，不构成医学、心理学或精神健康诊断。
      </p>

      <HomeFooter />
    </main>
  );
}

// ====================================================================
// V2Radar：v2 六维雷达图（泛型输入，纯 SVG，零依赖）
// mount 守卫：避免 SSR/CSR Math.PI 浮点差异触发 hydration mismatch
// ====================================================================

interface V2RadarProps {
  values: number[]; // 6 个 0-100
  labels: string[]; // 6 个标签
  size?: number;
}

function V2Radar({ values, labels, size = 340 }: V2RadarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const sides = 6;

  const dataPoints = mounted
    ? values.map((v, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const r = (v / 100) * radius;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
      })
    : [];
  const dataPath = mounted
    ? dataPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + " Z"
    : "";

  const rings = mounted
    ? [0.25, 0.5, 0.75, 1].map((ratio) => {
        const pts: string[] = [];
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          pts.push(
            `${i === 0 ? "M" : "L"}${cx + radius * ratio * Math.cos(angle)},${cy + radius * ratio * Math.sin(angle)}`
          );
        }
        pts.push("Z");
        return pts.join(" ");
      })
    : [];

  const labelPoints = mounted
    ? labels.map((label, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const x = cx + (radius + 22) * Math.cos(angle);
        const y = cy + (radius + 22) * Math.sin(angle);
        let anchor: "start" | "middle" | "end" = "middle";
        if (Math.abs(Math.cos(angle)) > 0.6) {
          anchor = Math.cos(angle) > 0 ? "start" : "end";
        }
        return { label, x, y, anchor };
      })
    : [];

  const axes = mounted
    ? Array.from({ length: sides }, (_, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        return {
          x2: cx + radius * Math.cos(angle),
          y2: cy + radius * Math.sin(angle),
        };
      })
    : [];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="六维人格雷达图"
    >
      {rings.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(201,169,110,0.18)"
          strokeWidth={1}
        />
      ))}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={a.x2}
          y2={a.y2}
          stroke="rgba(201,169,110,0.18)"
          strokeWidth={1}
        />
      ))}
      <path
        d={dataPath}
        fill="rgba(201,169,110,0.28)"
        stroke="#c9a96e"
        strokeWidth={1.5}
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#c9a96e" />
      ))}
      {labelPoints.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor={p.anchor}
          dominantBaseline="middle"
          fontSize={11}
          fill="rgba(245,237,224,0.85)"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ====================================================================
// CardFrame: Top1 真动画 iframe，Top2/3 嵌同 iframe 但暂停动画（fallback: 点按重播）
// ====================================================================

interface CardFrameProps {
  card: FreeReport["top3"][number];
  rank: 1 | 2 | 3;
  animate: boolean; // true 仅给 rank=1
  loaded: boolean;
  onLoad: () => void;
  isMain: boolean;
}

function CardFrame({
  card,
  rank,
  animate,
  loaded,
  onLoad,
  isMain,
}: CardFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBoxW(el.clientWidth);
    });
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // 计算宽高比 2:3（1080:1620 = 2:3）
  const frameW = isMain ? Math.min(boxW, 540) : Math.min(boxW, 320);
  const frameH = (frameW * 3) / 2;

  // 暂停动画：iframe 内 SVG SMIL 通过 pref 字符串禁用 SMIL 不便。
  // 改为：CSS 强制容器 overflow hidden + 第二张第三张 加 brightness(0.8) 区分主卡
  return (
    <div className="w-full fade-in-up" style={{ animationDelay: `${0.1 + rank * 0.08}s` }}>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <span className="text-sm font-medium text-[var(--text-warm)]">
          {rank === 1 ? "主卡" : rank === 2 ? "次卡" : "第三卡"}
        </span>
        <span className="text-[10px] tracking-[0.38em] text-[var(--accent)]">
          {card.card_phase} · {card.card_phase_en} · {(card.sim * 100).toFixed(1)}%
        </span>
      </div>
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border ${
          isMain
            ? "border-[var(--accent)]"
            : "border-[var(--border-dim)]"
        } bg-black`}
        style={{ aspectRatio: "2 / 3", height: frameH }}
      >
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-[10px] tracking-[0.32em] text-[var(--accent)]/60 animate-pulse">
            渲染中…
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={card.card_html}
          title={`${card.card_id} ${card.card_name}`}
          onLoad={onLoad}
          // 即使是 Top2/3 也加载真实 HTML（统一方案 + 用户可点播放按钮重看），
          // 是否暂停由 prefers-reduced-motion + 用户手动控制。
          className="absolute inset-0 w-full h-full"
          // 阻止 sandbox 报错但允许 SVG SMIL
          sandbox="allow-same-origin"
          loading={rank === 1 ? "eager" : "lazy"}
        />
        {!animate && loaded && (
          <button
            onClick={() => {
              const f = iframeRef.current;
              if (!f) return;
              // 通过 src 重新加载来「重启动画」—— 零依赖实现
              const u = new URL(f.src);
              f.src = `${u.pathname}${u.search}#rerun-${Date.now()}`;
            }}
            className="absolute bottom-3 right-3 z-20 text-[10px] tracking-[0.32em] text-[var(--accent)] bg-black/60 backdrop-blur-sm border border-[var(--accent-dim)] rounded-full px-3 py-1.5"
          >
            ↻ 重启动画
          </button>
        )}
      </div>
      <p className="mt-3 px-1 display-serif text-base text-[var(--text-warm)] leading-snug">
        「{card.card_name}」 · {card.card_key}
      </p>
      <p className="mt-1 px-1 text-xs text-[var(--text-muted)] leading-relaxed">
        {card.card_line}
      </p>
    </div>
  );
}
