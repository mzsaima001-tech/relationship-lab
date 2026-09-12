"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  PERSONALITY_DIMENSION_META,
  PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK,
} from "@/lib/personality/types";
import { RadarChart } from "@/app/components/RadarChart";
import HomeFooter from "@/app/components/HomeFooter";
import { PersonalityCard } from "@/lib/personality/cards/PersonalityCard";

interface FreeReport {
  primaryTagline: string;
  scores: { social: number; rationality: number; planning: number; risk: number; dominance: number; sensitivity: number };
  topDimensions: Array<{ key: keyof typeof PERSONALITY_DIMENSION_META; score: number; summary: string }>;
  coreStrength: { title: string; description: string };
}

interface ShareCredit {
  shares: number;
  unlockedViaShare: boolean;
  shareCode?: string;
}

interface ResultData {
  testId: string;
  scores: FreeReport["scores"];
  types: { primary: { type: string; matchScore: number }; secondary: { type: string; matchScore: number }; hidden: { type: string; matchScore: number } };
  freeReport: FreeReport;
  paid: boolean;
  shareCredit?: ShareCredit;
}

const PERSONALITY_TYPE_CN: Record<string, string> = {
  strategist: "战略家",
  explorer: "探索者",
  leader: "掌控者",
  observer: "观察者",
  creator: "创造者",
  coordinator: "协调者",
  guardian: "守护者",
  doer: "行动派",
  // 7 月相新主型
  dark_reef: "暗礁",
  spark: "引子",
  departure: "启程者",
  scout: "探路者",
  drifter: "漫游者",
  glimmer: "微光",
  whole: "全貌者",
  // 14 过渡型（与卡片同源命名，避免漏 fallback 成 slug）
  dark_reef__spark: "暗礁·引子",
  spark__departure: "引子·启程",
  departure__scout: "启程·探路",
  scout__drifter: "探路·漫游",
  drifter__glimmer: "漫游·微光",
  glimmer__strategist: "微光·战略家",
  strategist__observer: "战略家·观察者",
  observer__guardian: "观察者·守护者",
  guardian__coordinator: "守护者·协调者",
  coordinator__creator: "协调者·创造者",
  creator__explorer: "创造者·探索者",
  explorer__doer: "探索者·行动派",
  doer__leader: "行动派·掌控者",
  leader__whole: "掌控者·全貌",
};

const LOCKED_SECTIONS = [
  "第二人格",
  "隐藏人格",
  "别人眼中的你",
  "真正的你",
  "你的性格矛盾",
  "你的核心优势（完整）",
  "你的性格盲区",
  "你的情绪触发点",
  "压力状态下的你",
  "你的人际关系模式",
  "你的亲密关系模式",
  "你的事业人格",
  "你的领导风格",
  "你的金钱与风险模式",
  "你的成长建议",
  "你的完整人格总结",
];

export default function PersonalityResult() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();
  const testId = params.testId;

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareError, setShareError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/personality/tests/${testId}/result`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setData(json);
        if (json.paid) {
          // 已付款：直接跳完整报告页
          router.push(`/personality/report/${testId}`);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId, router]);

  const handleUnlock = async () => {
    if (paying) return;
    setPaying(true);
    try {
      // 直接跳支付页，支付页内创建订单 + 显示收款码 + 确认解锁
      router.push(`/pay/personality/${testId}`);
    } catch (e: any) {
      setError(e.message);
      setPaying(false);
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setShareError("");
    try {
      // localStorage 兜底 visitorId（人格测试无登录态）
      const visitorId =
        localStorage.getItem("personalityVisitorId") ||
        (() => {
          const v = `pv_${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem("personalityVisitorId", v);
          return v;
        })();
      const res = await fetch(`/api/personality/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, visitorId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "分享创建失败");
      setShareCode(json.code);
      // 跳海报页（让用户保存图片/链接发朋友，进度 +1 需等朋友完成测评）
      window.location.href = `/share/personality/${json.code}`;
    } catch (e: any) {
      setShareError(e.message || "分享失败");
    } finally {
      setSharing(false);
    }
  };

  /** 进度到 100% 后由前端主动确认解锁（与默契测试 create-friend 已集齐 即免费解锁 一致） */
  const handleFreeUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    setError("");
    try {
      const res = await fetch(`/api/personality/free-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解锁失败");
      // 重新拉取报告页（is_paid=true → 自动跳完整版）
      router.push(`/personality/report/${testId}`);
    } catch (e: any) {
      setError(e.message || "解锁失败");
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-5 sm:px-6">
        <p className="text-sm text-[var(--text-muted)]">报告加载中...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-sm text-[var(--danger)]">{error}</p>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-ghost"
          >
            ← 返回上一页
          </button>
          <Link href="/personality" className="btn-ghost">
            返回测试首页
          </Link>
        </div>
      </main>
    );
  }

  const primaryCn = PERSONALITY_TYPE_CN[data.types.primary.type] || data.types.primary.type;
  const matchPct = data.types.primary.matchScore;

  return (
    <main className="flex-1 px-5 py-8 sm:px-6 sm:py-10 max-w-2xl mx-auto w-full safe-bottom paper-bg">
      <PersonalityCard
        type={data.types.primary.type as Parameters<typeof PersonalityCard>[0]["type"]}
        userScores={data.scores as Record<string, number>}
        matchScore={matchPct}
        size="md"
        label="primary"
        className="mx-auto mb-8"
      />

      {/* 顶部：核心人格（保留原型名+tagline 文字） */}
      <div className="text-center mb-10 sm:mb-12 fade-in-up">
        <p className="archive-label mb-3" style={{ color: "var(--accent-bright)" }}>你的核心人格</p>
        <p className="text-xs mb-2" style={{ color: "var(--ink-light)" }}>人格模型匹配度 {matchPct}%</p>
        <h1 className="display-serif text-3xl sm:text-4xl md:text-5xl font-bold mb-3" style={{ color: "var(--accent-bright)", textShadow: "0 0 12px rgba(240, 200, 99, 0.25)" }}>
          {primaryCn}
        </h1>
        <p className="display-serif text-base md:text-lg leading-relaxed max-w-md mx-auto" style={{ color: "var(--ink)" }}>
          「{data.freeReport.primaryTagline}」
        </p>
      </div>

      {/* 人格 DNA 雷达图 */}
      <div className="paper-section p-6 mb-10 fade-in-up" style={{ animationDelay: "0.15s" }}>
        <p className="archive-label mb-4" style={{ color: "var(--accent-bright)" }}>你的性格 DNA</p>
        <div className="flex justify-center mb-5">
          <RadarChart scores={data.scores} size={280} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {Object.entries(data.scores).map(([key, score]) => {
              const meta = PERSONALITY_DIMENSION_META[key as keyof typeof PERSONALITY_DIMENSION_META];
              return (
                <div key={key}>
                  <p className="text-xs" style={{ color: "var(--ink-light)" }}>{meta.cn}</p>
                  <p className="font-mono font-semibold text-base" style={{ color: "var(--accent-bright)" }}>{score}</p>
                </div>
              );
            })}
        </div>
      </div>

      {/* 两个突出特征 */}
      <div className="mb-10 fade-in-up" style={{ animationDelay: "0.25s" }}>
        <p className="archive-label mb-4" style={{ color: "var(--accent-bright)" }}>两项核心特质</p>
        <div className="space-y-4">
          {data.freeReport.topDimensions.map((dim) => {
            const meta = PERSONALITY_DIMENSION_META[dim.key];
            return (
              <div key={dim.key} className="paper-section p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="display-serif text-base font-semibold" style={{ color: "var(--ink)" }}>{meta.cn}</p>
                  <p className="font-mono font-semibold text-sm" style={{ color: "var(--accent-bright)" }}>{dim.score} / 100</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-light)" }}>{dim.summary}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 核心优势 */}
      <div className="paper-section p-6 mb-12 fade-in-up" style={{ animationDelay: "0.35s" }}>
        <p className="archive-label mb-3" style={{ color: "var(--accent-bright)" }}>一项核心优势</p>
        <h3 className="display-serif text-lg font-bold mb-3" style={{ color: "var(--ink)" }}>
          {data.freeReport.coreStrength.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-light)" }}>
          {data.freeReport.coreStrength.description}
        </p>
      </div>

      {/* 付费墙 —— 米黄信纸底 + 纯黑/深灰字（黑字清晰可读） */}
      <div className="paper-sheet p-6 fade-in-up" style={{ animationDelay: "0.45s" }}>
        {/* 主大标题（纯黑） */}
        <h3
          className="display-serif text-xl sm:text-2xl text-center font-bold leading-tight mb-2"
          style={{ color: "#0a0a0a" }}
        >
          你才看到自己的 36%
        </h3>
        <p
          className="display-serif text-base sm:text-lg text-center font-semibold leading-snug mb-6"
          style={{ color: "#1a1a1a" }}
        >
          —— 还有一整个宇宙没展开
        </p>

        <p className="text-base sm:text-lg font-bold mb-5 text-center" style={{ color: "#0a0a0a" }}>
          16 个完整模块，让你看清完整的自己。
        </p>

        {/* 锁住模块列表 —— 手机 2 列 / 桌面 2 列，字号放大 + 金色锁图标 + 编号 */}
        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2.5 mb-7 text-left">
          {LOCKED_SECTIONS.map((s, i) => (
            <div
              key={s}
              className="flex items-center gap-2 sm:gap-2.5 py-2.5 sm:py-3 px-2 sm:px-2.5 rounded-md border"
              style={{
                borderColor: "rgba(26,26,26,0.18)",
                background: "rgba(255,255,255,0.45)",
              }}
            >
              <span
                className="flex-shrink-0 text-[15px] sm:text-base leading-none"
                style={{ color: "#d4a850" }}
                aria-hidden
              >
                🔒
              </span>
              <span
                className="flex-shrink-0 font-mono text-[10px] sm:text-[11px] leading-none tracking-wider"
                style={{ color: "#8a6a2a" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="flex-1 min-w-0 text-[14px] sm:text-[15px] leading-tight font-medium"
                style={{ color: "#1a1a1a" }}
              >
                {s.replace(/^🔒\s*/, "")}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-5">
          <span className="display-serif text-3xl font-bold" style={{ color: "#0a0a0a" }}>¥9.9</span>
          <span className="text-xs line-through opacity-60" style={{ color: "#2a2a2a" }}>¥29.9</span>
          <span
            className="text-[10px] px-1.5 py-0.5 border rounded font-mono"
            style={{ color: "#1a1a1a", borderColor: "#1a1a1a" }}
          >
            限时
          </span>
        </div>

        <button
          onClick={handleUnlock}
          disabled={paying}
          className="w-full text-base font-bold"
          style={{
            background: "#1a1a1a",
            color: "#fcf6e2",
            padding: "16px 24px",
            borderRadius: 8,
            border: "none",
            minHeight: 56,
          }}
        >
          {paying ? "解锁中..." : "¥9.9 解锁看完整报告"}
        </button>
        <p className="text-[11px] mt-2.5 text-center" style={{ color: "#2a2a2a" }}>
          支付完成后立即解锁，无需重新测试。
        </p>
      </div>

      {/* 分享人格卡（与默契测试板块一致：分享 N 人免费解锁 + 进度条） */}
      {(() => {
        const SHARES_NEEDED = PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK;
        const sharesDone = Math.min(data.shareCredit?.shares ?? 0, SHARES_NEEDED);
        const ready = sharesDone >= SHARES_NEEDED;
        const paid = data.paid;
        return (
          <div
            className={`rounded-lg p-6 mt-6 fade-in-up paper-section`}
            style={{ animationDelay: "0.55s" }}
          >
            <div className="text-center">
              <p className="archive-label mb-3" style={{ color: "var(--accent-bright)" }}>Share · 分享给朋友</p>
              <h3 className="display-serif text-lg font-bold mb-3" style={{ color: "var(--ink)" }}>
                {paid ? "把你的画像分享给朋友" : `分享 ${SHARES_NEEDED} 人，免费解锁`}
              </h3>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: "var(--ink-light)" }}>
                生成你的专属海报（含二维码）。朋友扫码后翻开的，是 TA 们自己的人格。
                {!paid && (
                  <>
                    <br />
                    <span className="text-xs">
                      TA 答完最后一题，才算 1 位有效分享。
                    </span>
                  </>
                )}
              </p>

              {/* 免费解锁进度（仅未解锁时显示） */}
              {!paid && (
                <>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs" style={{ color: "var(--ink-light)" }}>有效分享进度</p>
                    <p className="text-sm font-mono font-semibold" style={{ color: "var(--accent-bright)" }}>
                      {sharesDone}/{SHARES_NEEDED}
                    </p>
                  </div>
                  <div className="flex gap-1.5 mb-5">
                    {Array.from({ length: SHARES_NEEDED }, (_, i) => (
                      <span
                        key={i}
                        className={`flex-1 h-1.5 rounded-full ${
                          i < sharesDone
                            ? ""
                            : ""
                        }`}
                        style={{
                          background: i < sharesDone ? "var(--accent-bright)" : "#d6c8a8",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {paid ? (
                <button
                  onClick={() => router.push(`/share/personality/${data.shareCredit?.shareCode || ""}`)}
                  className="btn-primary w-full"
                >
                  生成我的分享海报 →
                </button>
              ) : ready ? (
                <button
                  onClick={handleFreeUnlock}
                  disabled={unlocking}
                  className="btn-primary w-full"
                >
                  {unlocking ? "解锁中..." : "已集齐，立即免费解锁 →"}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="btn-primary w-full"
                  >
                    {sharing
                      ? "正在生成..."
                      : `分享我的海报（还差 ${SHARES_NEEDED - sharesDone} 人）→`}
                  </button>
                  <p className="text-[11px] text-center mt-2.5 leading-relaxed" style={{ color: "var(--ink-light)" }}>
                    每 1 位朋友完成测评，进度 +1 · 海报已备好，点一下就能发
                  </p>
                </>
              )}
              {shareError && (
                <p className="text-[11px] mt-2 text-center" style={{ color: "var(--danger)" }}>
                  {shareError}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* 也可付费解锁（兜底通道，与默契测试的双轨制一致） */}
      {!data.paid && (
        <div className="text-center mt-5">
          <button
            onClick={handleUnlock}
            disabled={paying}
            className="text-xs hover:opacity-70 transition-opacity"
            style={{ color: "var(--ink-light)" }}
          >
            {paying ? "跳转中..." : "不想等？直接 ¥9.9 解锁 →"}
          </button>
        </div>
      )}

      {error && <p className="text-xs mt-4 text-center" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center justify-center gap-4 mt-8 text-xs" style={{ color: "var(--ink-light)" }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="hover:opacity-70 transition-opacity"
        >
          ← 返回上一页
        </button>
        <span style={{ opacity: 0.4 }}>·</span>
        <Link href="/personality" className="hover:opacity-70 transition-opacity">
          重新测试
        </Link>
      </div>

      <HomeFooter />
    </main>
  );
}