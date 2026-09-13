"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RadarChart } from "@/app/components/RadarChart";
import HomeFooter from "@/app/components/HomeFooter";
import { PersonalityCard, PersonalityCardRow } from "@/lib/personality/cards/PersonalityCard";

interface FullReport {
  primaryTagline: string;
  scores: { social: number; rationality: number; planning: number; risk: number; dominance: number; sensitivity: number };
  topDimensions: Array<{ key: string; score: number; summary: string }>;
  coreStrength: { title: string; description: string };
  primary: { name: string; description: string };
  secondary: { name: string; description: string };
  hidden: { name: string; description: string };
  surfaceVsReal: { surface: string; real: string };
  contradictions: string[];
  strengths: Array<{ title: string; description: string }>;
  blindSpots: Array<{ title: string; description: string }>;
  triggers: { whatIrritates: string; whatDisappoints: string; whatLosesPatience: string; howYouHandle: string };
  stress: { mild: string; moderate: string; high: string };
  relationships: { makingFriends: string; buildingTrust: string; handlingConflict: string; endingRelationships: string };
  intimacy: { attractedTo: string; expressingLove: string; needsInLove: string; commonConflicts: string };
  career: { suitable: string; unsuitable: string; workStyle: string; decisionStyle: string; executionStyle: string };
  leadership: string;
  moneyAndRisk: string;
  growth: string[];
  summary: string;
}

interface ResultData {
  testId: string;
  paid: boolean;
  fullReport: FullReport | null;
  types?: {
    primary: { id: string; name: string; similarity: number; card: any };
    secondary: { id: string; name: string; similarity: number; card: any };
    hidden: { id: string; name: string; similarity: number; card: any };
  };
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-9 sm:mb-12 fade-in-up">
    <div className="flex items-baseline gap-3 mb-5 sm:mb-6">
      <h3 className="display-serif font-bold text-[20px] sm:text-[22px] md:text-[24px] text-[var(--accent-bright)] tracking-tight">
        {title}
      </h3>
      <span className="flex-1 h-px bg-[var(--border-dim)] translate-y-[-3px]" />
    </div>
    {children}
  </section>
);

export default function PersonalityReport() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();
  const testId = params.testId;

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/personality/tests/${testId}/result`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setData(json);
        if (!json.paid) {
          router.push(`/personality/result/${testId}`);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId, router]);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setShareError("");
    try {
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
      window.location.href = `/share/personality/${json.code}`;
    } catch (e: any) {
      setShareError(e.message || "分享失败");
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-5 sm:px-6">
        <p className="text-[18px] sm:text-[20px] text-[var(--text-muted)]">完整报告加载中...</p>
      </main>
    );
  }

  if (!data || !data.fullReport) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-[18px] sm:text-[19px] text-[var(--danger)]">{error || "报告不可用"}</p>
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

  const r = data.fullReport;

  return (
    <main className="flex-1 px-5 py-8 sm:px-6 sm:py-10 max-w-2xl mx-auto w-full safe-bottom">
      {/* 顶部：核心人格 */}
      <div className="text-center mb-8 sm:mb-10 fade-in-up">
        <p className="archive-label mb-3">完整人格报告</p>
        <h1 className="display-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-warm)] mb-2">
          {r.primary.name}
        </h1>
        <p className="display-serif text-[18px] sm:text-[22px] text-[var(--accent)] font-medium">「{r.primaryTagline}」</p>
      </div>

      {/* 雷达图 */}
      <div className="card p-4 mb-8 sm:p-6 sm:mb-10 fade-in-up" style={{ animationDelay: "0.1s" }}>
        <p className="archive-label mb-4">性格 DNA</p>
        <div className="flex justify-center">
          <RadarChart scores={r.scores} size={240} />
        </div>
      </div>

      {/* 01-03：核心 / 第二 / 隐藏 — 每段前置一张原型卡 */}
      <Section title="01 · 你的核心人格">
        <div className="mb-5 sm:mb-6">
          {data.types && (
            <PersonalityCard
              card={data.types.primary.card}
              userScores={r.scores as Record<string, number>}
              matchScore={Math.round((data.types.primary.similarity ?? 0) * 100)}
              size="md"
              label="primary"
              className="mx-auto"
            />
          )}
        </div>
        <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed whitespace-pre-line">
          {r.primary.description}
        </p>
      </Section>

      <Section title="02 · 你的第二人格">
        <div className="mb-5 sm:mb-6">
          {data.types && (
            <PersonalityCard
              card={data.types.secondary.card}
              userScores={r.scores as Record<string, number>}
              matchScore={Math.round((data.types.secondary.similarity ?? 0) * 100)}
              size="md"
              label="secondary"
              className="mx-auto"
            />
          )}
        </div>
        <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">
          <span className="display-serif text-base text-[var(--accent)] mr-2">{r.secondary.name}</span>
          {r.secondary.description}
        </p>
      </Section>

      <Section title="03 · 你的隐藏人格">
        <div className="mb-5 sm:mb-6">
          {data.types && (
            <PersonalityCard
              card={data.types.hidden.card}
              userScores={r.scores as Record<string, number>}
              matchScore={Math.round((data.types.hidden.similarity ?? 0) * 100)}
              size="md"
              label="hidden"
              className="mx-auto"
            />
          )}
        </div>
        <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">
          <span className="display-serif text-base text-[var(--accent)] mr-2">{r.hidden.name}</span>
          {r.hidden.description}
        </p>
      </Section>

      {/* 04：表面 vs 真实 */}
      <Section title="04 · 表面的你 vs 真正的你">
        <div className="card p-4 sm:p-5 space-y-4 sm:space-y-5">
          <div>
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">别人看到的你</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.surfaceVsReal.surface}</p>
          </div>
          <div className="border-t border-[var(--border-dim)] pt-4 sm:pt-5">
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">真正的你</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.surfaceVsReal.real}</p>
          </div>
        </div>
      </Section>

      {/* 05：性格矛盾 */}
      <Section title="05 · 你的性格矛盾">
        <ul className="space-y-2.5 sm:space-y-3">
          {r.contradictions.map((c, i) => (
            <li key={i} className="flex gap-2.5 sm:gap-3 text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">
              <span className="text-[var(--accent)] flex-shrink-0">·</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 06：核心优势 */}
      <Section title="06 · 你的核心优势">
        <div className="space-y-2.5 sm:space-y-3">
          {r.strengths.map((s, i) => (
            <div key={i} className="card p-3.5 sm:p-4">
              <p className="display-serif font-semibold text-[20px] sm:text-[22px] text-[var(--text-warm)] mb-1.5">{s.title}</p>
              <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 07：性格盲区 */}
      <Section title="07 · 你的性格盲区">
        <div className="space-y-2.5 sm:space-y-3">
          {r.blindSpots.map((b, i) => (
            <div key={i} className="border border-[var(--border-dim)] rounded-lg p-3.5 sm:p-4">
              <p className="display-serif font-semibold text-[20px] sm:text-[22px] text-[var(--text-warm)] mb-1.5">{b.title}</p>
              <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 08：情绪触发点 */}
      <Section title="08 · 你的情绪触发点">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">什么事情最容易让你烦躁</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.triggers.whatIrritates}</p>
          </div>
          <div>
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">什么事情最容易让你失望</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.triggers.whatDisappoints}</p>
          </div>
          <div>
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">什么事情容易让你失去耐心</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.triggers.whatLosesPatience}</p>
          </div>
          <div>
            <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">你通常如何处理负面情绪</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.triggers.howYouHandle}</p>
          </div>
        </div>
      </Section>

      {/* 09：压力状态 */}
      <Section title="09 · 压力状态下的你">
        <div className="space-y-3">
          <div className="card p-4">
            <p className="text-[16px] sm:text-[17px] text-[var(--accent)] mb-1.5 font-medium">轻度压力</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.stress.mild}</p>
          </div>
          <div className="card p-4">
            <p className="text-[16px] sm:text-[17px] text-[var(--accent)] mb-1.5 font-medium">中度压力</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.stress.moderate}</p>
          </div>
          <div className="card p-4">
            <p className="text-[16px] sm:text-[17px] text-[var(--accent)] mb-1.5 font-medium">高压状态</p>
            <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.stress.high}</p>
          </div>
        </div>
      </Section>

      {/* 10：人际关系 */}
      <Section title="10 · 你的人际关系模式">
        <div className="space-y-3 sm:space-y-4">
          {[
            ["如何认识朋友", r.relationships.makingFriends],
            ["如何建立信任", r.relationships.buildingTrust],
            ["如何处理冲突", r.relationships.handlingConflict],
            ["如何结束一段关系", r.relationships.endingRelationships],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">{label}</p>
              <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{val}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 11：亲密关系 */}
      <Section title="11 · 你的亲密关系模式">
        <div className="space-y-3 sm:space-y-4">
          {[
            ["你喜欢什么类型的人", r.intimacy.attractedTo],
            ["你表达喜欢的方式", r.intimacy.expressingLove],
            ["你在感情里需要什么", r.intimacy.needsInLove],
            ["你容易出现什么矛盾", r.intimacy.commonConflicts],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">{label}</p>
              <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{val}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 12：事业 */}
      <Section title="12 · 你的事业人格">
        <div className="space-y-3 sm:space-y-4">
          {[
            ["适合的工作环境", r.career.suitable],
            ["不适合的工作环境", r.career.unsuitable],
            ["你的工作方式", r.career.workStyle],
            ["你的决策特点", r.career.decisionStyle],
            ["你的执行风格", r.career.executionStyle],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-1.5 font-medium">{label}</p>
              <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{val}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 13：领导风格 */}
      <Section title="13 · 你的领导风格">
        <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.leadership}</p>
      </Section>

      {/* 14：金钱与风险 */}
      <Section title="14 · 你的金钱与风险模式">
        <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">{r.moneyAndRisk}</p>
      </Section>

      {/* 15：成长建议 */}
      <Section title="15 · 你的成长建议">
        <div className="space-y-2.5">
          {r.growth.map((g, i) => (
            <div key={i} className="flex gap-2.5 sm:gap-3 text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed">
              <span className="text-[var(--accent)] font-mono flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span>{g}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 16：完整总结 */}
      <Section title="16 · 我的人格说明书">
        <div className="card p-4 sm:p-6">
          <p className="text-[18px] sm:text-[19px] text-[var(--text-warm)] leading-relaxed whitespace-pre-line">
            {r.summary}
          </p>
        </div>
      </Section>

      {/* 分享卡（已解锁用户 — 纯分享入口） */}
      <section
        className="mt-8 p-5 sm:p-6 fade-in-up rounded-2xl border-2 shadow-lg"
        style={{
          animationDelay: "0.18s",
          background: "var(--highlight-bg)",
          borderColor: "var(--highlight)",
          boxShadow: "0 8px 24px -8px rgba(245, 185, 66, 0.35)",
        }}
      >
        <p
          className="archive-label mb-2"
          style={{ color: "var(--highlight)" }}
        >
          Share · 分享给朋友
        </p>
        <h3 className="display-serif font-semibold text-[20px] sm:text-[22px] text-[var(--text-warm)] mb-2">
          把你的画像分享给朋友
        </h3>
        <p className="text-[16px] sm:text-[17px] text-[var(--text-muted)] mb-4 leading-relaxed">
          每个人在关系之外的样子都不一样——
          <br />
          想看看你朋友的会是哪一种吗？
        </p>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="btn-primary w-full"
          style={{
            background: "var(--highlight)",
            color: "var(--bg-dark)",
            borderColor: "var(--highlight)",
            fontWeight: 600,
          }}
        >
          {sharing ? "正在生成..." : "生成我的海报 →"}
        </button>
        {shareError && (
          <div
            className="mt-3 px-3 py-2 rounded-md text-[16px] sm:text-[17px] flex items-start gap-2"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.45)",
              color: "#fca5a5",
            }}
          >
            <span className="flex-shrink-0">⚠</span>
            <span>{shareError}</span>
          </div>
        )}
      </section>

      {/* 免责声明 */}
      <p className="text-[15px] sm:text-[16px] text-[var(--text-muted)] leading-relaxed mt-10 sm:mt-12 mb-6 sm:mb-8 text-center px-2">
        本测试主要用于自我探索、娱乐及人格倾向参考，不属于医学、心理学或精神健康诊断，测试结果不应代替专业意见。
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 text-[16px] sm:text-[17px]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[var(--text-muted)] hover:text-[var(--text-warm)] active:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4"
        >
          ← 返回上一页
        </button>
        <span className="hidden sm:inline text-[var(--text-muted)]/40">·</span>
        <Link href="/personality" className="text-[var(--text-muted)] hover:text-[var(--text-warm)] active:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4">
          重新测试
        </Link>
      </div>

      <HomeFooter />
    </main>
  );
}