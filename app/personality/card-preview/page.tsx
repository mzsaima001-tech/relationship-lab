// =====================================================
// 人格测试卡片预览页 — 只用于本地/UI 调整时人工走查
// 不走完 36 题，直接渲染 3 个尺寸 × 多种类型的 PersonalityCard
// =====================================================
import { PersonalityCard, PersonalityCardRow } from "@/lib/personality/cards/PersonalityCard";
import type { PersonalityType } from "@/lib/personality/types";

// 取有代表性的 6 种类型覆盖：主型 + 过渡型 + 主型中段
const PREVIEW_TYPES = {
  md_main: "leader__whole" as PersonalityType, // 你之前最关心的过渡型
  md_balanced: "departure" as PersonalityType, // 中段典型
  md_extreme: "coordinator" as PersonalityType, // 上一轮的扎堆选手
  md_observer: "observer" as PersonalityType,
  md_creator: "creator" as PersonalityType,
  sm_extreme: "dark_reef" as PersonalityType, // 朔月（初一）
};

const SAMPLE_SCORES = {
  social: 67,
  rationality: 50,
  planning: 50,
  risk: 50,
  dominance: 60,
  sensitivity: 55,
};

export default function PersonalityCardPreview() {
  return (
    <main className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
      <div className="text-center mb-12 fade-in-up">
        <p className="archive-label mb-3">人格卡片 v4 预览</p>
        <h1 className="display-serif text-3xl text-[var(--text-warm)] mb-2">
          PersonalityCard · 元素配色 + 重画图腾
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          六元素配色（水蓝/火红/光金/土棕/风绿/曜深红）· 15 图腾重画加深意象（锚、王冠权杖、火焰、望远镜等）
        </p>
      </div>

      {/* Section 0 — 全 15 主型栅格（看配色分布） */}
      <section className="mb-16">
        <p className="archive-label mb-6">15 主型全览（六元素配色）</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <PersonalityCard type="dark_reef" size="sm" />
          <PersonalityCard type="spark" size="sm" />
          <PersonalityCard type="departure" size="sm" />
          <PersonalityCard type="scout" size="sm" />
          <PersonalityCard type="drifter" size="sm" />
          <PersonalityCard type="glimmer" size="sm" />
          <PersonalityCard type="strategist" size="sm" />
          <PersonalityCard type="observer" size="sm" />
          <PersonalityCard type="guardian" size="sm" />
          <PersonalityCard type="coordinator" size="sm" />
          <PersonalityCard type="creator" size="sm" />
          <PersonalityCard type="explorer" size="sm" />
          <PersonalityCard type="doer" size="sm" />
          <PersonalityCard type="leader" size="sm" />
          <PersonalityCard type="whole" size="sm" />
        </div>
      </section>

      {/* Section 0b — 14 过渡型栅格（看对角渐变） */}
      <section className="mb-16">
        <p className="archive-label mb-6">14 过渡型（两端元素对角渐变）</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <PersonalityCard type="dark_reef__spark" size="sm" />
          <PersonalityCard type="spark__departure" size="sm" />
          <PersonalityCard type="departure__scout" size="sm" />
          <PersonalityCard type="scout__drifter" size="sm" />
          <PersonalityCard type="drifter__glimmer" size="sm" />
          <PersonalityCard type="glimmer__strategist" size="sm" />
          <PersonalityCard type="strategist__observer" size="sm" />
          <PersonalityCard type="observer__guardian" size="sm" />
          <PersonalityCard type="guardian__coordinator" size="sm" />
          <PersonalityCard type="coordinator__creator" size="sm" />
          <PersonalityCard type="creator__explorer" size="sm" />
          <PersonalityCard type="explorer__doer" size="sm" />
          <PersonalityCard type="doer__leader" size="sm" />
          <PersonalityCard type="leader__whole" size="sm" />
        </div>
      </section>
      <section className="mb-16">
        <p className="archive-label mb-6">md 模式（主页面/报告页用法）</p>
        <div className="flex flex-wrap gap-8 justify-center items-start">
          <PersonalityCard type={PREVIEW_TYPES.md_main} size="md" matchScore={91} label="primary" />
          <PersonalityCard type={PREVIEW_TYPES.md_balanced} size="md" matchScore={87} label="secondary" />
          <PersonalityCard type={PREVIEW_TYPES.md_extreme} size="md" matchScore={86} label="hidden" />
        </div>
      </section>

      {/* Section 2 — md 模式（无 label，看默认外观） */}
      <section className="mb-16">
        <p className="archive-label mb-6">md 模式（无角标版）</p>
        <div className="flex flex-wrap gap-8 justify-center items-start">
          <PersonalityCard type="leader" size="md" matchScore={91} />
          <PersonalityCard type="observer" size="md" matchScore={87} />
          <PersonalityCard type="creator" size="md" matchScore={86} />
        </div>
      </section>

      {/* Section 3 — lg 模式（详情页主图） */}
      <section className="mb-16">
        <p className="archive-label mb-6">lg 模式（详情页主图）</p>
        <div className="flex justify-center">
          <PersonalityCard type="leader__whole" size="lg" matchScore={91} label="primary" />
        </div>
      </section>

      {/* Section 4 — sm 模式（画廊/海报页） */}
      <section className="mb-16">
        <p className="archive-label mb-6">sm 模式（画廊/海报）</p>
        <div className="flex flex-wrap gap-6 justify-center">
          <PersonalityCard type="leader__whole" size="sm" matchScore={91} />
          <PersonalityCard type="departure" size="sm" matchScore={87} />
          <PersonalityCard type="coordinator" size="sm" matchScore={86} />
          <PersonalityCard type="observer" size="sm" matchScore={84} />
          <PersonalityCard type="creator" size="sm" matchScore={82} />
          <PersonalityCard type="dark_reef" size="sm" matchScore={70} />
          <PersonalityCard type="spark__departure" size="sm" matchScore={75} />
          <PersonalityCard type="strategist__observer" size="sm" matchScore={68} />
        </div>
      </section>

      {/* Section 5 — PersonalityCardRow 三联卡 */}
      <section className="mb-16">
        <p className="archive-label mb-6">三联卡（primary + secondary + hidden）</p>
        <PersonalityCardRow
          primary="leader__whole"
          secondary="departure"
          hidden="spark__departure"
          userScores={SAMPLE_SCORES}
          size="md"
        />
      </section>

      {/* Section 6 — 真实使用场景（userScores 传值效果） */}
      <section className="mb-16">
        <p className="archive-label mb-6">实际 usage（用户测试结果 + matchScore）</p>
        <div className="flex flex-wrap gap-8 justify-center">
          <PersonalityCard
            type="strategist"
            size="md"
            matchScore={89}
            label="primary"
            userScores={SAMPLE_SCORES}
          />
          <PersonalityCard
            type="guardian__coordinator"
            size="md"
            matchScore={85}
            label="secondary"
            userScores={SAMPLE_SCORES}
          />
        </div>
      </section>

      <div className="text-center text-xs text-[var(--text-muted)] mt-12">
        <p>※ 当前为 v2 预览，刷新后即可对比上一版</p>
        <p>※ 反馈"卡片还要：xxx"我立刻批量铺到 result / report / 海报 / 落地 / 后台画廊</p>
      </div>
    </main>
  );
}
