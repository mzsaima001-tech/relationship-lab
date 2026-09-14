"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  PERSONALITY_DIMENSION_META,
  PERSONALITY_VALID_SHARES_FOR_FREE_UNLOCK,
  type PersonalityCard as PersonalityCardData,
} from "@/lib/personality/types";
import { RadarChart } from "@/app/components/RadarChart";
import HomeFooter from "@/app/components/HomeFooter";
import { PersonalityCard } from "@/lib/personality/cards/PersonalityCard";
import { AnalyzingScreen } from "@/app/components/AnalyzingScreen";

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

interface TypeCardBrief {
  id: string;
  name: string;
  similarity: number;
  card: PersonalityCardData;
}

interface ResultData {
  testId: string;
  scores: { G: number; X: number; I: number; F: number; S: number; E: number };
  types: { primary: TypeCardBrief; secondary: TypeCardBrief; hidden: TypeCardBrief };
  freeReport: FreeReport;
  paid: boolean;
  shareCredit?: ShareCredit;
}

// V3 30 张月相卡 → 中文名映射（id 即前端 type，不再用 V1 slug）
const PERSONALITY_TYPE_CN: Record<string, string> = {
  // 主型 P01-P15
  P01: "暗礁无声", P02: "星火未燎", P03: "微光不争", P04: "先行探路", P05: "静观一室",
  P06: "解缆离岸", P07: "涉川不止", P08: "心有全图", P09: "守中不倚", P10: "观澜见来",
  P11: "自成一格", P12: "执舵在手", P13: "知止有度", P14: "游刃从容", P15: "万物归沉",
  // 过渡型 T01-T15
  T01: "沉底·初燃", T02: "初燃·照暗", T03: "照暗·知远", T04: "知远·见全", T05: "见全·不回",
  T06: "不回·涉川", T07: "涉川·全图", T08: "全图·守中", T09: "守中·观澜", T10: "观澜·自格",
  T11: "自格·执舵", T12: "执舵·知止", T13: "知止·从容", T14: "从容·归沉", T15: "归沉·沉底",
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
  // 后端还在跑（complete 没写库）→ 友好等待 + 自动 retry，避免给用户"测试未完成"红色错误
  const [pendingComplete, setPendingComplete] = useState(false);

  const loadResult = async () => {
    try {
      const res = await fetch(`/api/personality/tests/${testId}/result`);
      const json = await res.json();
      if (!res.ok) {
        // 400 + 测试未完成 → 不是错误，是还在算
        if (res.status === 400 && json?.error === "测试未完成") {
          setPendingComplete(true);
          return;
        }
        throw new Error(json.error || "加载失败");
      }
      setData(json);
      setPendingComplete(false);
      if (json.paid) {
        // 已付款：直接跳完整报告页
        router.push(`/personality/report/${testId}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, router]);

  // pendingComplete 时每 2 秒重试一次，最多 90 秒（与 complete 路由 maxDuration=60s + 缓冲对齐）
  useEffect(() => {
    if (!pendingComplete) return;
    const startedAt = Date.now();
    const RETRY_TIMEOUT_MS = 90000;
    const tick = async () => {
      if (Date.now() - startedAt > RETRY_TIMEOUT_MS) {
        // 真的超时 → 兜底错误提示，不再无限旋转
        setPendingComplete(false);
        setError("生成时间较长，请刷新或返回重试");
        setLoading(false);
        return;
      }
      await loadResult();
      // loadResult 内部会改 pendingComplete；这里只 schedule 下一轮
      setTimeout(tick, 2000);
    };
    setTimeout(tick, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingComplete]);

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
        <p className="text-[14px] text-[var(--text-muted)]">报告加载中...</p>
      </main>
    );
  }

  // 测试还在后端生成中（complete 路由两个 LLM 润色还在跑）→ 友好等待屏 + 自动 retry，
  // 不要渲染红色"测试未完成"，那只是状态而不是终态错误。
  if (pendingComplete) {
    return (
      <AnalyzingScreen
        title="报告正在生成中，请稍候"
        hint="AI 正在为你润色解读，约需 20–60 秒，请不要关闭页面"
      />
    );
  }

  if (!data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-[14px] text-[var(--danger)]">{error}</p>
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

  const primaryCn = PERSONALITY_TYPE_CN[data.types.primary.id] || data.types.primary.name || data.types.primary.id;
  // 顶部主卡用整数契合度（视觉干净）
  const matchPct = Math.round((data.types.primary.similarity ?? 0) * 100);
  // 对位板块：保留 1 位小数，让「次卡真的比主卡低」一眼可辨
  const primaryPctDec = Math.round((data.types.primary.similarity ?? 0) * 1000) / 10;
  const secondaryPctDec = Math.round((data.types.secondary.similarity ?? 0) * 1000) / 10;
  // 两卡相差（保留 1 位小数）
  const pairDelta = Math.round((primaryPctDec - secondaryPctDec) * 10) / 10;

  return (
    <main className="flex-1 px-5 py-8 sm:px-6 sm:py-10 max-w-2xl mx-auto w-full safe-bottom paper-bg">
      {/* 顶部浅色区：原型卡 + 核心月相（米色信纸底，与下方板块一致） */}
      <div className="paper-section px-4 pt-8 pb-7 sm:px-6 mb-6 fade-in-up">
        <PersonalityCard
          card={data.types.primary.card}
          userScores={data.scores as Record<string, number>}
          matchScore={matchPct}
          size="md"
          label="primary"
          theme="light"
          className="mx-auto mb-6"
        />

        {/* 核心月相名称 + 判词（独立板块、衬线大字号、金线分章） */}
        <div className="text-center px-1">
          <p className="archive-label mb-2" style={{ color: "var(--ink)" }}>你的核心月相</p>
          <h1 className="display-serif text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--ink)" }}>
            {primaryCn}
          </h1>

          {/* 判词：仪式感排版 —— 上金线 + 衬线斜体 + 下金线 */}
          <div className="max-w-md mx-auto my-5">
            <div
              className="mx-auto mb-3 h-px w-16"
              style={{ background: "linear-gradient(90deg, transparent, var(--accent-bright), transparent)" }}
              aria-hidden
            />
            <p
              className="display-serif italic text-lg sm:text-xl md:text-2xl leading-snug tracking-wide"
              style={{
                color: "var(--ink)",
                fontFamily: '"Cormorant Garamond", "Source Han Serif SC", serif',
                fontWeight: 500,
              }}
            >
              「{data.freeReport.primaryTagline}」
            </p>
            <div
              className="mx-auto mt-3 h-px w-16"
              style={{ background: "linear-gradient(90deg, transparent, var(--accent-bright), transparent)" }}
              aria-hidden
            />
          </div>

          <p className="text-[14px] mt-2" style={{ color: "var(--ink-light)" }}>
            月相模型匹配度 <span className="font-mono font-semibold">{matchPct}%</span>
            <span className="ml-1 opacity-70">· 第 {data.types.primary.card.no} 相</span>
          </p>
        </div>
      </div>

      {/* C：主卡 vs 次卡对位指示器（呼应 Crystal Knows 的 DISC map 思路） */}
      {data.types.secondary && (
        <div
          className="paper-section px-3 sm:px-8 py-9 sm:py-11 mb-10 fade-in-up mx-auto"
          style={{ animationDelay: "0.08s", maxWidth: 720 }}
        >
          <p
            className="archive-label text-center mb-7"
            style={{
              color: "var(--ink)",
              fontSize: "clamp(15px, 3.4vw, 18px)",
              letterSpacing: "0.08em",  // 中文小标题收紧一点,避免 0.15em 太散
            }}
          >
            对位 · 你的两面相
          </p>

          {/* 三段式：主卡列 | vs 区分隔 | 次卡列 —— 每张卡独立一列,卡+名字+数字上下对齐 */}
          <div className="flex items-stretch justify-center gap-3 sm:gap-7">
            {/* ===== 主卡 整列 ===== */}
            <div className="flex flex-col items-center flex-shrink-0 min-w-0">
              <PersonalityCard
                card={data.types.primary.card}
                size="vs"
                theme="light"
                matchScore={primaryPctDec}
              />
              <div className="text-center mt-4 px-1">
                <p
                  className="display-serif text-base sm:text-lg font-semibold leading-tight"
                  style={{ color: "var(--ink)" }}
                >
                  {primaryCn}
                </p>
                <p
                  className="text-[14px] mt-1 font-mono tracking-wider"
                  style={{ color: "var(--ink-light)" }}
                >
                  {data.types.primary.card.phase} · {primaryPctDec}%
                </p>
              </div>
            </div>

            {/* ===== 中央 vs 区（垂直分隔） ===== */}
            <div className="flex flex-col items-center justify-center min-w-[56px] sm:min-w-[104px] px-1 sm:px-2">
              <div className="flex items-center w-full max-w-[120px] mb-2">
                <span
                  className="flex-1 h-px"
                  style={{ background: "var(--accent-bright)", opacity: 0.55 }}
                />
                <span
                  className="mx-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider"
                  style={{
                    background: "var(--accent-bright)",
                    color: "#1a1a1a",
                    fontWeight: 600,
                  }}
                >
                  vs
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ background: "var(--accent-bright)", opacity: 0.55 }}
                />
              </div>
              <p
                className="text-[10px] leading-tight text-center font-mono tracking-wider"
                style={{ color: "var(--ink-light)" }}
              >
                相邻月相
              </p>
              <p
                className="font-mono text-base font-semibold mt-1.5 leading-none"
                style={{ color: "var(--ink)" }}
              >
                {pairDelta >= 1 ? `−${pairDelta}%` : `<1%`}
              </p>
              <p
                className="text-[10px] leading-tight text-center mt-1.5 max-w-[96px]"
                style={{ color: "var(--ink-light)" }}
              >
                你这两面相几乎并肩
              </p>
            </div>

            {/* ===== 次卡 整列 ===== */}
            <div className="flex flex-col items-center flex-shrink-0 min-w-0">
              <PersonalityCard
                card={data.types.secondary.card}
                size="vs"
                theme="light"
                matchScore={secondaryPctDec}
              />
              <div className="text-center mt-4 px-1">
                <p
                  className="display-serif text-base sm:text-lg font-semibold leading-tight"
                  style={{ color: "var(--ink)" }}
                >
                  {PERSONALITY_TYPE_CN[data.types.secondary.id] ||
                    data.types.secondary.name ||
                    data.types.secondary.id}
                </p>
                <p
                  className="text-[14px] mt-1 font-mono tracking-wider"
                  style={{ color: "var(--ink-light)" }}
                >
                  {data.types.secondary.card.phase} · {secondaryPctDec}%
                </p>
              </div>
            </div>
          </div>

          {/* 文案注释:解释「为什么分数这么接近」 */}
          <p
            className="text-[14px] text-center mt-6 leading-relaxed px-4"
            style={{ color: "var(--ink-light)" }}
          >
            两面相邻,意味着你身上同时住着这两种特质——不是非此即彼
          </p>
        </div>
      )}

      {/* 人格 DNA 雷达图（深色面板：雷达图本身就是深底配色设计） */}
      <div className="panel-dark p-6 mb-10 fade-in-up" style={{ animationDelay: "0.15s" }}>
        <p className="archive-label mb-4" style={{ color: "var(--accent-bright)" }}>你的性格 DNA</p>
        <div className="flex justify-center mb-5">
          <RadarChart scores={data.scores as Record<string, number>} size={280} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {(Object.entries(data.scores) as [keyof typeof PERSONALITY_DIMENSION_META, number][]).map(([key, score]) => {
              const meta = PERSONALITY_DIMENSION_META[key];
              return (
                <div key={key}>
                  <p className="text-[14px]" style={{ color: "#b8ac96" }}>{meta.cn}</p>
                  <p className="font-mono font-semibold text-base" style={{ color: "var(--accent-bright)" }}>{Math.round(score)}</p>
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
                  <p className="font-mono font-semibold text-[16px]" style={{ color: "var(--accent-bright)" }}>{Math.round(dim.score)} / 100</p>
                </div>
                <p className="text-[18px] leading-relaxed" style={{ color: "var(--ink-light)" }}>{dim.summary}</p>
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
        <p className="text-[18px] leading-relaxed" style={{ color: "var(--ink-light)" }}>
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
                className="flex-shrink-0 text-[18px] sm:text-[19px] leading-none"
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
                className="flex-1 min-w-0 text-[16px] sm:text-[17px] leading-tight font-medium"
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
        <p className="text-[14px] mt-2.5 text-center" style={{ color: "#2a2a2a" }}>
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
              <p className="text-[18px] mb-5 leading-relaxed" style={{ color: "var(--ink-light)" }}>
                生成你的专属海报（含二维码）。朋友扫码后翻开的，是 TA 们自己的人格。
                {!paid && (
                  <>
                    <br />
                    <span className="text-[14px]">
                      TA 答完最后一题，才算 1 位有效分享。
                    </span>
                  </>
                )}
              </p>

              {/* 免费解锁进度（仅未解锁时显示） */}
              {!paid && (
                <>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>有效分享进度</p>
                    <p className="text-[16px] font-mono font-semibold" style={{ color: "var(--accent-bright)" }}>
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
                  <p className="text-[14px] text-center mt-2.5 leading-relaxed" style={{ color: "var(--ink-light)" }}>
                    每 1 位朋友完成测评，进度 +1 · 海报已备好，点一下就能发
                  </p>
                </>
              )}
              {shareError && (
                <p className="text-[14px] mt-2 text-center" style={{ color: "var(--danger)" }}>
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
            className="text-[14px] hover:opacity-70 transition-opacity"
            style={{ color: "var(--ink-light)" }}
          >
            {paying ? "跳转中..." : "不想等？直接 ¥9.9 解锁 →"}
          </button>
        </div>
      )}

      {error && <p className="text-[14px] mt-4 text-center" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center justify-center gap-4 mt-8 text-[14px]" style={{ color: "var(--ink-light)" }}>
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