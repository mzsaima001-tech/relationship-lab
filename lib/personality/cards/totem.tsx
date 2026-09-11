// =====================================================
// 人格测试 — 15 原型专属图腾（SVG 矢量）
// 核心设计：中国阴历十五月相对应 15 原型
// 每张原型卡 SVG 图腾 = 该原型的月相形态 + 个性符号
// 设计原则：极简几何 + 月相 + 单色 + 与塔罗明确不同
// =====================================================

import type { PersonalityType } from "../types";

// -----------------------------------------------------------
// 月相 SVG 形态（初一→十五） — 15 个独立形态
// 用半圆叠加表达盈亏过程。月相序号=月序（初一=1 ... 十五=15）
// -----------------------------------------------------------

export const TOTEM_MOON_PHASE: Record<PersonalityType, { glyph: string; en: string; cn: string; phaseIndex: number }> = {
  dark_reef: { glyph: "●", en: "Day 1 · New Moon", cn: "初一 · 朔月", phaseIndex: 1 },
  spark: { glyph: "◐", en: "Day 2 · Waxing Crescent", cn: "初二 · 极细娥眉", phaseIndex: 2 },
  departure: { glyph: "◑", en: "Day 3 · Waxing Crescent", cn: "初三 · 娥眉月", phaseIndex: 3 },
  scout: { glyph: "◒", en: "Day 4 · Waxing Crescent", cn: "初四 · 渐盈娥眉", phaseIndex: 4 },
  drifter: { glyph: "◓", en: "Day 5 · Waxing Crescent", cn: "初五 · 上蛾眉月", phaseIndex: 5 },
  glimmer: { glyph: "◔", en: "Day 6 · Waxing Crescent", cn: "初六 · 盈眉月", phaseIndex: 6 },
  strategist: { glyph: "◐", en: "Day 7 · First Quarter", cn: "初七 · 上弦月", phaseIndex: 7 },
  observer: { glyph: "◑", en: "Day 8 · Waxing Gibbous", cn: "初八 · 盈凸月", phaseIndex: 8 },
  guardian: { glyph: "◒", en: "Day 9 · Waxing Gibbous", cn: "初九 · 凸月", phaseIndex: 9 },
  coordinator: { glyph: "◓", en: "Day 10 · Waxing Gibbous", cn: "初十 · 渐满凸月", phaseIndex: 10 },
  creator: { glyph: "◔", en: "Day 11 · Waxing Gibbous", cn: "十一 · 接近满月", phaseIndex: 11 },
  explorer: { glyph: "○", en: "Day 12 · Full-ish", cn: "十二 · 凸圆月", phaseIndex: 12 },
  doer: { glyph: "◐", en: "Day 13 · Waning Gibbous", cn: "十三 · 微亏凸月", phaseIndex: 13 },
  leader: { glyph: "◑", en: "Day 14 · Waning Gibbous", cn: "十四 · 亏凸月", phaseIndex: 14 },
  whole: { glyph: "●", en: "Day 15 · Full Moon", cn: "十五 · 满月（望）", phaseIndex: 15 },
  // ---- 14 过渡型月相 ----
  dark_reef__spark:     { glyph: "半", en: "过渡 · 暗礁→引子",     cn: "过渡 · 暗礁→引子",     phaseIndex: 11.5 },
  spark__departure:     { glyph: "半", en: "过渡 · 引子→启程",     cn: "过渡 · 引子→启程",     phaseIndex: 12.5 },
  departure__scout:     { glyph: "半", en: "过渡 · 启程→探路",     cn: "过渡 · 启程→探路",     phaseIndex: 13.5 },
  scout__drifter:       { glyph: "半", en: "过渡 · 探路→漫游",     cn: "过渡 · 探路→漫游",     phaseIndex: 14.5 },
  drifter__glimmer:     { glyph: "半", en: "过渡 · 漫游→微光",     cn: "过渡 · 漫游→微光",     phaseIndex: 15.5 },
  glimmer__strategist:  { glyph: "半", en: "过渡 · 微光→战略家",   cn: "过渡 · 微光→战略家",   phaseIndex: 16.5 },
  strategist__observer: { glyph: "半", en: "过渡 · 战略家→观察者", cn: "过渡 · 战略家→观察者", phaseIndex: 17.5 },
  observer__guardian:   { glyph: "半", en: "过渡 · 观察者→守护者", cn: "过渡 · 观察者→守护者", phaseIndex: 18.5 },
  guardian__coordinator:{ glyph: "半", en: "过渡 · 守护者→协调者", cn: "过渡 · 守护者→协调者", phaseIndex: 19.5 },
  coordinator__creator: { glyph: "半", en: "过渡 · 协调者→创造者", cn: "过渡 · 协调者→创造者", phaseIndex: 20.5 },
  creator__explorer:    { glyph: "半", en: "过渡 · 创造者→探索者", cn: "过渡 · 创造者→探索者", phaseIndex: 21.5 },
  explorer__doer:       { glyph: "半", en: "过渡 · 探索者→行动派", cn: "过渡 · 探索者→行动派", phaseIndex: 22.5 },
  doer__leader:         { glyph: "半", en: "过渡 · 行动派→掌控者", cn: "过渡 · 行动派→掌控者", phaseIndex: 23.5 },
  leader__whole:        { glyph: "半", en: "过渡 · 掌控者→全貌",   cn: "过渡 · 掌控者→全貌",   phaseIndex: 24.5 },
};

// -----------------------------------------------------------
// 月相形态 SVG 渲染（15 个）
// 用一个共同尺寸 viewBox 100x100，半圆叠加表达盈亏
// -----------------------------------------------------------

interface MoonProps { size?: number; color?: string; }

/** 初一 朔月 — 完全暗（实心黑圆 + 白边暗示存在） */
function Moon1({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="50" cy="50" r="40" stroke="none" opacity="0.25" />
      <circle cx="50" cy="50" r="40" stroke={color} opacity="0.4" fill="none" />
      <circle cx="50" cy="50" r="34" fill={color} fillOpacity="0.85" stroke="none" />
    </svg>
  );
}

/** 极细娥眉（月序 2）— 左 1/4 实心弧，其余空 */
function Moon2({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 0 50 90 A 8 40 0 0 1 50 10" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 渐盈娥眉（月序 3）— 略增亮区 */
function Moon3({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 0 50 90 A 18 40 0 0 1 50 10" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 渐盈（月序 4）— 半圆亮 ~30% */
function Moon4({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 0 50 90 A 28 40 0 0 1 50 10" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 上蛾眉（月序 5）— 接近半圆 */
function Moon5({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 0 50 90 A 34 40 0 0 1 50 10" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 盈眉（月序 6）— 略偏过上弦 */
function Moon6({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 0 50 90 A 38 40 0 0 1 50 10" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 上弦（月序 7）— 右半亮，vertical separator */
function Moon7({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 1 50 90 Z" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 盈凸（月序 8）— 50% 亮到 75% 亮 */
function Moon8({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 1 50 90 A 28 40 0 0 0 50 10 Z" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 凸（月序 9）— 80% 亮 */
function Moon9({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 1 50 90 A 20 40 0 0 0 50 10 Z" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 渐满凸（月序 10）— 90% 亮 */
function Moon10({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 1 50 90 A 14 40 0 0 0 50 10 Z" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 接近满（月序 11）— 96% 亮 */
function Moon11({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 1 50 90 A 8 40 0 0 0 50 10 Z" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 凸圆（月序 12）— 几乎满，左侧一根细影 */
function Moon12({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <path d="M 50 10 A 40 40 0 0 1 50 90 A 4 40 0 0 0 50 10 Z" fill={color} fillOpacity="0.9" stroke="none" />
    </svg>
  );
}

/** 微亏凸（月序 13）— 满月右侧缺一丝 */
function Moon13({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <circle cx="50" cy="50" r="40" fill={color} fillOpacity="0.9" stroke="none" />
      <circle cx="62" cy="50" r="36" fill="var(--bg-dark, #f7f3eb)" fillOpacity="1" stroke="none" />
    </svg>
  );
}

/** 亏凸（月序 14）— 满月右侧缺口变大 */
function Moon14({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="40" opacity="0.25" />
      <circle cx="50" cy="50" r="40" fill={color} fillOpacity="0.9" stroke="none" />
      <circle cx="68" cy="50" r="28" fill="var(--bg-dark, #f7f3eb)" fillOpacity="1" stroke="none" />
    </svg>
  );
}

/** 满月 望（月序 15）— 实心全圆 */
function Moon15({ size = 60, color = "currentColor" }: MoonProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2">
      <circle cx="50" cy="50" r="44" opacity="0.2" />
      <circle cx="50" cy="50" r="40" fill={color} fillOpacity="0.95" stroke="none" />
      <circle cx="50" cy="50" r="40" />
      {/* 满月光晕 */}
      <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="0.5" opacity="0.35" strokeDasharray="2 3" />
    </svg>
  );
}

/** 14 过渡型月相：前后两型月相 SVG 叠加（前 60% + 后 40%） */
function HybridMoon(
  LeftComp: (p: MoonProps) => React.JSX.Element,
  RightComp: (p: MoonProps) => React.JSX.Element
) {
  return ({ size = 60, color = "currentColor" }: MoonProps) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <g opacity="0.6">
        <LeftComp size={100} color={color} />
      </g>
      <g opacity="0.45">
        <RightComp size={100} color={color} />
      </g>
      {/* 标记是过渡 */}
      <line x1="50" y1="2" x2="50" y2="10" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="90" x2="50" y2="98" stroke={color} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export const MOON_PHASE_MAP: Record<PersonalityType, (p: MoonProps) => React.JSX.Element> = {
  dark_reef: Moon1,
  spark: Moon2,
  departure: Moon3,
  scout: Moon4,
  drifter: Moon5,
  glimmer: Moon6,
  strategist: Moon7,
  observer: Moon8,
  guardian: Moon9,
  coordinator: Moon10,
  creator: Moon11,
  explorer: Moon12,
  doer: Moon13,
  leader: Moon14,
  whole: Moon15,
  // ---- 14 过渡型月相 ----
  dark_reef__spark:     HybridMoon(Moon1,  Moon2),
  spark__departure:     HybridMoon(Moon2,  Moon3),
  departure__scout:     HybridMoon(Moon3,  Moon4),
  scout__drifter:       HybridMoon(Moon4,  Moon5),
  drifter__glimmer:     HybridMoon(Moon5,  Moon6),
  glimmer__strategist:  HybridMoon(Moon6,  Moon7),
  strategist__observer: HybridMoon(Moon7,  Moon8),
  observer__guardian:   HybridMoon(Moon8,  Moon9),
  guardian__coordinator:HybridMoon(Moon9,  Moon10),
  coordinator__creator: HybridMoon(Moon10, Moon11),
  creator__explorer:    HybridMoon(Moon11, Moon12),
  explorer__doer:       HybridMoon(Moon12, Moon13),
  doer__leader:         HybridMoon(Moon13, Moon14),
  leader__whole:        HybridMoon(Moon14, Moon15),
};

// -----------------------------------------------------------
// 原型专属符号图腾（与月相独立，叠加在原型卡中央）
// 15 个独立几何符号，绝不重复
// -----------------------------------------------------------

interface TotemProps { size?: number; color?: string; }
const SW = 1.8;

// 初一暗礁：水下暗礁波形 + 锚链（"看不见的稳"+海底锚）
export function DarkReefTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 海面线 + 气泡 */}
      <line x1="6" y1="20" x2="94" y2="20" opacity="0.5" />
      <circle cx="20" cy="14" r="1.5" fill={color} stroke="none" opacity="0.4" />
      <circle cx="78" cy="12" r="1" fill={color} stroke="none" opacity="0.4" />
      {/* 锚主体（海底支点的最强意象） */}
      <line x1="50" y1="32" x2="50" y2="78" />
      <line x1="38" y1="40" x2="62" y2="40" />
      <line x1="42" y1="40" x2="42" y2="50" />
      <line x1="58" y1="40" x2="58" y2="50" />
      <path d="M 30 64 Q 50 84, 70 64" />
      <line x1="30" y1="64" x2="26" y2="74" />
      <line x1="70" y1="64" x2="74" y2="74" />
      {/* 水下暗礁叠层 */}
      <path d="M 22 86 L 16 94 L 28 94 Z" opacity="0.7" />
      <path d="M 50 84 L 42 94 L 58 94 Z" opacity="0.7" />
      <path d="M 78 86 L 72 94 L 84 94 Z" opacity="0.7" />
    </svg>
  );
}

// 初二引子：一粒火星 + 引线 + 火花辐射
export function SparkTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 中央火星 */}
      <circle cx="50" cy="50" r="8" fill={color} stroke="none" />
      <path d="M 50 42 C 46 46, 44 50, 50 50 C 56 50, 54 46, 50 42" fill="white" fillOpacity="0.7" stroke="none" />
      {/* 引线 4 向（带火花） */}
      <line x1="50" y1="42" x2="50" y2="18" />
      <line x1="50" y1="58" x2="50" y2="82" />
      <line x1="42" y1="50" x2="18" y2="50" />
      <line x1="58" y1="50" x2="82" y2="50" />
      {/* 末端十字星 */}
      <line x1="46" y1="14" x2="54" y2="22" />
      <line x1="54" y1="14" x2="46" y2="22" />
      <line x1="46" y1="86" x2="54" y2="78" />
      <line x1="54" y1="86" x2="46" y2="78" />
      <line x1="14" y1="46" x2="22" y2="54" />
      <line x1="14" y1="54" x2="22" y2="46" />
      <line x1="86" y1="46" x2="78" y2="54" />
      <line x1="86" y1="54" x2="78" y2="46" />
      {/* 四角小火星点 */}
      <circle cx="14" cy="20" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="86" cy="20" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="14" cy="80" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="86" cy="80" r="1.5" fill={color} stroke="none" opacity="0.6" />
    </svg>
  );
}

// 初三启程：远山轮廓 + 升起太阳 + 脚印虚线
export function DepartureTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 远山叠层 */}
      <path d="M 10 70 L 28 50 L 42 64 L 60 42 L 78 60 L 90 70" />
      <path d="M 10 80 L 20 70 L 36 78 L 56 68 L 72 78 L 90 70" opacity="0.5" />
      {/* 升起太阳 */}
      <circle cx="50" cy="42" r="9" fill={color} fillOpacity="0.15" stroke={color} />
      <line x1="50" y1="26" x2="50" y2="30" opacity="0.6" />
      <line x1="34" y1="42" x2="38" y2="42" opacity="0.6" />
      <line x1="62" y1="42" x2="66" y2="42" opacity="0.6" />
      <line x1="39" y1="31" x2="42" y2="34" opacity="0.5" />
      <line x1="58" y1="34" x2="61" y2="31" opacity="0.5" />
      {/* 地平线 + 虚线脚印 */}
      <line x1="6" y1="86" x2="94" y2="86" />
      <g opacity="0.7">
        <ellipse cx="22" cy="92" rx="3" ry="1.5" fill={color} stroke="none" />
        <ellipse cx="36" cy="92" rx="3" ry="1.5" fill={color} stroke="none" />
        <ellipse cx="50" cy="92" rx="3" ry="1.5" fill={color} stroke="none" />
        <ellipse cx="64" cy="92" rx="3" ry="1.5" fill={color} stroke="none" />
        <ellipse cx="78" cy="92" rx="3" ry="1.5" fill={color} stroke="none" />
      </g>
    </svg>
  );
}

// 初四探路：望远镜 + 山脉十字星（"未见于前"）
export function ScoutTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 望远镜主体（带镜筒） */}
      <path d="M 14 44 L 50 36 L 50 70 L 14 62 Z" />
      <rect x="50" y="38" width="14" height="30" />
      <line x1="56" y1="38" x2="56" y2="68" opacity="0.5" />
      {/* 视野辐射 + 远十字 */}
      <line x1="68" y1="46" x2="84" y2="38" opacity="0.6" />
      <line x1="68" y1="54" x2="88" y2="54" opacity="0.6" />
      <line x1="68" y1="62" x2="84" y2="70" opacity="0.6" />
      <line x1="80" y1="50" x2="92" y2="50" opacity="0.4" />
      {/* 远处目标十字星 */}
      <g opacity="0.7">
        <line x1="86" y1="22" x2="86" y2="32" />
        <line x1="81" y1="27" x2="91" y2="27" />
      </g>
      <g opacity="0.5">
        <line x1="74" y1="14" x2="74" y2="20" />
        <line x1="71" y1="17" x2="77" y2="17" />
      </g>
      {/* 三角架 */}
      <line x1="30" y1="62" x2="22" y2="92" />
      <line x1="40" y1="62" x2="48" y2="92" />
      <line x1="22" y1="92" x2="48" y2="92" opacity="0.4" />
    </svg>
  );
}

// 初五漫游：风筝 + 飘线 + 鸟群（"立于界间"）
export function DrifterTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 风筝菱形 */}
      <path d="M 30 18 L 56 26 L 44 56 L 24 42 Z" />
      <line x1="30" y1="18" x2="34" y2="46" opacity="0.6" />
      <line x1="56" y1="26" x2="34" y2="46" opacity="0.6" />
      <line x1="24" y1="42" x2="34" y2="46" opacity="0.6" />
      <line x1="44" y1="56" x2="34" y2="46" opacity="0.6" />
      {/* 飘线 */}
      <path d="M 34 46 Q 48 60, 60 72 Q 74 84, 86 92" strokeDasharray="2 3" opacity="0.7" />
      {/* 远鸟 */}
      <path d="M 70 16 Q 74 12, 78 16 Q 82 12, 86 16" opacity="0.6" />
      <path d="M 76 26 Q 79 23, 82 26 Q 85 23, 88 26" opacity="0.5" />
      <path d="M 14 30 Q 17 27, 20 30 Q 23 27, 26 30" opacity="0.5" />
      {/* 云 */}
      <path d="M 56 70 Q 62 66, 68 70 Q 74 68, 76 72" opacity="0.4" />
    </svg>
  );
}

// 初六微光：手握蜡烛 + 烛光散射（"照到角落"）
export function GlimmerTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 手（底） */}
      <path d="M 30 90 L 36 70 L 40 68 L 44 72 L 56 72 L 60 68 L 64 70 L 70 90 Z" />
      {/* 蜡烛 */}
      <line x1="50" y1="68" x2="50" y2="56" />
      <rect x="44" y="56" width="12" height="14" />
      {/* 烛芯 */}
      <path d="M 50 56 C 48 50, 52 46, 50 38 C 50 46, 48 50, 50 56" />
      {/* 光晕 3 圈 */}
      <circle cx="50" cy="32" r="6" fill={color} fillOpacity="0.15" stroke="none" />
      <circle cx="50" cy="32" r="10" opacity="0.5" />
      <circle cx="50" cy="32" r="14" opacity="0.3" />
      {/* 八向光线 */}
      <line x1="50" y1="14" x2="50" y2="20" />
      <line x1="36" y1="20" x2="40" y2="24" />
      <line x1="64" y1="20" x2="60" y2="24" />
      <line x1="30" y1="32" x2="36" y2="32" />
      <line x1="64" y1="32" x2="70" y2="32" />
      {/* 周边星点 */}
      <line x1="18" y1="42" x2="22" y2="46" opacity="0.6" />
      <line x1="82" y1="42" x2="78" y2="46" opacity="0.6" />
      <line x1="20" y1="56" x2="24" y2="56" opacity="0.5" />
      <line x1="80" y1="56" x2="76" y2="56" opacity="0.5" />
    </svg>
  );
}

// 初七战略家：罗盘 + 玫瑰星 + 棋盘格点
export function StrategistTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 外双圈 */}
      <circle cx="50" cy="50" r="42" />
      <circle cx="50" cy="50" r="38" opacity="0.4" />
      <circle cx="50" cy="50" r="26" />
      {/* 罗盘十字 */}
      <line x1="50" y1="10" x2="50" y2="90" />
      <line x1="10" y1="50" x2="90" y2="50" />
      {/* 四向 N/E/S/W 小三角标记 */}
      <polygon points="50,18 46,24 54,24" fill={color} stroke="none" />
      <polygon points="82,50 76,46 76,54" fill={color} stroke="none" />
      <polygon points="50,82 46,76 54,76" fill={color} stroke="none" />
      <polygon points="18,50 24,46 24,54" fill={color} stroke="none" />
      {/* 中心八角星 */}
      <polygon points="50,38 53,47 62,44 56,52 62,60 53,57 50,66 47,57 38,60 44,52 38,44 47,47" fill={color} stroke="none" opacity="0.7" />
    </svg>
  );
}

// 初八观察者：眼睛 + 睫毛 + 三道目光
export function ObserverTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 眼轮廓 */}
      <path d="M 10 50 Q 50 22, 90 50 Q 50 78, 10 50 Z" />
      {/* 睫毛（上下） */}
      <line x1="20" y1="38" x2="14" y2="32" opacity="0.6" />
      <line x1="32" y1="32" x2="28" y2="24" opacity="0.6" />
      <line x1="50" y1="28" x2="50" y2="20" opacity="0.6" />
      <line x1="68" y1="32" x2="72" y2="24" opacity="0.6" />
      <line x1="80" y1="38" x2="86" y2="32" opacity="0.6" />
      {/* 瞳孔双圈 + 中心 */}
      <circle cx="50" cy="50" r="16" />
      <circle cx="50" cy="50" r="8" fill={color} fillOpacity="0.15" />
      <circle cx="50" cy="50" r="3.5" fill={color} stroke="none" />
      {/* 目光三向 */}
      <line x1="6" y1="50" x2="14" y2="50" opacity="0.4" />
      <line x1="86" y1="50" x2="94" y2="50" opacity="0.4" />
      {/* 眉 */}
      <path d="M 22 16 Q 50 6, 78 16" opacity="0.7" />
    </svg>
  );
}

// 初九守护者：盾 + 十字 + 内立剑
export function GuardianTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 盾轮廓 */}
      <path d="M50 8 L 86 20 L 86 56 Q 86 80, 50 94 Q 14 80, 14 56 L 14 20 Z" />
      {/* 盾内十字 */}
      <line x1="50" y1="28" x2="50" y2="74" />
      <line x1="32" y1="48" x2="68" y2="48" />
      <line x1="36" y1="60" x2="64" y2="60" />
      {/* 中心剑形 */}
      <polygon points="50,32 53,52 50,50 47,52" fill={color} stroke="none" />
      <polygon points="50,66 53,52 50,54 47,52" fill="none" />
      {/* 顶部宝石 */}
      <circle cx="50" cy="20" r="2" fill={color} stroke="none" />
    </svg>
  );
}

// 初十协调者：三圆连接 + 中央节点 + 关系网
export function CoordinatorTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 三角连线 */}
      <line x1="50" y1="20" x2="22" y2="68" />
      <line x1="50" y1="20" x2="78" y2="68" />
      <line x1="22" y1="68" x2="78" y2="68" />
      {/* 三圆节点 */}
      <circle cx="50" cy="20" r="10" />
      <circle cx="22" cy="68" r="10" />
      <circle cx="78" cy="68" r="10" />
      {/* 节点中心点 */}
      <circle cx="50" cy="20" r="2.5" fill={color} stroke="none" />
      <circle cx="22" cy="68" r="2.5" fill={color} stroke="none" />
      <circle cx="78" cy="68" r="2.5" fill={color} stroke="none" />
      {/* 外圈连线（网络感） */}
      <line x1="50" y1="10" x2="50" y2="6" opacity="0.5" />
      <line x1="22" y1="78" x2="18" y2="82" opacity="0.5" />
      <line x1="78" y1="78" x2="82" y2="82" opacity="0.5" />
      <line x1="14" y1="68" x2="10" y2="68" opacity="0.5" />
      <line x1="86" y1="68" x2="90" y2="68" opacity="0.5" />
    </svg>
  );
}

// 十一创造者：手 + 火焰 + 羽毛笔
export function CreatorTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 中心火焰 */}
      <path d="M50 14 C 36 30, 34 50, 46 64 C 40 56, 46 48, 50 42 C 50 56, 62 58, 58 70 C 72 64, 76 50, 64 38 C 68 46, 64 54, 56 54 C 62 46, 58 30, 50 14 Z" fill={color} fillOpacity="0.18" />
      <path d="M50 14 C 36 30, 34 50, 46 64 C 40 56, 46 48, 50 42 C 50 56, 62 58, 58 70 C 72 64, 76 50, 64 38 C 68 46, 64 54, 56 54 C 62 46, 58 30, 50 14 Z" />
      {/* 左羽毛笔 */}
      <line x1="20" y1="86" x2="34" y2="60" />
      <path d="M 34 60 L 24 56 L 22 64 Z" fill={color} stroke="none" opacity="0.7" />
      <path d="M 30 64 L 24 60" opacity="0.5" />
      <path d="M 28 70 L 22 66" opacity="0.5" />
      {/* 右羽毛笔 */}
      <line x1="80" y1="86" x2="66" y2="60" />
      <path d="M 66 60 L 76 56 L 78 64 Z" fill={color} stroke="none" opacity="0.7" />
      <path d="M 70 64 L 76 60" opacity="0.5" />
      <path d="M 72 70 L 78 66" opacity="0.5" />
      {/* 底部三连星 */}
      <circle cx="34" cy="86" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="50" cy="90" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="66" cy="86" r="1.5" fill={color} stroke="none" opacity="0.6" />
    </svg>
  );
}

// 十二探索者：罗盘星 + 山脉路径 + 远方三角
export function ExplorerTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 远山 */}
      <path d="M 8 60 L 24 42 L 36 56 L 50 36 L 66 54 L 80 42 L 92 60" />
      <path d="M 8 76 L 20 64 L 32 72 L 46 60 L 60 72 L 76 64 L 92 76" opacity="0.5" />
      {/* 路径虚线（弯弯的山路） */}
      <path d="M 12 86 Q 30 80, 46 84 T 88 80" strokeDasharray="3 4" opacity="0.7" />
      {/* 上方指北星 */}
      <g opacity="0.8">
        <line x1="50" y1="10" x2="50" y2="22" />
        <line x1="44" y1="16" x2="56" y2="16" />
        <line x1="46" y1="12" x2="54" y2="20" />
        <line x1="54" y1="12" x2="46" y2="20" />
      </g>
      {/* 飞鸟群 */}
      <path d="M 14 26 Q 18 22, 22 26" opacity="0.6" />
      <path d="M 76 22 Q 80 18, 84 22" opacity="0.5" />
      {/* 终点三角旗 */}
      <line x1="84" y1="58" x2="84" y2="50" />
      <polygon points="84,50 92,53 84,56" fill={color} stroke="none" opacity="0.7" />
    </svg>
  );
}

// 十三行动派：闪电 + 速度线 + 落地爆点
export function DoerTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 闪电主形 */}
      <polygon points="58,8 30,54 48,54 40,92 74,40 56,40 64,8" fill={color} fillOpacity="0.2" />
      <polygon points="58,8 30,54 48,54 40,92 74,40 56,40 64,8" />
      {/* 速度线（左/右/下） */}
      <line x1="14" y1="36" x2="22" y2="44" opacity="0.7" />
      <line x1="10" y1="50" x2="20" y2="54" opacity="0.7" />
      <line x1="86" y1="36" x2="78" y2="44" opacity="0.7" />
      <line x1="90" y1="50" x2="80" y2="54" opacity="0.7" />
      {/* 落地爆点星 */}
      <g opacity="0.8">
        <line x1="22" y1="84" x2="22" y2="92" />
        <line x1="18" y1="88" x2="26" y2="88" />
      </g>
      <g opacity="0.7">
        <line x1="78" y1="84" x2="78" y2="92" />
        <line x1="74" y1="88" x2="82" y2="88" />
      </g>
      <g opacity="0.6">
        <line x1="50" y1="86" x2="50" y2="94" />
      </g>
    </svg>
  );
}

// 十四掌控者：王座/权杖（核心权力象征）+ 王冠 + 三宝玉
export function LeaderTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 王冠主体 */}
      <path d="M16 50 L 24 18 L 36 38 L 50 10 L 64 38 L 76 18 L 84 50 Z" />
      {/* 王冠底座 */}
      <rect x="14" y="50" width="72" height="6" />
      <line x1="18" y1="60" x2="82" y2="60" opacity="0.5" />
      {/* 三颗宝珠 */}
      <circle cx="50" cy="10" r="3.5" fill={color} stroke="none" />
      <circle cx="24" cy="20" r="2.5" fill={color} stroke="none" />
      <circle cx="76" cy="20" r="2.5" fill={color} stroke="none" />
      {/* 权杖（垂直+球顶） */}
      <line x1="50" y1="60" x2="50" y2="92" />
      <circle cx="50" cy="88" r="3" fill={color} stroke="none" />
      <line x1="44" y1="74" x2="56" y2="74" opacity="0.5" />
      <line x1="44" y1="80" x2="56" y2="80" opacity="0.5" />
      {/* 双侧斜光 */}
      <line x1="8" y1="32" x2="14" y2="36" opacity="0.4" />
      <line x1="92" y1="32" x2="86" y2="36" opacity="0.4" />
    </svg>
  );
}

// 十五全貌者：圆环 + 中央圆 + 环绕双环 + 中心"全"字意象
export function WholeTotem({ size = 80, color = "currentColor" }: TotemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* 外大圆 */}
      <circle cx="50" cy="50" r="44" />
      <circle cx="50" cy="50" r="40" opacity="0.5" />
      <circle cx="50" cy="50" r="32" opacity="0.7" />
      {/* 中心"全"字意象（三横） */}
      <line x1="38" y1="42" x2="62" y2="42" />
      <line x1="38" y1="50" x2="62" y2="50" />
      <line x1="38" y1="58" x2="62" y2="58" />
      {/* 中心交汇点 */}
      <circle cx="50" cy="50" r="4" fill={color} stroke="none" />
      {/* 八向光芒 */}
      <line x1="50" y1="2" x2="50" y2="6" opacity="0.5" />
      <line x1="50" y1="94" x2="50" y2="98" opacity="0.5" />
      <line x1="2" y1="50" x2="6" y2="50" opacity="0.5" />
      <line x1="94" y1="50" x2="98" y2="50" opacity="0.5" />
      {/* 四角光点 */}
      <circle cx="20" cy="20" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="80" cy="20" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="20" cy="80" r="1.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="80" cy="80" r="1.5" fill={color} stroke="none" opacity="0.6" />
    </svg>
  );
}

export const TOTEM_MAP: Record<PersonalityType, (p: TotemProps) => React.JSX.Element> = {
  dark_reef: DarkReefTotem,
  spark: SparkTotem,
  departure: DepartureTotem,
  scout: ScoutTotem,
  drifter: DrifterTotem,
  glimmer: GlimmerTotem,
  strategist: StrategistTotem,
  observer: ObserverTotem,
  guardian: GuardianTotem,
  coordinator: CoordinatorTotem,
  creator: CreatorTotem,
  explorer: ExplorerTotem,
  doer: DoerTotem,
  leader: LeaderTotem,
  whole: WholeTotem,
  // ---- 14 过渡型图腾：HybridTotem 包装前后两图腾 ----
  dark_reef__spark:     HybridTotem(DarkReefTotem,    SparkTotem),
  spark__departure:     HybridTotem(SparkTotem,       DepartureTotem),
  departure__scout:     HybridTotem(DepartureTotem,   ScoutTotem),
  scout__drifter:       HybridTotem(ScoutTotem,       DrifterTotem),
  drifter__glimmer:     HybridTotem(DrifterTotem,     GlimmerTotem),
  glimmer__strategist:  HybridTotem(GlimmerTotem,     StrategistTotem),
  strategist__observer: HybridTotem(StrategistTotem,  ObserverTotem),
  observer__guardian:   HybridTotem(ObserverTotem,    GuardianTotem),
  guardian__coordinator:HybridTotem(GuardianTotem,    CoordinatorTotem),
  coordinator__creator: HybridTotem(CoordinatorTotem, CreatorTotem),
  creator__explorer:    HybridTotem(CreatorTotem,     ExplorerTotem),
  explorer__doer:       HybridTotem(ExplorerTotem,    DoerTotem),
  doer__leader:         HybridTotem(DoerTotem,        LeaderTotem),
  leader__whole:        HybridTotem(LeaderTotem,      WholeTotem),
};

// -----------------------------------------------------------
// 元素符号（六气，对应月相序）
// 曜=阳金（控制）/水（潜流）/火（点燃）/风（流动）/土（稳）/光（照亮）
// 每个原型对应一个"气"作为视觉点缀
// 曜=金/阳刚；水=暗下；火=点燃；风=流动；土=稳；光=照耀
// -----------------------------------------------------------
export type ElementKey = "曜" | "水" | "火" | "风" | "土" | "光";

interface ElementGlyphProps { size?: number; color?: string; }

/** 曜 — 金/阳刚，一竖三横（帝王、王冠之源） */
function Glyph曜({ size = 12, color = "currentColor" }: ElementGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="6" y1="7" x2="18" y2="7" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}
/** 水 — 三道水波（柔下、滋养） */
function Glyph水({ size = 12, color = "currentColor" }: ElementGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 6 Q 8 3, 12 6 T 21 6" />
      <path d="M3 12 Q 8 9, 12 12 T 21 12" />
      <path d="M3 18 Q 8 15, 12 18 T 21 18" />
    </svg>
  );
}
/** 火 — 一束上升的火焰（点燃、行动） */
function Glyph火({ size = 12, color = "currentColor" }: ElementGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 C 8 6, 7 11, 10 15 C 8 13, 9 11, 12 9 C 12 13, 16 14, 14 18 C 18 17, 19 12, 16 9 C 18 11, 16 13, 14 14 C 16 10, 14 6, 12 2 Z" />
    </svg>
  );
}
/** 风 — 三道弯曲气流（流动、自由） */
function Glyph风({ size = 12, color = "currentColor" }: ElementGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 6 Q 10 6, 14 6 T 21 6" />
      <path d="M3 12 Q 12 12, 16 12 T 21 12" />
      <path d="M3 18 Q 9 18, 13 18 T 21 18" />
    </svg>
  );
}
/** 土 — 一层平台 + 顶上一粒（承载、稳） */
function Glyph土({ size = 12, color = "currentColor" }: ElementGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 19 L 21 19" />
      <path d="M5 19 L 5 14 L 19 14 L 19 19" />
      <line x1="12" y1="14" x2="12" y2="6" />
      <polygon points="12,2 16,6 8,6" fill={color} stroke="none" />
    </svg>
  );
}
/** 光 — 中央圆 + 八向辐射（照亮、洞察） */
function Glyph光({ size = 12, color = "currentColor" }: ElementGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="7.5" y2="7.5" />
      <line x1="16.5" y1="16.5" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="7.5" y2="16.5" />
      <line x1="16.5" y1="7.5" x2="19.07" y2="4.93" />
    </svg>
  );
}

// -----------------------------------------------------------
// 元素色（六气色卡，渲染卡片底色用）
// 每色给 bg + accent + ink + highlight（圆形装饰色）+ sideAccent（左右圆辅色）
// 渲染时通过 radial-gradient 形成「中心高光 + 边缘柔和」效果
// -----------------------------------------------------------
export interface ElementPalette {
  /** 卡片中心色（最暖/最纯） */
  bg: string;
  /** 卡片边缘色（柔和/微冷）— 与中心同元素但更淡 */
  bgEdge: string;
  /** 右侧大圆辅色 */
  sideAccent: string;
  /** 左侧大圆辅色（更冷/更淡） */
  sideAccentLeft: string;
  /** 强调色（用于图腾/序号/连线） */
  accent: string;
  /** 深色（用于中文名） */
  ink: string;
  /** 元素名 */
  name: string;
}

export const ELEMENT_PALETTE: Record<ElementKey, ElementPalette> = {
  水: { bg: "#EEF3F7", bgEdge: "#E5E6F0", sideAccent: "#2D5F7C", sideAccentLeft: "#A0A8C0", accent: "#2D5F7C", ink: "#1A3D52", name: "水" },
  火: { bg: "#FCEDE3", bgEdge: "#F2E5EC", sideAccent: "#B8541E", sideAccentLeft: "#C8A0A0", accent: "#B8541E", ink: "#7A2E0E", name: "火" },
  风: { bg: "#EBF3EE", bgEdge: "#E5EBF2", sideAccent: "#3F7A56", sideAccentLeft: "#A0B8C0", accent: "#3F7A56", ink: "#214B33", name: "风" },
  光: { bg: "#FCF6E5", bgEdge: "#F2E5E5", sideAccent: "#9C7A1E", sideAccentLeft: "#C8B8A8", accent: "#9C7A1E", ink: "#5C4710", name: "光" },
  土: { bg: "#F2ECDE", bgEdge: "#E8E5DC", sideAccent: "#7A5A38", sideAccentLeft: "#A89A88", accent: "#7A5A38", ink: "#4A331C", name: "土" },
  曜: { bg: "#F5EAEA", bgEdge: "#EFE5EA", sideAccent: "#8C3A3A", sideAccentLeft: "#B89AA0", accent: "#8C3A3A", ink: "#561F1F", name: "曜" },
};

/** 原型 → 元素 key（与 TOTEM_ELEMENT_NAME 一致） */
export const TOTEM_ELEMENT_KEY: Record<PersonalityType, ElementKey> = {
  dark_reef: "水", spark: "火", departure: "风", scout: "光",
  drifter: "风", glimmer: "光", strategist: "曜", observer: "光",
  guardian: "土", coordinator: "土", creator: "火", explorer: "风",
  doer: "火", leader: "曜", whole: "光",
  // 过渡型：取后端驱动元素
  dark_reef__spark: "火", spark__departure: "风", departure__scout: "风",
  scout__drifter: "风", drifter__glimmer: "光", glimmer__strategist: "光",
  strategist__observer: "曜", observer__guardian: "土", guardian__coordinator: "土",
  coordinator__creator: "火", creator__explorer: "风", explorer__doer: "火",
  doer__leader: "曜", leader__whole: "光",
};

/** 过渡型 → 前后两元素的色对（用于左右对角渐变） */
export const HYBRID_GRADIENT: Record<PersonalityType, [ElementKey, ElementKey]> = {
  // 主型：单元素（前后相同）
  dark_reef: ["水", "水"], spark: ["火", "火"], departure: ["风", "风"], scout: ["光", "光"],
  drifter: ["风", "风"], glimmer: ["光", "光"], strategist: ["曜", "曜"], observer: ["光", "光"],
  guardian: ["土", "土"], coordinator: ["土", "土"], creator: ["火", "火"], explorer: ["风", "风"],
  doer: ["火", "火"], leader: ["曜", "曜"], whole: ["光", "光"],
  // 14 过渡型
  dark_reef__spark:     ["水", "火"],
  spark__departure:     ["火", "风"],
  departure__scout:     ["风", "光"],
  scout__drifter:       ["光", "风"],
  drifter__glimmer:     ["风", "光"],
  glimmer__strategist:  ["光", "曜"],
  strategist__observer: ["曜", "光"],
  observer__guardian:   ["光", "土"],
  guardian__coordinator:["土", "土"],
  coordinator__creator: ["土", "火"],
  creator__explorer:    ["火", "风"],
  explorer__doer:       ["风", "火"],
  doer__leader:         ["火", "曜"],
  leader__whole:        ["曜", "光"],
};

export const TOTEM_ELEMENT_MAP: Record<PersonalityType, (p: ElementGlyphProps) => React.JSX.Element> = {
  dark_reef: Glyph水, spark: Glyph火, departure: Glyph风, scout: Glyph光,
  drifter: Glyph风, glimmer: Glyph光, strategist: Glyph曜, observer: Glyph光,
  guardian: Glyph土, coordinator: Glyph土, creator: Glyph火, explorer: Glyph风,
  doer: Glyph火, leader: Glyph曜, whole: Glyph光,
  // 过渡型：取前后两型元素中较"动"的那个（前半：成型；后半：驱动）
  dark_reef__spark: Glyph火, spark__departure: Glyph风, departure__scout: Glyph风,
  scout__drifter: Glyph风, drifter__glimmer: Glyph光, glimmer__strategist: Glyph光,
  strategist__observer: Glyph曜, observer__guardian: Glyph土, guardian__coordinator: Glyph土,
  coordinator__creator: Glyph火, creator__explorer: Glyph风, explorer__doer: Glyph火,
  doer__leader: Glyph曜, leader__whole: Glyph光,
};

/** 原型元素名（中文，与图标对应） */
export const TOTEM_ELEMENT_NAME: Record<PersonalityType, string> = {
  dark_reef: "水", spark: "火", departure: "风", scout: "光",
  drifter: "风", glimmer: "光", strategist: "曜", observer: "光",
  guardian: "土", coordinator: "土", creator: "火", explorer: "风",
  doer: "火", leader: "曜", whole: "光",
  dark_reef__spark: "水→火", spark__departure: "火→风", departure__scout: "风→光",
  scout__drifter: "光→风", drifter__glimmer: "风→光", glimmer__strategist: "光→曜",
  strategist__observer: "曜→光", observer__guardian: "光→土", guardian__coordinator: "土→土",
  coordinator__creator: "土→火", creator__explorer: "火→风", explorer__doer: "风→火",
  doer__leader: "火→曜", leader__whole: "曜→光",
};

/** 原型中文意象短语（2 字，仅留意象，不带英文/括号/过渡字） */
export const TOTEM_DESCRIPTORS: Record<PersonalityType, { title: string; sub: string }> = {
  dark_reef: { title: "暗礁", sub: "水下支点" },
  spark: { title: "引子", sub: "一点星火" },
  departure: { title: "启程", sub: "稳行一步" },
  scout: { title: "探路", sub: "先见于远" },
  drifter: { title: "漫游", sub: "立于界间" },
  glimmer: { title: "微光", sub: "照入暗角" },
  strategist: { title: "战略", sub: "把定方向" },
  observer: { title: "观察", sub: "看得更多" },
  guardian: { title: "守护", sub: "为值得者" },
  coordinator: { title: "协调", sub: "连结彼此" },
  creator: { title: "创造", sub: "无法雷同" },
  explorer: { title: "探索", sub: "仍在路上" },
  doer: { title: "行动", sub: "先动起来" },
  leader: { title: "掌控", sub: "定下调子" },
  whole: { title: "全貌", sub: "览尽来去" },
  // ---- 14 过渡型描述符：去括号、去"过渡"二字，只留中文意象
  dark_reef__spark:     { title: "暗礁·引子", sub: "暗处将燃" },
  spark__departure:     { title: "引子·启程", sub: "星火初行" },
  departure__scout:     { title: "启程·探路", sub: "行而有思" },
  scout__drifter:       { title: "探路·漫游", sub: "多路并行" },
  drifter__glimmer:     { title: "漫游·微光", sub: "界间有光" },
  glimmer__strategist:  { title: "微光·战略", sub: "光成格局" },
  strategist__observer: { title: "战略·观察", sub: "判而待之" },
  observer__guardian:   { title: "观察·守护", sub: "见而护之" },
  guardian__coordinator:{ title: "守护·协调", sub: "护而联之" },
  coordinator__creator: { title: "协调·创造", sub: "联而新作" },
  creator__explorer:    { title: "创造·探索", sub: "作而行远" },
  explorer__doer:       { title: "探索·行动", sub: "远而即动" },
  doer__leader:         { title: "行动·掌控", sub: "动而掌舵" },
  leader__whole:        { title: "掌控·全貌", sub: "掌而览尽" },
};

/** 14 过渡型图腾：前后两主型图腾叠加（前 60% + 后 40%） */
function HybridTotem(
  Left: (p: TotemProps) => React.JSX.Element,
  Right: (p: TotemProps) => React.JSX.Element
) {
  return ({ size = 80, color = "currentColor" }: TotemProps) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <g opacity="0.6">
        <Left size={100} color={color} />
      </g>
      <g opacity="0.5">
        <Right size={100} color={color} />
      </g>
    </svg>
  );
}
