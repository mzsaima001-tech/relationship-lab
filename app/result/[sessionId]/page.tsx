"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { CompassDial, OrnamentDivider, StarMap, LetterFrame, TarotCard } from "@/app/components/decor";
import { AnalyzingScreen } from "@/app/components/AnalyzingScreen";
import { SafeLink } from "@/app/components/SafeLink";
import HomeFooter from "@/app/components/HomeFooter";
import { tarotFor, tarotImage } from "@/lib/reports/tarot";
import { SINGLE_REPORT_PRICE, VALID_SHARES_FOR_FREE_UNLOCK } from "@/lib/assessment/types";
import { PAYMENT_CONFIG } from "@/lib/site";
import { getOrCreateVisitorId } from "@/lib/visitor";

// ---------- 类型（与 lib/reports/narrative.ts 输出对齐） ----------

interface FactReading {
  headline: string;
  meaning: string;
  risk?: string;
  strength?: string;
}

interface DimensionReading {
  key: string;
  label: string;
  score: number;
  confidence: number;
  bandLabel: string;
  summary: string;
  daily: string;
  watchOut?: string;
  evidenceQuotes: string[];
}

interface SignalReading {
  id: string;
  label: string;
  meaning: string;
  recent: string;
  confidence: number;
}

interface Narrative {
  oneLiner: string;
  opening: string;
  archetype: {
    name: string;
    essence: string;
    portrait: string;
    gift: string;
    blindSpot: string;
    recentTendency: string;
    tags: string[];
  };
  coreNeeds: FactReading[];
  strengths: FactReading[];
  lockedPattern?: { name: string };
  dimensions: DimensionReading[];
  signalPortrait: SignalReading[];
  innerTensions: FactReading[];
  stressPatterns: FactReading[];
  misunderstood: string[];
  lifeStageNote: string;
  suggestions: string[];
  scripts: string[];
  closing: string;
  qualityNote?: string;
}

interface ResultData {
  sessionId: string;
  nickname: string;
  scores: Record<string, number>;
  signals: Record<string, { value: boolean | number; confidence: number }>;
  responseQuality?: { rqi: number; level: string };
  archetype: string;
  tags: string[];
  narrative?: Narrative;
  freePercent?: number;
  lockedCounts?: { coreNeeds: number; strengths: number; signals: number };
  credits?: {
    balance: number;
    shares: number;
    report_unlocked: boolean;
  };
  /** 当前 session 是否已在某个 pair 里（A = 发起方，B = 被分享人） */
  pairId?: string | null;
  pairRole?: "a" | "b" | null;
  /** 该 pair 的契合画像是否已支付 ¥19.9 解锁（用于结果页按钮文案分支） */
  pairPaid?: boolean;
}

// ---------- 小组件 ----------

function Section({
  title,
  children,
  delay = 0,
  paper = true,
  archiveLabel = false,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
  paper?: boolean;
  archiveLabel?: boolean;
}) {
  return (
    <section className="mb-9 sm:mb-12 fade-in-up" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-baseline gap-3 mb-5 sm:mb-6">
        {archiveLabel ? (
          <h3 className="archive-label">{title}</h3>
        ) : (
          <h3 className="display-serif font-bold text-[20px] sm:text-[22px] md:text-[24px] text-[var(--accent-bright)] tracking-tight">
            {title}
          </h3>
        )}
        <span className="flex-1 h-px bg-[var(--border-dim)] translate-y-[-3px]" />
      </div>
      {paper ? <LetterFrame className="p-4 pt-7 sm:p-6 sm:pt-8">{children}</LetterFrame> : children}
    </section>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((p, i) => (
        <p key={i} className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed mb-3 last:mb-0">
          {p}
        </p>
      ))}
    </>
  );
}

function FactBlock({ fact }: { fact: FactReading }) {
  return (
    <div className="border-l-2 border-[var(--accent)] pl-4 mb-4 sm:mb-5 last:mb-0">
      <p className="text-[18px] sm:text-[19px] font-medium text-[var(--text-warm)] mb-1.5">{fact.headline}</p>
      <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed opacity-90">{fact.meaning}</p>
      {fact.strength && (
        <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] leading-relaxed mt-1.5">＋ {fact.strength}</p>
      )}
      {fact.risk && (
        <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] leading-relaxed mt-1.5">△ {fact.risk}</p>
      )}
    </div>
  );
}

// ---------- 主页面 ----------

export default function ResultPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteQr, setInviteQr] = useState("");
  const [pairId, setPairId] = useState("");
  const [pairRole, setPairRole] = useState<"a" | "b" | null>(null);
  const [pairPaid, setPairPaid] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // 自动重试包装
  const fetchWithRetry = async (url: string, init?: RequestInit, maxAttempts = 3): Promise<Response> => {
    let lastErr: Error | null = null;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(url, init);
        if (res.ok) return res;
        if (res.status >= 400 && res.status < 500) return res; // 4xx 不重试
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (e: any) {
        lastErr = e;
      }
      if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 1500));
    }
    throw lastErr || new Error("网络请求失败");
  };

  const refetchResult = () => {
    setLoading(true);
    setError("");
    setRetryCount(c => c + 1);
  };

  // 报告未就绪时的原地轮询计数（防止"没答完就直接访问结果页"时无限等：40 次 ≈ 2 分钟后才回答题页）
  const waitPollsRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    async function fetchResult() {
      try {
        // 兜底登记：直达结果页也让「我的结果」按钮能找回这份记录
        try {
          localStorage.setItem("sessionId", sessionId);
        } catch {
          /* 写不动忽略 */
        }
        const res = await fetchWithRetry(`/api/assessments/${sessionId}/complete?visitorId=${encodeURIComponent(getOrCreateVisitorId())}`);
        const json = await res.json();
        if (!res.ok) {
          if (json.status === "started") {
            // 报告仍在生成：停在分析等待页继续轮询，绝不弹回答题页（避免来回弹跳死循环）
            if (mounted) {
              waitPollsRef.current += 1;
              if (waitPollsRef.current >= 40) {
                router.push(`/test/${sessionId}`);
              } else {
                setTimeout(() => {
                  if (mounted) setRetryCount((c) => c + 1);
                }, 3000);
              }
            }
            return; // 保持 loading 状态，继续显示分析等待页
          }
          throw new Error(json.error || `加载失败 (HTTP ${res.status})`);
        }
        if (mounted) {
          waitPollsRef.current = 0;
          // 反查 pair（让被分享人 B 也能在结果页直接看到契合画像入口）
          if (json.pairId) {
            setPairId(json.pairId);
            setPairRole(json.pairRole ?? null);
            setPairPaid(Boolean(json.pairPaid));
          }
          setData(json);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "加载失败，请重试");
          setLoading(false);
        }
      }
    }
    fetchResult();
    return () => { mounted = false; };
  }, [sessionId, router, retryCount]);

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const url = `${window.location.origin}${json.url}`;
      setInviteUrl(url);
      setPairId(json.pairId);
      // 当前 session 在 pair 里是发起方（A）
      setPairRole("a");
      // 同步生成双人邀请二维码，TA 扫码直达
      const qr = await QRCode.toDataURL(url, {
        width: 400,
        margin: 1,
        color: { dark: "#2a2418", light: "#f5ede0" },
      });
      setInviteQr(qr);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 跳转海报页（有效分享 = 好友通过海报完成测评后才计 1 人，由后端归因，此处不再记分）
  // 用 SafeLink 软跳转：避免微信内整页硬跳重新触发拦截提示

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const res = await fetch(`/api/credits/${sessionId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getOrCreateVisitorId() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解锁失败");
      setData(prev => prev ? {
        ...prev,
        credits: {
          balance: json.account.balance,
          shares: json.account.shares,
          report_unlocked: true,
        },
      } : prev);
    } catch (err: any) {
      setError(err.message || "解锁失败");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <AnalyzingScreen title="请稍候，正在生成你的关系档案" />;
  }

  if (error && !data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-[18px] sm:text-[19px] text-[var(--danger)] text-center">{error}</p>
        <button onClick={refetchResult} className="btn-primary">🔄 重试</button>
        <Link href="/start" className="text-[16px] sm:text-[17px] text-[var(--text-muted)]">← 回到首页</Link>
      </main>
    );
  }

  if (!data) return null;

  const n = data.narrative;
  const tarot = tarotFor(data.archetype);
  const reportUnlocked = Boolean(data.credits?.report_unlocked);

  return (
    <main className="night-sky flex-1 px-5 py-8 sm:px-6 sm:py-12 max-w-2xl mx-auto w-full safe-bottom">
      <StarMap opacity={0.14} seed={1} />
      <div className="relative">
      {/* ===== Header（免费）：罗盘 + 塔罗牌主视觉 ===== */}
      <div className="text-center mb-8 sm:mb-10 fade-in-up">
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className="file-number">No. {sessionId.slice(0, 6).toUpperCase()}</span>
        </div>
        {/* 塔罗牌 + 背后缓缓转动的罗盘 */}
        <div className="relative flex items-center justify-center mb-4 sm:mb-5">
          <div className="absolute pointer-events-none">
            <CompassDial size={220} opacity={0.18} />
          </div>
          <TarotCard
            image={tarotImage(tarot.slug)}
            cardTitle={tarot.cardTitle}
            cardTitleEn={tarot.cardTitleEn}
            width={140}
            elevated
          />
        </div>
        <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] italic display-serif">
          「{tarot.motto}」
        </p>
        <h1 className="display-serif text-2xl sm:text-3xl text-[var(--text-warm)] mt-5 sm:mt-6">{data.nickname}</h1>
        <p className="display-serif text-lg sm:text-xl text-[var(--accent)] mt-2">「{data.archetype}」</p>
        {n?.archetype.essence && (
          <p className="text-[18px] text-[var(--text-muted)] mt-3 leading-relaxed">{n.archetype.essence}</p>
        )}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-[16px] text-[var(--text-muted)] border border-[var(--border-dim)] rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <OrnamentDivider className="mt-7" />
      </div>

      {/* ===== 一句话画像 + 开篇（免费） ===== */}
      {n && (
        <LetterFrame className="p-4 pt-7 mb-8 sm:p-6 sm:pt-8 sm:mb-10 fade-in-up" >
          <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
            <p className="display-serif text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed mb-4">
              {n.oneLiner}
            </p>
            <OrnamentDivider className="mb-4" />
            <Paragraphs text={n.opening} />
            {n.archetype.recentTendency && (
              <p className="display-serif text-[18px] text-[var(--text-warm)] leading-relaxed mt-3 italic">
                {n.archetype.recentTendency}
              </p>
            )}
          </div>
        </LetterFrame>
      )}

      {/* ===== 六维图（免费） ===== */}
      <Section title="Six Dimensions" delay={0.15} archiveLabel>
        <div className="space-y-4 sm:space-y-5">
          {(n?.dimensions ?? Object.entries(data.scores).map(([key, score]) => ({
            key, label: key, score, confidence: 0, bandLabel: "", summary: "", daily: "", evidenceQuotes: [] as string[],
          }))).map((dim) => (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-[18px] text-[var(--text-warm)] truncate">{dim.label}</span>
                <span className="text-[18px] text-[var(--accent)] font-mono whitespace-nowrap">
                  {dim.score}
                  {dim.bandLabel && (
                    <span className="text-[16px] text-[var(--text-muted)] ml-1.5">{dim.bandLabel}</span>
                  )}
                </span>
              </div>
              <div className="dim-bar-track">
                <div className="dim-bar-fill h-full" style={{ width: `${dim.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== 核心需求 1 条（免费） ===== */}
      {n && n.coreNeeds.length > 0 && (
        <Section title="你的核心需求" delay={0.2}>
          <FactBlock fact={n.coreNeeds[0]} />
          {!reportUnlocked && (data.lockedCounts?.coreNeeds ?? 0) > 0 && (
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mt-3 leading-relaxed">
              还有 {data.lockedCounts!.coreNeeds} 条核心需求解读，解锁后可见。
            </p>
          )}
        </Section>
      )}

      {/* ===== 优势 1 条（免费） ===== */}
      {n && n.strengths.length > 0 && (
        <Section title="你的优势" delay={0.22}>
          <FactBlock fact={n.strengths[0]} />
        </Section>
      )}

      {/* ===== 锁定的隐藏模式（免费只给标题） ===== */}
      {n?.lockedPattern && !reportUnlocked && (
        <LetterFrame className="p-4 pt-7 mb-8 sm:p-6 sm:pt-8 sm:mb-10 fade-in-up" >
          <div className="fade-in-up" style={{ animationDelay: "0.25s" }}>
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="display-serif font-bold text-[20px] sm:text-[22px] text-[var(--text-warm)] tracking-tight">隐藏模式</h3>
              <span className="flex-1 h-px bg-[var(--border-dim)] translate-y-[-3px]" />
              <span className="text-[16px] text-[var(--text-muted)]">🔒</span>
            </div>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">
              你的回答里还有一个比较明显的模式：
              <span className="text-[var(--accent)] font-medium">「{n.lockedPattern.name}」</span>
            </p>
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mt-2.5 leading-relaxed">
              它从哪里来、如何影响你——解锁完整报告后揭晓。
            </p>
          </div>
        </LetterFrame>
      )}

      {/* ===== 付费墙 / 完整报告 —— 文案不动，颜色全部加深 ===== */}
      {!reportUnlocked ? (
        <LetterFrame className="p-4 pt-7 mb-8 sm:p-6 sm:pt-8 sm:mb-10 fade-in-up" >
          <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
            {/* 主大标题 —— 纯黑/深灰（去棕色） */}
            <h3
              className="display-serif text-xl sm:text-2xl text-center font-bold leading-tight mb-2"
              style={{ color: "#0a0a0a" }}
            >
              你才看到自己的 {data.freePercent ?? 8}%
            </h3>
            <p
              className="display-serif text-lg sm:text-xl text-center font-semibold leading-snug mb-5"
              style={{ color: "#1a1a1a" }}
            >
              —— 还有一整个宇宙没展开
            </p>

            <OrnamentDivider className="mb-5" />

            {/* 解锁后能得到什么 —— ✦ 用深灰（非金棕色） */}
            <p className="display-serif text-[18px] font-semibold mb-3" style={{ color: "#0a0a0a" }}>解锁后，你将立刻得到：</p>
            <ul className="space-y-2.5 mb-6">
              {[
                ["读懂 TA 的钥匙", "TA 不愿说出口的需求和期待，一次讲透"],
                ["原型深度解读", "你为什么成为这样的你——天赋与盲区都讲透"],
                ["六维逐一细读", "每个维度的日常表现、真实案例式还原与提醒"],
                ["隐藏信号画像", "你自己都没意识到的那些小动作，意味着什么"],
                ["内心矛盾 × 压力模式", "最近为什么莫名疲惫、反复内耗的根源"],
                ["具体建议 + 沟通话术", "拿来就能用的 3 条建议和可以照着说的话"],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-0.5 flex-shrink-0 text-base" style={{ color: "#1a1a1a" }}>✦</span>
                  <p className="text-[18px] sm:text-[19px] leading-relaxed" style={{ color: "#0a0a0a" }}>
                    <span className="font-medium">{t}</span>
                    <span style={{ color: "#2a2a2a" }}> —— {d}</span>
                  </p>
                </li>
              ))}
            </ul>

            {/* 主按钮（深棕底 + 米色字） */}
            <SafeLink
              href={`/pay/${sessionId}`}
              className="w-full text-base font-bold block text-center"
              style={{
                background: "#1a1a1a",
                color: "#fcf6e2",
                padding: "16px 24px",
                borderRadius: 8,
                border: "none",
                minHeight: 56,
              }}
            >
              ¥{SINGLE_REPORT_PRICE.toFixed(1)} 立即解锁完整报告
            </SafeLink>
            <p className="text-[16px] sm:text-[17px] text-center mt-3 leading-relaxed" style={{ color: "#2a2a2a" }}>
              支持{PAYMENT_CONFIG.channels} · 也可以分享 {VALID_SHARES_FOR_FREE_UNLOCK} 位朋友，免费解锁 ↓
            </p>
          </div>
        </LetterFrame>
      ) : (
        n && (
          <>
            {/* ===== 原型深度解读 ===== */}
            <Section title={`原型解读 · ${n.archetype.name}`} delay={0.1}>
              <div className="card p-4 sm:p-6">
                <Paragraphs text={n.archetype.portrait} />
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-5">
                  <div className="border border-[var(--border-dim)] rounded-lg p-3.5 sm:p-4">
                    <p className="display-serif font-semibold text-[17px] sm:text-[18px] text-[var(--text-warm)] mb-2 tracking-tight">天赋</p>
                    <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{n.archetype.gift}</p>
                  </div>
                  <div className="border border-[var(--border-dim)] rounded-lg p-3.5 sm:p-4">
                    <p className="display-serif font-semibold text-[17px] sm:text-[18px] text-[var(--text-warm)] mb-2 tracking-tight">盲区</p>
                    <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{n.archetype.blindSpot}</p>
                  </div>
                </div>
              </div>
            </Section>

            {/* ===== 核心需求（全部） ===== */}
            {n.coreNeeds.length > 0 && (
              <Section title="你的核心需求" delay={0.12}>
                {n.coreNeeds.map((f, i) => <FactBlock key={i} fact={f} />)}
              </Section>
            )}

            {/* ===== 内心矛盾 ===== */}
            {n.innerTensions.length > 0 && (
              <Section title="你的内心矛盾" delay={0.14}>
                {n.innerTensions.map((f, i) => <FactBlock key={i} fact={f} />)}
              </Section>
            )}

            {/* ===== 六维逐一解读 ===== */}
            <Section title="六个维度，逐一细看" delay={0.16}>
              <div className="space-y-4 sm:space-y-6">
                {n.dimensions.map((dim) => (
                  <div key={dim.key} className="card p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <p className="text-[18px] sm:text-[19px] font-medium text-[var(--text-warm)] truncate">{dim.label}</p>
                      <span className="text-[16px] sm:text-[17px] text-[var(--text-muted)] whitespace-nowrap">
                        {dim.score} 分 · {dim.bandLabel}
                      </span>
                    </div>
                    <div className="dim-bar-track mb-3 sm:mb-4">
                      <div className="dim-bar-fill h-full" style={{ width: `${dim.score}%` }} />
                    </div>
                    <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed mb-2">{dim.summary}</p>
                    <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed opacity-80">{dim.daily}</p>
                    {dim.evidenceQuotes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-dim)]">
                        <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-2 leading-relaxed">你的回答印证了这一点：</p>
                        {dim.evidenceQuotes.map((q, i) => (
                          <p key={i} className="text-[16px] sm:text-[17px] text-[var(--text-muted)] leading-relaxed italic">
                            「{q}」
                          </p>
                        ))}
                      </div>
                    )}
                    {dim.watchOut && (
                      <p className="text-[16px] sm:text-[17px] text-[var(--accent)] leading-relaxed mt-3">△ {dim.watchOut}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {/* ===== 信号画像 ===== */}
            {n.signalPortrait.length > 0 && (
              <Section title="你的隐藏信号" delay={0.18}>
                <div className="space-y-4">
                  {n.signalPortrait.map((sig) => (
                    <div key={sig.id} className="flex gap-3">
                      <span className="text-[var(--accent)] flex-shrink-0">·</span>
                      <div>
                        <p className="text-[18px] text-[var(--text-warm)] leading-relaxed">
                          <span className="font-medium">{sig.label}</span>
                          <span className="opacity-90">——{sig.meaning}</span>
                        </p>
                        {sig.recent && (
                          <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] leading-relaxed mt-1.5">{sig.recent}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ===== 压力模式 ===== */}
            {n.stressPatterns.length > 0 && (
              <Section title="压力下的你" delay={0.2}>
                {n.stressPatterns.map((f, i) => <FactBlock key={i} fact={f} />)}
              </Section>
            )}

            {/* ===== 优势（全部） ===== */}
            {n.strengths.length > 0 && (
              <Section title="你的关系资源" delay={0.22}>
                {n.strengths.map((f, i) => <FactBlock key={i} fact={f} />)}
              </Section>
            )}

            {/* ===== 容易被误解的地方 ===== */}
            {n.misunderstood.length > 0 && (
              <Section title="你容易被误解的地方" delay={0.24}>
                <div className="space-y-3">
                  {n.misunderstood.map((m, i) => (
                    <p key={i} className="text-[18px] text-[var(--text-warm)] leading-relaxed flex gap-3">
                      <span className="text-[var(--accent)] flex-shrink-0">·</span>
                      <span>{m}</span>
                    </p>
                  ))}
                </div>
              </Section>
            )}

            {/* ===== 阶段解读 ===== */}
            {n.lifeStageNote && (
              <Section title="你目前所处的阶段" delay={0.26}>
                <p className="text-[18px] text-[var(--text-warm)] leading-relaxed">{n.lifeStageNote}</p>
              </Section>
            )}

            {/* ===== 建议 ===== */}
            {n.suggestions.length > 0 && (
              <Section title="给你的具体建议" delay={0.28}>
                <div className="space-y-2.5 sm:space-y-3">
                  {n.suggestions.map((s, i) => (
                    <div key={i} className="card p-3.5 sm:p-4">
                      <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">
                        <span className="text-[var(--accent)] font-mono mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ===== 沟通话术 ===== */}
            {n.scripts.length > 0 && (
              <Section title="可以直接用的话术" delay={0.3}>
                <div className="space-y-2.5 sm:space-y-3">
                  {n.scripts.map((s, i) => (
                    <div key={i} className="border border-[var(--border-dim)] rounded-lg p-3.5 sm:p-4">
                      <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed italic">{s}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ===== 质量提示 ===== */}
            {n.qualityNote && (
              <div className="border border-[var(--border-dim)] rounded-lg p-3.5 sm:p-4 mb-8 sm:mb-10">
                <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] leading-relaxed">{n.qualityNote}</p>
                {data.responseQuality && (
                  <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mt-2">
                    本次作答质量指数：{data.responseQuality.rqi}/100
                  </p>
                )}
              </div>
            )}

            {/* ===== 结尾 ===== */}
            <Section title="最后" delay={0.32}>
              <Paragraphs text={n.closing} />
            </Section>
          </>
        )
      )}

      {/* ===== 邀请另一半（双人默契，解锁后可见） ===== */}
      {reportUnlocked && (
        <div className="card p-4 sm:p-6 mb-8 sm:mb-10 fade-in-up" style={{ animationDelay: "0.33s" }}>
          <div className="text-center">
            <p className="archive-label mb-3">Pair · 双人默契</p>
            <h3 className="display-serif text-[20px] sm:text-[22px] text-[var(--text-warm)] mb-3 font-semibold">
              想看看你们俩的关系组合？
            </h3>

            {/* 被分享人（B）专属文案：发起方是 TA 的同伴 */}
            {pairRole === "b" ? (
              <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-5 leading-relaxed">
                TA 已经完成测评并邀请了你。你们可以一起查看双人关系分析。
                <br />
                <span className="text-[15px]">（这是双人模式，和下面的朋友分享海报是两回事）</span>
              </p>
            ) : (
              <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-5 leading-relaxed">
                生成一个邀请链接发给TA。TA独立完成测试后，你们就能看到双人关系分析。
                <br />
                <span className="text-[15px]">（这是双人模式，和下面的朋友分享海报是两回事）</span>
              </p>
            )}

            {/* 三种状态分支：
                  1. inviteUrl 存在（已生成邀请链接）：展示链接 + 二维码 + 底部「查看契合画像」按钮
                  2. inviteUrl 不存在 + pairRole !== "b"（A 未生成过邀请）：展示「生成邀请链接」+「查看契合画像」按钮
                  3. inviteUrl 不存在 + pairRole === "b"（B 被分享人）：只展示「查看契合画像」按钮 */}
            {inviteUrl ? (
              <>
                <p className="text-[18px] text-[var(--text-warm)] mb-4">邀请链接已生成，把这个链接发给 TA：</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="input-field text-sm"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button onClick={handleCopy} className="btn-ghost whitespace-nowrap">
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
                {inviteQr && (
                  <div className="flex flex-col items-center mb-5">
                    <div className="bg-[#f5ede0] p-2.5 rounded-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={inviteQr} alt="双人邀请二维码" className="w-32 h-32 block" />
                    </div>
                    <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mt-2.5">
                      或直接让 TA 扫码进入
                    </p>
                  </div>
                )}
                <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-5 leading-relaxed">
                  TA 完成后，你们可以在契合画像页查看结果。
                </p>
                {pairId && (
                  <SafeLink href={`/pair/${pairId}`} className="btn-view-pair w-full sm:w-auto">
                    {pairPaid ? "✦ 查看我们的契合画像 →" : "🔓 解锁契合画像 · ¥19.9 →"}
                  </SafeLink>
                )}
                {!pairPaid && pairId && (
                  <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mt-2 text-center">
                    双人默契报告 · 含双方体验 / 完整循环 / 沟通话术
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* 仅 A 显示「生成邀请链接」按钮 */}
                {pairRole !== "b" && (
                  <button
                    onClick={handleCreateInvite}
                    className="btn-primary w-full sm:w-auto"
                    disabled={creatingInvite}
                  >
                    {creatingInvite ? "生成中..." : "生成邀请链接 →"}
                  </button>
                )}
                {/* 「查看我们的契合画像」按钮：pairId 存在时对 A 和 B 都可点
                    （A 可能还没生成邀请但已有 pair；B 完成测试后自动获得 pair）
                    未付费 → ¥19.9 解锁按钮；已付费 → 直接进入契合画像 */}
                {pairId ? (
                  <SafeLink href={`/pair/${pairId}`} className="btn-view-pair w-full sm:w-auto">
                    {pairPaid ? "✦ 查看我们的契合画像 →" : "🔓 解锁契合画像 · ¥19.9 →"}
                  </SafeLink>
                ) : pairRole !== "b" ? (
                  <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)]">
                    对方完成后，这里会出现「查看契合画像」
                  </p>
                ) : null}
                {!pairPaid && pairId && (
                  <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mt-1">
                    双人默契报告 · 含双方体验 / 完整循环 / 沟通话术
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 分享海报（唯一入口：未解锁时含免费解锁进度，解锁后纯分享） ===== */}
      {(() => {
        const SHARES_NEEDED = VALID_SHARES_FOR_FREE_UNLOCK;
        const sharesDone = Math.min(data.credits?.shares || 0, SHARES_NEEDED);
        const ready = sharesDone >= SHARES_NEEDED;
        return (
          <div
            className={`rounded-lg p-4 mb-8 sm:p-6 sm:mb-12 fade-in-up ${
              reportUnlocked
                ? "card"
                : "border border-[var(--accent)] bg-[rgba(201,169,110,0.08)]"
            }`}
            style={{ animationDelay: "0.35s" }}
          >
            <div className="text-center">
              <p className="archive-label mb-3">Share · 分享给朋友</p>
              <h3 className="display-serif text-[20px] sm:text-[22px] text-[var(--text-warm)] mb-3 font-semibold">
                {reportUnlocked ? "把你的关系牌分享给朋友" : `分享 ${SHARES_NEEDED} 人，免费解锁`}
              </h3>
              <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-5 leading-relaxed">
                生成你的专属海报（含二维码）。朋友扫码后翻开的，是 TA 们自己的牌。
                {!reportUnlocked && (
                  <>
                    <br />
                    <span className="text-[15px]">TA 答完最后一题，才算 1 位有效分享。</span>
                  </>
                )}
              </p>

              {/* 免费解锁进度（仅未解锁时显示） */}
              {!reportUnlocked && (
                <>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)]">有效分享进度</p>
                    <p className="text-[18px] text-[var(--accent)] font-mono">
                      {sharesDone}/{SHARES_NEEDED}
                    </p>
                  </div>
                  <div className="flex gap-1.5 mb-5">
                    {Array.from({ length: SHARES_NEEDED }, (_, i) => (
                      <span
                        key={i}
                        className={`flex-1 h-1.5 rounded-full ${i < sharesDone ? "bg-[var(--accent)]" : "bg-[var(--border-dim)]"}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {reportUnlocked ? (
                <SafeLink
                  href={`/share/${sessionId}`}
                  className="btn-primary w-full sm:w-auto block text-center"
                >
                  生成我的分享海报 →
                </SafeLink>
              ) : ready ? (
                <button onClick={handleUnlock} disabled={unlocking} className="btn-primary w-full">
                  {unlocking ? "解锁中..." : "已集齐，立即免费解锁 →"}
                </button>
              ) : (
                <>
                  <SafeLink href={`/share/${sessionId}`} className="btn-primary w-full">
                    {`分享我的海报（还差 ${SHARES_NEEDED - sharesDone} 人）→`}
                  </SafeLink>
                  <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] text-center mt-3 leading-relaxed">
                    每 1 位朋友完成测评，进度 +1 · 海报已备好，点一下就能发
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {error && <p className="text-[16px] sm:text-[17px] text-[var(--danger)] text-center">{error}</p>}

      <div className="text-center mt-6 sm:mt-8">
        <button
          onClick={() => router.back()}
          className="text-[16px] sm:text-[17px] text-[var(--text-muted)] hover:text-[var(--text-warm)] active:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4"
        >
          ← 返回上一页
        </button>
      </div>

      <HomeFooter />
      </div>
    </main>
  );
}
