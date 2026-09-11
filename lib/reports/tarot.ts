// =====================================================
// 默契研究所 — 关系画像塔罗牌资产映射
// 11 种精品原型 × AI 生成塔罗主视觉
// 图片位于 public/tarot/<slug>.jpg
// V3.0：74 种原型全覆盖——新原型复用最近底图，
//       但拥有独立的牌名/英文名/motto。
// =====================================================

import { COMBO_NAMES, SINGLE_NAMES, polesForName } from "@/lib/assessment/archetypes";

export interface TarotCardAsset {
  /** 原型中文名（与 ARCHETYPE_COPY 键一致） */
  archetype: string;
  /** 图片 slug（public/tarot/<slug>.jpg） */
  slug: string;
  /** 塔罗牌名（牌面标题） */
  cardTitle: string;
  /** 牌面英文名 */
  cardTitleEn: string;
  /** 一句牌义 */
  motto: string;
}

export const TAROT_CARDS: TarotCardAsset[] = [
  {
    archetype: "敏锐观察者",
    slug: "keen-observer",
    cardTitle: "月下凝视",
    cardTitleEn: "The Silent Watcher",
    motto: "月亮照见一切，而她只静静看着。",
  },
  {
    archetype: "确定感追求者",
    slug: "certainty-seeker",
    cardTitle: "锚与灯",
    cardTitleEn: "The Anchor & Lantern",
    motto: "要自由，也要知道灯一直亮着。",
  },
  {
    archetype: "独立自足者",
    slug: "self-sufficient",
    cardTitle: "自转星环",
    cardTitleEn: "The Self-Contained Star",
    motto: "她的轨道里，自己是恒星。",
  },
  {
    archetype: "直接行动者",
    slug: "direct-actor",
    cardTitle: "离弦之箭",
    cardTitleEn: "The Loosed Arrow",
    motto: "话要说出口，箭不能停在弦上。",
  },
  {
    archetype: "靠近确认者",
    slug: "approach-confirmer",
    cardTitle: "奔赴之星",
    cardTitleEn: "The Approaching Star",
    motto: "悬而未决，比争吵更难熬。",
  },
  {
    archetype: "韧性独立者",
    slug: "resilient-independent",
    cardTitle: "星雨修桥",
    cardTitleEn: "The Bridge Mender",
    motto: "先自己撑伞，再回来修桥。",
  },
  {
    archetype: "敏感觉察者",
    slug: "sensitive-perceiver",
    cardTitle: "听风者",
    cardTitleEn: "The Wind Reader",
    motto: "风暴未起，她已听见风声。",
  },
  {
    archetype: "沉稳退避者",
    slug: "calm-withdrawer",
    cardTitle: "止水映月",
    cardTitleEn: "The Still Water",
    motto: "退后一步，是为了想清楚再说。",
  },
  {
    archetype: "修复桥梁",
    slug: "bridge-restorer",
    cardTitle: "架桥之手",
    cardTitleEn: "The Golden Bridge",
    motto: "总有人要先伸手，那个人是你。",
  },
  {
    archetype: "自在独立者",
    slug: "at-ease-independent",
    cardTitle: "星间闲坐",
    cardTitleEn: "The Starry Hammock",
    motto: "松弛，是安全感最松弛的样子。",
  },
  {
    archetype: "平衡适应者",
    slug: "balance-adapter",
    cardTitle: "平衡之球",
    cardTitleEn: "The Balancer",
    motto: "不偏不倚，随关系起舞。",
  },
];

const TAROT_MAP = new Map(TAROT_CARDS.map(card => [card.archetype, card]));

// ---- V3.0：为扩展原型生成牌面资产（复用最近底图，独立牌名/motto） ----
// V3.1：一个名字一张牌面——63 个扩展原型各有独立 slug（public/tarot/<slug>.jpg），
//       不再复用主极底图。生成清单见 .workbuddy/tmp/tarot-gen-manifest.json。
const EXTENDED_SLUGS: Record<string, string> = {
  // 回应需求 × 表达
  "热线追踪者": "hotline-tracker",
  "默语守望者": "silent-vigil",
  "自如表达者": "free-voice",
  "深潭静水者": "still-abyss",
  // 回应需求 × 空间
  "双栖共生者": "twin-habitat",
  "恒温相伴者": "warm-companion",
  // 回应需求 × 敏感
  "心潮共振者": "tidal-hearts",
  "理性索证者": "proof-seeker",
  "细腻自持者": "dew-poised",
  "磐石安然者": "rock-serene",
  // 回应需求 × 冲突
  "悬心等待者": "hanging-heart",
  "冷静拆解者": "cool-unraveler",
  "从容缓行者": "slow-pacer",
  // 回应需求 × 修复
  "安心织网者": "safe-weaver",
  "灯塔期盼者": "beacon-hoper",
  "无声守护者": "mute-guardian",
  "松涛自洽者": "pine-harmony",
  // 表达 × 空间
  "坦诚边界者": "open-gate",
  "无界畅言者": "boundless-voice",
  "缄默独行者": "quiet-loner",
  "静默依偎者": "hushed-cuddle",
  // 表达 × 敏感
  "爽直清风者": "crisp-breeze",
  "厚土藏金者": "buried-gold",
  // 表达 × 冲突
  "慢语深思者": "slow-muse",
  "寡言实干者": "quiet-doer",
  "深海潜水者": "abyss-diver",
  // 表达 × 修复
  "直言快语者": "blunt-blade",
  "无声缝补者": "mute-mender",
  "蚌壳自闭者": "closed-clam",
  // 空间 × 敏感
  "结界感知者": "ward-senser",
  "冷月独行者": "cold-moon",
  "涟漪同频者": "ripple-sync",
  "温巢安居者": "warm-nest",
  // 空间 × 冲突
  "界限明朗者": "clear-line",
  "直面亲密者": "face-to-face",
  "慢火相融者": "slow-fuse",
  // 空间 × 修复
  "孤峰自持者": "lone-peak",
  "织巢筑巢者": "nest-builder",
  "顺水推舟者": "downriver-boat",
  // 敏感 × 冲突
  "风暴捕手": "storm-catcher",
  "暗涌承压者": "undercurrent-bearer",
  "定海处置者": "sea-stiller",
  "古松缓语者": "old-pine",
  // 敏感 × 修复
  "柔心缝合者": "heart-suture",
  "玻璃收藏者": "glass-keeper",
  "恒温修护者": "steady-repairer",
  "山岩自稳者": "granite-steady",
  // 冲突 × 修复
  "破冰先锋": "icebreaker",
  "快刀斩麻者": "swift-knife",
  "文火慢炖者": "slow-simmer",
  "落叶归根者": "returning-leaf",
  // 单极原型
  "回声追寻者": "echo-chaser",
  "静水自安者": "still-water",
  "心声外放者": "loud-heart",
  "沉默深海者": "silent-deep",
  "边界漫步者": "edge-walker",
  "相拥取暖者": "shared-warmth",
  "微风易感者": "breeze-feeler",
  "恒温磐石者": "warm-bedrock",
  "当下破局者": "moment-breaker",
  "慢火沉淀者": "slow-settler",
  "温柔修补者": "tender-mender",
  "静待天晴者": "rain-waiter",
};

for (const name of [...Object.values(COMBO_NAMES), ...Object.values(SINGLE_NAMES)]) {
  if (TAROT_MAP.has(name)) continue;
  const poles = polesForName(name);
  if (!poles) continue;
  const { primary, secondary } = poles;
  TAROT_MAP.set(name, {
    archetype: name,
    slug: EXTENDED_SLUGS[name] ?? primary.slug,
    cardTitle: name,
    cardTitleEn: secondary
      ? `The ${primary.en} & The ${secondary.en}`
      : `The ${primary.en}`,
    motto: primary.motto,
  });
}

/** 按原型名取塔罗牌资产；未知原型回退到「平衡适应者」 */
export function tarotFor(archetype: string): TarotCardAsset {
  return (
    TAROT_MAP.get(archetype) ?? {
      archetype,
      slug: "balance-adapter",
      cardTitle: "平衡之球",
      cardTitleEn: "The Balancer",
      motto: "每张牌，都是一种与关系相处的方式。",
    }
  );
}

/** 塔罗牌图片路径 */
export function tarotImage(slug: string): string {
  return `/tarot/${slug}.jpg`;
}
