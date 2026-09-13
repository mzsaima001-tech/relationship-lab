// =====================================================
// 人格测试 v3 月相卡预览页（PNG 静态图，2026-09-13）
// 替换 v2 PersonalityCard 组件的 SVG 系统 → 直接渲染 30 张 PNG
// =====================================================
import { PERSONALITY_CARDS, PERSONALITY_CARDS_BY_NO } from "@/lib/personality/cards";
import { PERSONALITY_CARD_BY_ID } from "@/lib/personality/cards";
import { PersonalityCard } from "@/lib/personality/cards/PersonalityCard";

export const dynamic = "force-dynamic";

const SAMPLE_SCORES = {
  G: 55, X: 50, I: 45, F: 60, S: 70, E: 30,
};

export default function PersonalityCardPreview() {
  // 取代表性 6 张：3 主卡 + 3 过渡卡
  const sample = [
    PERSONALITY_CARD_BY_ID["P01"], // 暗礁无声（朔月）
    PERSONALITY_CARD_BY_ID["P08"], // 中段主卡
    PERSONALITY_CARD_BY_ID["P15"], // 望月
    PERSONALITY_CARD_BY_ID["T01"], // 暗礁·引子
    PERSONALITY_CARD_BY_ID["T08"], // 中段过渡
    PERSONALITY_CARD_BY_ID["T15"], // 行动派·全貌
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <main className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
      <div className="text-center mb-12 fade-in-up">
        <p className="archive-label mb-3">月相卡 v3 预览</p>
        <h1 className="display-serif text-3xl text-[var(--text-warm)] mb-2">
          30 张月相卡 · 6 维余弦匹配
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          P01–P15 主卡 + T01–T15 过渡卡 · 720×1080 PNG · 月相 / 判词 / 6 维能量
        </p>
      </div>

      {/* Section 0 — 30 张全览 */}
      <section className="mb-16">
        <p className="archive-label mb-6">30 张全览（按月相顺序）</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {PERSONALITY_CARDS_BY_NO.map(c => (
            <PersonalityCard key={c.id} card={c} size="sm" />
          ))}
        </div>
      </section>

      {/* Section 1 — md 模式（主页面/报告页用法） */}
      <section className="mb-16">
        <p className="archive-label mb-6">md 模式（报告页用法 · 带 label）</p>
        <div className="flex flex-wrap gap-8 justify-center items-start">
          <PersonalityCard card={sample[0]} size="md" matchScore={0.91} label="primary" userScores={SAMPLE_SCORES} />
          <PersonalityCard card={sample[1]} size="md" matchScore={0.87} label="secondary" userScores={SAMPLE_SCORES} />
          <PersonalityCard card={sample[2]} size="md" matchScore={0.86} label="hidden" userScores={SAMPLE_SCORES} />
        </div>
      </section>

      {/* Section 2 — lg 模式（详情页主图） */}
      <section className="mb-16">
        <p className="archive-label mb-6">lg 模式（详情页主图）</p>
        <div className="flex justify-center">
          <PersonalityCard card={sample[5]} size="lg" matchScore={0.94} label="primary" userScores={SAMPLE_SCORES} />
        </div>
      </section>

      {/* Section 3 — sm 模式（画廊/海报页） */}
      <section className="mb-16">
        <p className="archive-label mb-6">sm 模式（画廊 / 海报页）</p>
        <div className="flex flex-wrap gap-6 justify-center">
          {sample.map(c => (
            <PersonalityCard key={c.id} card={c} size="sm" matchScore={0.85} />
          ))}
        </div>
      </section>

      <div className="text-center text-xs text-[var(--text-muted)] mt-12">
        <p>※ V3 月相卡 · 30 张 hardcoded 来自 C C 卡片元数据 CSV</p>
        <p>※ 6 维 G/X/I/F/S/E 用余弦相似度匹配 → Top3</p>
      </div>
    </main>
  );
}