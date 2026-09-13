// =====================================================
// 人格测试 — 通用原型卡组件（v5 — 径向渐变 + 双圆装饰）
// 风格：背景径向渐变中心高亮，左右两圆几何装饰，月相图腾居中，名字大，副标小字
// 接受 29 个任意 type（15 主 + 14 过渡）
// =====================================================

"use client";

import { type PersonalityDimension, type PersonalityType } from "../types";
import { ARCHETYPE_VECTORS } from "../archetypes";
import {
  MOON_PHASE_MAP,
  TOTEM_MAP,
  TOTEM_DESCRIPTORS,
  TOTEM_MOON_PHASE,
  TOTEM_ELEMENT_MAP,
  TOTEM_ELEMENT_NAME,
  ELEMENT_PALETTE,
  TOTEM_ELEMENT_KEY,
  HYBRID_GRADIENT,
} from "./totem";

export type CardSize = "sm" | "md" | "lg";

interface PersonalityCardProps {
  type: PersonalityType;
  /** 用户实测的 6 维分数（保留接口兼容性，本版本不展示） */
  userScores?: Partial<Record<PersonalityDimension, number>>;
  /** 匹配度（display only，可选） */
  matchScore?: number;
  /** 卡片大小 */
  size?: CardSize;
  /** 兼容旧 API，不再驱动渲染 */
  showDiff?: boolean;
  className?: string;
  /** 是否显示匹配度角标（仅 primary/secondary/hidden 标签） */
  label?: "primary" | "secondary" | "hidden";
  /** 配色主题：light 浅色信纸（默认）/ dark 深色夜空（性格测试报告页用） */
  theme?: "light" | "dark";
}

/** 深色主题调色板：背景统一深棕黑（与 night-sky 一致），accent 提亮保证深底下可读 */
const DARK_PALETTE: Record<string, { accent: string; ink: string }> = {
  水: { accent: "#8FC3E0", ink: "#E9F2F9" },
  火: { accent: "#F09A6D", ink: "#FCE9DE" },
  风: { accent: "#93CFA9", ink: "#E9F6EE" },
  光: { accent: "#E3BC63", ink: "#FBF3DE" },
  土: { accent: "#CCA87E", ink: "#F5ECDD" },
  曜: { accent: "#DE9393", ink: "#F9E9E9" },
};
const DARK_BG = "#2a2215";
const DARK_BG_EDGE = "#151009";

const SIZE_MAP: Record<CardSize, { card: string; totem: number; moon: number; name: string; pad: string; element: number; indexFont: string; ornamentSize: number }> = {
  sm: { card: "w-56",    totem: 76,  moon: 28, name: "text-lg",     pad: "pt-12 pb-5 px-5", element: 12, indexFont: "text-[10px]", ornamentSize: 90 },
  md: { card: "w-72",    totem: 108, moon: 32, name: "text-2xl",    pad: "pt-14 pb-6 px-6", element: 14, indexFont: "text-[11px]", ornamentSize: 130 },
  lg: { card: "w-96",    totem: 144, moon: 40, name: "text-3xl",    pad: "pt-16 pb-8 px-8", element: 16, indexFont: "text-xs",    ornamentSize: 170 },
};

export function PersonalityCard({
  type,
  userScores,
  matchScore,
  size = "md",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showDiff = true,
  className = "",
  label,
  theme = "light",
}: PersonalityCardProps) {
  const dims = SIZE_MAP[size];
  const vectorsAll = ARCHETYPE_VECTORS as unknown as Record<PersonalityType, typeof ARCHETYPE_VECTORS[keyof typeof ARCHETYPE_VECTORS]>;
  const vector = vectorsAll[type];
  const moon = TOTEM_MOON_PHASE[type];
  const descriptor = TOTEM_DESCRIPTORS[type];
  const TotemComp = TOTEM_MAP[type];
  const MoonComp = MOON_PHASE_MAP[type];
  const ElementComp = TOTEM_ELEMENT_MAP[type];
  const elementName = TOTEM_ELEMENT_NAME[type];
  const palette = ELEMENT_PALETTE[TOTEM_ELEMENT_KEY[type]];

  const labelText = label === "primary" ? "核心" : label === "secondary" ? "次型" : label === "hidden" ? "隐藏" : "";

  // 月相序号（初一 ~ 十五）
  const isHybrid = type.includes("__");
  const mainType = isHybrid ? (type.split("__")[0] as PersonalityType) : type;
  const tailType = isHybrid ? (type.split("__")[1] as PersonalityType) : type;
  const mainName = getCnName(mainType);
  const tailName = getCnName(tailType);

  const phaseLabel = isHybrid
    ? `${toCnNum(monthNum(mainType))} · ${toCnNum(monthNum(tailType))}`
    : `${toCnNum(monthNum(type))}`;

  // 过渡型主色用后端元素
  const dark = theme === "dark";
  const elementKey = isHybrid ? HYBRID_GRADIENT[type][1] : TOTEM_ELEMENT_KEY[type];
  const darkPalette = DARK_PALETTE[elementKey];
  const accentColor = dark
    ? darkPalette.accent
    : isHybrid
      ? ELEMENT_PALETTE[HYBRID_GRADIENT[type][1]].accent
      : palette.accent;
  const inkColor = dark
    ? darkPalette.ink
    : isHybrid
      ? ELEMENT_PALETTE[HYBRID_GRADIENT[type][1]].ink
      : palette.ink;
  const sideAccent = dark
    ? darkPalette.accent
    : isHybrid
      ? ELEMENT_PALETTE[HYBRID_GRADIENT[type][1]].sideAccent
      : palette.sideAccent;
  const sideAccentLeft = dark
    ? darkPalette.accent
    : isHybrid
      ? ELEMENT_PALETTE[HYBRID_GRADIENT[type][1]].sideAccentLeft
      : palette.sideAccentLeft;
  const bg = dark
    ? DARK_BG
    : isHybrid
      ? ELEMENT_PALETTE[HYBRID_GRADIENT[type][1]].bg
      : palette.bg;
  const bgEdge = dark
    ? DARK_BG_EDGE
    : isHybrid
      ? ELEMENT_PALETTE[HYBRID_GRADIENT[type][1]].bgEdge
      : palette.bgEdge;

  // 径向渐变背景
  const cardStyle: React.CSSProperties = {
    backgroundImage: `radial-gradient(ellipse at center, ${bg} 0%, ${bgEdge} 80%, ${bgEdge} 100%)`,
  };

  return (
    <div
      className={`relative ${dims.card} ${dims.pad} rounded-3xl overflow-hidden flex flex-col items-center text-center ${className}`}
      style={{
        ...cardStyle,
      }}
    >
      {/* 顶部左右大圆装饰（呼应截图风格） */}
      <div
        className="absolute -left-12 -top-12 rounded-full pointer-events-none"
        style={{
          width: dims.ornamentSize,
          height: dims.ornamentSize,
          background: `radial-gradient(circle, ${sideAccentLeft}30 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -right-16 -top-16 rounded-full pointer-events-none"
        style={{
          width: dims.ornamentSize * 1.2,
          height: dims.ornamentSize * 1.2,
          background: `radial-gradient(circle, ${sideAccent}28 0%, transparent 70%)`,
        }}
      />
      {/* 底部光晕小圆 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-20 rounded-full pointer-events-none"
        style={{
          width: dims.ornamentSize * 1.4,
          height: dims.ornamentSize * 1.4,
          background: `radial-gradient(circle, ${bg} 0%, transparent 70%)`,
        }}
      />

      {/* label 角标（顶部居中） */}
      {label && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono z-10 backdrop-blur-sm"
          style={{
            background: dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.5)",
            color: inkColor,
            border: `0.5px solid ${accentColor}50`,
          }}
        >
          {labelText}
        </div>
      )}

      {/* 月相（顶部，居中偏上） */}
      <div className="relative mb-1" style={{ color: accentColor }}>
        <MoonComp size={dims.moon} />
      </div>

      {/* 图腾（视觉中心，最显眼） */}
      <div className="relative my-1" style={{ color: accentColor }}>
        <TotemComp size={dims.totem} />
      </div>

      {/* 元素小圆点装饰（图腾下方分隔） */}
      <div className="flex items-center gap-1.5 my-2">
        <span className="w-1 h-1 rounded-full" style={{ background: accentColor, opacity: 0.3 }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, opacity: 0.6 }} />
        <span className="w-2 h-2 rounded-full" style={{ background: accentColor, opacity: 1 }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, opacity: 0.6 }} />
        <span className="w-1 h-1 rounded-full" style={{ background: accentColor, opacity: 0.3 }} />
      </div>

      {/* 名字（display-serif 大字号，中文原型名） */}
      <h3 className={`display-serif ${dims.name} font-bold leading-tight`} style={{ color: inkColor }}>
        {getCnName(type)}
      </h3>

      {/* 副行：序号 · 主型名 */}
      <p className={`${dims.indexFont} mt-1 mb-2 font-mono tracking-wider`} style={{ color: accentColor, opacity: 0.75 }}>
        {phaseLabel} · {isHybrid ? `${mainName} ~ ${tailName}` : mainName}
      </p>

      {/* tagline — 核心钩子句，前缀一个元素小图标 */}
      <div className="flex items-start gap-1.5 mb-3 px-2 max-w-full">
        <span className="mt-0.5 flex-shrink-0" style={{ color: accentColor }}>
          <ElementComp size={dims.element - 2} />
        </span>
        <p className={`${size === "sm" ? "text-[11px]" : "text-[12px]"} leading-relaxed line-clamp-2 text-left`} style={{ color: inkColor }}>
          {getTagline(type)}
        </p>
      </div>

      {/* 意象副标 — 一行小字，纯中文（被细边框包住） */}
      <div className="w-full mt-auto pt-2 pb-1 px-2 rounded-md" style={{
        border: `0.5px solid ${accentColor}35`,
        background: dark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.25)",
        backdropFilter: "blur(2px)",
      }}>
        <div className="flex items-center justify-center gap-2">
          <span className={`${dims.indexFont} font-mono tracking-wider`} style={{ color: accentColor }}>{descriptor.title}</span>
          <span className={`${dims.indexFont} font-mono tracking-wider`} style={{ color: inkColor, opacity: 0.6 }}>· {descriptor.sub}</span>
        </div>
      </div>

      {/* 匹配度可选脚注 */}
      {matchScore !== undefined && (
        <p className={`${dims.indexFont} font-mono mt-1.5`} style={{ color: inkColor, opacity: 0.5 }}>匹配度 {matchScore}%</p>
      )}
    </div>
  );
}

// 月相序号 helper
function monthNum(t: PersonalityType): number {
  return TOTEM_MOON_PHASE[t].phaseIndex;
}

function toCnNum(n: number): string {
  if (Number.isInteger(n)) {
    const cn = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    if (n <= 10) return cn[n];
    if (n < 20) return "十" + cn[n - 10];
    return n.toString();
  }
  return toCnNum(Math.round(n));
}

function getCnName(type: PersonalityType): string {
  const map: Record<string, string> = {
    strategist: "战略家", explorer: "探索者", leader: "掌控者", observer: "观察者",
    creator: "创造者", coordinator: "协调者", guardian: "守护者", doer: "行动派",
    dark_reef: "暗礁", spark: "引子", departure: "启程者", scout: "探路者",
    drifter: "漫游者", glimmer: "微光", whole: "全貌者",
    dark_reef__spark: "暗礁·引子", spark__departure: "引子·启程",
    departure__scout: "启程·探路", scout__drifter: "探路·漫游",
    drifter__glimmer: "漫游·微光", glimmer__strategist: "微光·战略家",
    strategist__observer: "战略家·观察者", observer__guardian: "观察者·守护者",
    guardian__coordinator: "守护者·协调者", coordinator__creator: "协调者·创造者",
    creator__explorer: "创造者·探索者", explorer__doer: "探索者·行动派",
    doer__leader: "行动派·掌控者", leader__whole: "掌控者·全貌",
  };
  return map[type] || type;
}

function getTagline(type: PersonalityType): string {
  const map: Record<string, string> = {
    strategist: "你不是不需要别人，而是更习惯先依靠自己的判断。",
    explorer: "比起稳定，更让你兴奋的是「还没走过的那条路」。",
    leader: "你习惯把方向握在自己手里。",
    observer: "你看得很多、说得很稳。",
    creator: "你没办法对「和别人一样」保持长久的热情。",
    coordinator: "你擅长让不同的人在同一个目标下各自舒服。",
    guardian: "你愿意为了一个值得的人或事，把自己放在第二位。",
    doer: "比起想清楚再动，你更相信「先动起来再调整」。",
    dark_reef: "你低调的存在，是别人在水下看不见的那块支点。",
    spark: "再小的一个动作，也可以点燃后来的一整片天。",
    departure: "比起说走就走，你更擅长把第一步走得稳稳当当。",
    scout: "你很少站在最前面，但你总是知道路在哪里。",
    drifter: "你不在一个世界里，而是站在几片世界的边缘。",
    glimmer: "你不需要大声，也能照到别人没注意到的角落。",
    whole: "你看见的是整件事的来龙去脉。",
    dark_reef__spark: "你是一块暗礁，但某天也会被一个微小的动作点燃。",
    spark__departure: "你手里已经握着一个引子，第一步也即将迈出。",
    departure__scout: "你已经在路上，但也开始用理性的眼光审视地图。",
    scout__drifter: "你既看得清路，又被几条路分别吸引。",
    drifter__glimmer: "你站在几片世界之间，但慢慢学会用微光照角落。",
    glimmer__strategist: "你的直觉得到结构的支撑。",
    strategist__observer: "你会先判断，但你也会先看着。",
    observer__guardian: "你看见得更多，也开始为人把自己放在第二位。",
    guardian__coordinator: "你为某人守，也开始把几个值得的人调到同一个频道上。",
    coordinator__creator: "你擅长让人舒服，但开始无法对「和别人一样」保持长久的热情。",
    creator__explorer: "你的原创冲动遇上还没走过的那条路。",
    explorer__doer: "你爱那条没走过的路，也相信「先动起来再调整」。",
    doer__leader: "你先动起来，也开始把方向握在自己手里。",
    leader__whole: "你握住方向，也开始看见整件事的来龙去脉。",
  };
  return map[type] || "";
}

/** 三联卡：primary + secondary + hidden 横向展示 */
export function PersonalityCardRow({
  primary,
  secondary,
  hidden,
  userScores,
  size = "md",
}: {
  primary: PersonalityType;
  secondary: PersonalityType;
  hidden: PersonalityType;
  userScores?: Partial<Record<PersonalityDimension, number>>;
  size?: CardSize;
}) {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <PersonalityCard type={primary} userScores={userScores} size={size} label="primary" />
      <PersonalityCard type={secondary} userScores={userScores} size={size} label="secondary" />
      <PersonalityCard type={hidden} userScores={userScores} size={size} label="hidden" />
    </div>
  );
}