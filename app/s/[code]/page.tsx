"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CompassDial, OrnamentDivider, StarMap, TarotCard } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import { RadarChart } from "@/app/components/RadarChart";
import { tarotFor, tarotImage } from "@/lib/reports/tarot";
import { PersonalityCard } from "@/lib/personality/cards/PersonalityCard";

// =====================================================
// 普通分享落地页（/s/[code]）
// 朋友通过海报二维码/链接进入 → 看到分享者的牌面 teaser
// → 好奇心驱动，开始自己的单人测试。
// 与 /invite/[code]（双人默契）完全隔离，不创建 pair。
// =====================================================

interface ShareLanding {
  code: string;
  visits: number;
  shareType?: "couple" | "personality";
  testId?: string;
  sharer:
    | {
        nickname: string;
        archetype: string;
        tags: string[];
        oneLiner: string;
        fileNo: string;
      }
    | {
        nickname: string;
        primaryCn: string;
        primaryEn: string;
        primaryType?: string;
        tagline: string;
        matchScore: number;
        scores: {
          social: number;
          rationality: number;
          planning: number;
          risk: number;
          dominance: number;
          sensitivity: number;
        };
        fileNo: string;
      };
}

export default function ShareLandingPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [data, setData] = useState<ShareLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchShare() {
      try {
        const res = await fetch(`/api/shares/${code}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "分享不存在");
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShare();
  }, [code]);

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm mt-4">
          {data?.shareType === "personality" ? "正在打开 TA 的人格画像..." : "正在翻开 TA 的牌..."}
        </p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[var(--text-muted)] text-sm">{error || "分享不存在或已过期"}</p>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="btn-ghost">去首页看看</button>
          {data?.shareType === "personality" && (
            <Link href="/personality" className="btn-ghost">去人格测试</Link>
          )}
        </div>
      </main>
    );
  }

  // 分支：人格测试分享（不出现塔罗）
  if (data.shareType === "personality") {
    const sharer = data.sharer;
  // shares/code API 已切到 V3 6 维 G/X/I/F/S/E；PersonalityCard 直接接受 V3 dim
  const personalityScores = "scores" in sharer
    ? sharer.scores as unknown as Partial<Record<"G"|"X"|"I"|"F"|"S"|"E", number>>
    : undefined;
  const primaryType = "primaryType" in sharer ? sharer.primaryType : undefined;
    if (!("primaryCn" in sharer)) return null;
    return (
      <main className="night-sky flex-1 px-5 py-6 max-w-sm mx-auto w-full">
        <StarMap opacity={0.12} seed={1} />
        <div className="relative">
          {/* 档案头 */}
          <div className="text-center mb-4 fade-in-up">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="archive-label">人格画像</span>
              <span className="w-6 h-px bg-[var(--border-dim)]" />
              <span className="file-number">No. {sharer.fileNo}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              你的好友刚刚看见了自己的核心人格——
            </p>
          </div>

          {/* 罗盘 + 雷达主图 */}
          <div className="relative flex items-center justify-center mb-2 fade-in-up" style={{ animationDelay: "0.06s" }}>
            <div className="absolute pointer-events-none">
              <CompassDial size={190} opacity={0.16} />
            </div>
            <div className="w-[200px] h-[200px]">
              <RadarChart scores={sharer.scores} size={200} />
            </div>
          </div>
          <p className="text-center text-[11px] text-[var(--text-muted)] italic display-serif mb-3 fade-in-up" style={{ animationDelay: "0.1s" }}>
            「{sharer.tagline?.slice(0, 28) || ""}」
          </p>

          {/* 核心人格卡 */}
          <div className="flex justify-center mb-4 fade-in-up" style={{ animationDelay: "0.14s" }}>
            {primaryType && "matchScore" in sharer && (
              <PersonalityCard
                type={primaryType}
                userScores={personalityScores}
                matchScore={"matchScore" in sharer ? sharer.matchScore : undefined}
                size="sm"
                label="primary"
              />
            )}
          </div>

          <OrnamentDivider className="mb-4" />

          {/* 好奇话术 */}
          <div className="text-center mb-5 fade-in-up" style={{ animationDelay: "0.18s" }}>
            <p className="display-serif text-lg text-[var(--text-warm)] leading-relaxed">
              每个人在关系之外的样子也不一样。
              <br />
              <span className="text-[var(--accent)]">你，会是哪一种？</span>
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">
              36 道选择题，看清连自己都没意识到的那一面
            </p>
          </div>

          {/* CTA */}
          <div className="fade-in-up" style={{ animationDelay: "0.22s" }}>
            <button
              onClick={() => {
                // 自己的分享不带 ref，避免自己拉自己（人格维度用 visitorId 兜底）
                const myVisitorId = localStorage.getItem("personalityVisitorId") || "";
                const isOwn = myVisitorId && data.testId && myVisitorId === localStorage.getItem("lastPersonalityVisitorId");
                router.push(isOwn ? "/personality" : `/personality/test?ref=${code}`);
              }}
              className="btn-primary w-full"
            >
              看看我是什么性格 →
            </button>
            <p className="text-[10px] text-[var(--text-muted)] text-center mt-3 leading-relaxed">
              已有 {Math.max(data.visits, 1)} 人从这里开始 · 你做的是自己的人格测试
            </p>
          </div>

          <p className="file-number text-center mt-6 tracking-[0.4em]">我到底什么性格</p>
        </div>
      </main>
    );
  }

  // 分支：双人默契分享（默认，向后兼容）
  const { sharer } = data;
  // 此时 shareType 不可能是 personality（已分支），但 TS 联合类型仍需 narrowing
  if (!("archetype" in sharer)) return null;
  const tarot = tarotFor(sharer.archetype);

  return (
    <main className="night-sky flex-1 px-5 py-6 max-w-sm mx-auto w-full">
      <StarMap opacity={0.12} seed={1} />
      <div className="relative">
        {/* ===== 档案头（紧凑） ===== */}
        <div className="text-center mb-4 fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="archive-label">关系画像</span>
            <span className="w-6 h-px bg-[var(--border-dim)]" />
            <span className="file-number">No. {sharer.fileNo}</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            你的好友 <span className="text-[var(--text-warm)]">{sharer.nickname}</span> 翻开了自己的关系牌——
          </p>
        </div>

        {/* ===== 牌面主视觉（缩小） ===== */}
        <div className="relative flex items-center justify-center mb-2 fade-in-up" style={{ animationDelay: "0.06s" }}>
          <div className="absolute pointer-events-none">
            <CompassDial size={190} opacity={0.16} />
          </div>
          <TarotCard
            image={tarotImage(tarot.slug)}
            cardTitle={tarot.cardTitle}
            cardTitleEn={tarot.cardTitleEn}
            width={118}
            elevated
          />
        </div>
        <p className="text-center text-[11px] text-[var(--text-muted)] italic display-serif mb-3 fade-in-up" style={{ animationDelay: "0.1s" }}>
          「{tarot.motto}」
        </p>

        {/* ===== 分享者原型（紧凑） ===== */}
        <div className="text-center mb-3 fade-in-up" style={{ animationDelay: "0.14s" }}>
          <p className="display-serif text-lg text-[var(--accent)]">「{sharer.archetype}」</p>
          {sharer.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2">
              {sharer.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] text-[var(--text-muted)] border border-[var(--border-dim)] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <OrnamentDivider className="mb-4" />

        {/* ===== 好奇话术 ===== */}
        <div className="text-center mb-5 fade-in-up" style={{ animationDelay: "0.18s" }}>
          <p className="display-serif text-lg text-[var(--text-warm)] leading-relaxed">
            每个人在关系里的样子都不一样。
            <br />
            <span className="text-[var(--accent)]">你的，会是什么模样？</span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">
            3 分钟，看看你自己都没意识到的那一面
          </p>
        </div>

        {/* ===== CTA ===== */}
        <div className="fade-in-up" style={{ animationDelay: "0.22s" }}>
          <button
            onClick={() => {
              // 自己的海报不计有效分享：本机 session 与分享者档案号一致 → 不带 ref
              const mySid = localStorage.getItem("sessionId") || "";
              const isOwn = mySid && sharer.fileNo === mySid.slice(0, 6).toUpperCase();
              router.push(isOwn ? "/start" : `/start?ref=${code}`);
            }}
            className="btn-primary w-full"
          >
            翻开我的牌 →
          </button>
          <p className="text-[10px] text-[var(--text-muted)] text-center mt-3 leading-relaxed">
            已有 {Math.max(data.visits, 1)} 人从这里开始 · 你做的是自己的单人测试
          </p>
        </div>

        <p className="file-number text-center mt-6 tracking-[0.4em]">默契研究所</p>

        <HomeFooter />
      </div>
    </main>
  );
}
