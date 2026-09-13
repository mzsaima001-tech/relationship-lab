// =====================================================
// 人格测试 — 月相卡组件（PNG + SVG HUD overlay，2026-09-13）
//
// 设计语言参照 2026 神谕卡趋势：
//   · HUD 角章（编号 + 类型徽标）—— 给每张卡身份
//   · 罗马数字中轴编号 —— 仪式感（呼应 The Moon XVIII）
//   · 月光辉光 box-shadow —— 神谕卡质感
//   · 3D 翻转动效 —— 入场仪式感
//
// 数据：30 张月相卡 PNG（public/personality/cards/P01.png~T15.png）
// 替换：旧 22-archetype SVG totem 系统（已废弃）
// =====================================================

"use client";

import type { PersonalityDimension, PersonalityCard as PersonalityCardData } from "../types";
import { PERSONALITY_CARD_BY_ID } from "../cards";

export type CardSize = "xs" | "sm" | "md" | "lg";

interface PersonalityCardProps {
  /** V5: 直接传 V3 card 对象（优先）；或传 V1 type id（P01/P02/T01…）作为 fallback */
  type?: string;
  card?: PersonalityCardData;
  /** 0-100 整数百分比（已乘好的），组件内部不再 ×100 */
  matchScore?: number;
  size?: CardSize;
  className?: string;
  label?: "primary" | "secondary" | "hidden";
  theme?: "light" | "dark";
  /** 兼容旧 API，本版本不使用 */
  userScores?: Partial<Record<PersonalityDimension, number>>;
  showDiff?: boolean;
}

const SIZE_MAP: Record<CardSize, { wrapper: string; imgHeight: string; hudSize: string; romanSize: string; mottoSize: string }> = {
  /** 对位缩略（vs 板块专用：128×192） */
  xs: {
    wrapper: "w-32",
    imgHeight: "h-[192px]",
    hudSize: "text-[8px]",
    romanSize: "text-base",
    mottoSize: "text-[9px]",
  },
  /** 列表缩略：176×260 */
  sm: {
    wrapper: "w-44",
    imgHeight: "h-[260px]",
    hudSize: "text-[9px]",
    romanSize: "text-base",
    mottoSize: "text-[10px]",
  },
  md: {
    wrapper: "w-56",
    imgHeight: "h-[336px]",
    hudSize: "text-[10px]",
    romanSize: "text-xl",
    mottoSize: "text-xs",
  },
  lg: {
    wrapper: "w-80",
    imgHeight: "h-[480px]",
    hudSize: "text-xs",
    romanSize: "text-3xl",
    mottoSize: "text-sm",
  },
};

const LABEL_TEXT: Record<string, string> = {
  primary: "核心卡",
  secondary: "次型",
  hidden: "隐藏型",
};

/**
 * 把月相序号数字 1-30 转成罗马数字（1-15 = I-XV，0.5/14.5 等半整数用半罗马）
 * 我们只对主卡序号 1-15 转，过渡卡直接用原始 no 数字（如 0.5、1.5 ...）
 */
function toRoman(n: number): string {
  if (!Number.isInteger(n)) return ""; // 半整数不过渡
  const map: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let r = "";
  let v = n;
  for (const [num, sym] of map) {
    while (v >= num) {
      r += sym;
      v -= num;
    }
  }
  return r;
}

/**
 * 总序号（1-30 在所有卡里线性排）。我们用 no 字段排序取 index 作为 HUD 编号。
 * 主卡 no = 1..15，过渡卡 no = 0.5..14.5，按月相序列排：1, 0.5, 1.5, 2, 2.5 ...
 * 这里不做实时计算，直接用全局排序后查询序号由调用方传入（避免循环排序）——
 * 因此使用 cardData.no 直接显示小序号（如 "0.5"），罗马数字自动跳过非整数。
 */
export function PersonalityCard({
  type,
  card,
  matchScore,
  size = "md",
  className = "",
  label,
  theme = "dark",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showDiff = true,
}: PersonalityCardProps) {
  const dims = SIZE_MAP[size];
  // 优先 card prop；否则按 type 查 V5 dict；查不到再走 fallback
  const data: PersonalityCardData | undefined = card ?? (type ? PERSONALITY_CARD_BY_ID[type] : undefined);

  if (!data) {
    return (
      <div className={`${dims.wrapper} ${dims.imgHeight} rounded-2xl border border-amber-200/30 flex items-center justify-center text-xs text-amber-200/60 ${className}`}>
        <span className="px-3 py-2 text-center">未找到卡片<br />{type}</span>
      </div>
    );
  }

  const isDark = theme === "dark";
  const labelText = label ? LABEL_TEXT[label] : null;
  const matchPercent =
    typeof matchScore === "number" ? Math.max(0, Math.min(100, Math.round(matchScore))) : null;
  const roman = toRoman(data.no);

  // 主题色
  const accent = isDark ? "#E3BC63" : "#8a6a2a";
  const accentDim = isDark ? "rgba(227,188,99,0.45)" : "rgba(138,106,42,0.4)";
  const bgGradient = isDark
    ? "linear-gradient(180deg, rgba(20,16,10,0.7) 0%, rgba(40,30,18,0.92) 100%)"
    : "linear-gradient(180deg, rgba(255,253,247,0.95) 0%, rgba(245,235,220,0.98) 100%)";
  const shadowBorder = isDark
    ? "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(227,188,99,0.22) inset, 0 0 28px rgba(227,188,99,0.18)"
    : "0 8px 24px rgba(40,30,18,0.14), 0 0 0 1px rgba(40,30,18,0.08) inset, 0 0 28px rgba(201,169,110,0.28)";

  return (
    <div
      className={`relative ${dims.wrapper} ${dims.imgHeight} rounded-2xl overflow-hidden flex flex-col card-moon-flip ${className}`}
      style={{
        background: bgGradient,
        boxShadow: shadowBorder,
      }}
    >
      {/* HUD：左上角章（编号） */}
      <div
        className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 ${dims.hudSize} font-mono tracking-widest`}
        style={{
          color: accent,
          textShadow: isDark ? "0 0 6px rgba(227,188,99,0.5)" : "none",
        }}
        aria-hidden
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accentDim}` }}
        />
        <span>
          NO.{String(data.no).padStart(2, "0")}
        </span>
      </div>

      {/* HUD：右上角章（主型/过渡徽标） */}
      <div
        className={`absolute top-3 right-3 z-20 px-2 py-0.5 rounded-sm ${dims.hudSize} font-medium tracking-wider`}
        style={{
          color: accent,
          border: `0.5px solid ${accentDim}`,
          background: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,253,247,0.7)",
          backdropFilter: "blur(4px)",
          textShadow: isDark ? "0 0 6px rgba(227,188,99,0.35)" : "none",
        }}
        aria-hidden
      >
        {data.type === "主" ? "PRINCIPAL" : "TRANSIT"}
      </div>

      {/* label 角标（核心卡/次型/隐藏型——居中圆胶囊） */}
      {labelText && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full ${dims.hudSize} font-medium tracking-wider z-10`}
          style={{
            background: isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.78)",
            color: isDark ? "#E3BC63" : "#5C4520",
            border: `0.5px solid ${isDark ? "#E3BC6388" : "#5C452044"}`,
            backdropFilter: "blur(4px)",
          }}
        >
          {labelText}
        </div>
      )}

      {/* PNG 主图 */}
      <div className="relative w-full flex-1" style={{ aspectRatio: "3 / 4" }}>
        <img
          src={data.png_path}
          alt={`${data.name}（${data.phase}）`}
          className="w-full h-full object-cover card-moon-img"
          loading="lazy"
          draggable={false}
        />

        {/* 罗马数字中轴编号（仅整数序号的主卡） */}
        {roman && (
          <div
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 font-serif ${dims.romanSize} tracking-[0.4em] pl-[0.4em]`}
            style={{
              color: isDark ? "rgba(227,188,99,0.92)" : "rgba(255,247,225,0.95)",
              textShadow: isDark
                ? "0 0 12px rgba(227,188,99,0.5), 0 0 4px rgba(0,0,0,0.8)"
                : "0 0 8px rgba(0,0,0,0.6)",
              fontFamily: '"Cormorant Garamond", "Source Han Serif SC", serif',
              fontStyle: "italic",
            }}
            aria-hidden
          >
            {roman}
          </div>
        )}

        {/* 月光辉光 overlay（极淡的渐变，制造月光斜入） */}
        <div
          className="absolute inset-0 pointer-events-none z-[15]"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(255,248,220,0.10) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.4) 100%)"
              : "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(120,90,30,0.12) 100%)",
            mixBlendMode: isDark ? "screen" : "normal",
          }}
        />
      </div>

      {/* 底部匹配度 + 月相点缀 */}
      {matchPercent !== null && (
        <div
          className={`flex items-center justify-center gap-2.5 py-2 ${dims.hudSize} font-mono tracking-wider`}
          style={{ color: isDark ? "#E3BC63" : "#5C4520" }}
        >
          <span
            className="inline-block flex-1 max-w-10 h-px"
            style={{ background: accentDim }}
          />
          <span>{matchPercent}%</span>
          <span
            className="inline-block flex-1 max-w-10 h-px"
            style={{ background: accentDim }}
          />
        </div>
      )}

      {/* 入场 3D 翻转 + 月光照亮动效（CSS class） */}
      <style jsx>{`
        @keyframes cardFlipIn {
          0% {
            transform: perspective(800px) rotateY(180deg);
            opacity: 0;
          }
          60% {
            transform: perspective(800px) rotateY(-8deg);
            opacity: 1;
          }
          100% {
            transform: perspective(800px) rotateY(0deg);
            opacity: 1;
          }
        }
        @keyframes moonGlow {
          0% {
            filter: brightness(0.55) saturate(0.8);
          }
          60% {
            filter: brightness(1.08) saturate(1.1);
          }
          100% {
            filter: brightness(1) saturate(1);
          }
        }
        .card-moon-flip {
          animation: cardFlipIn 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transform-origin: center center;
        }
        .card-moon-img {
          animation: moonGlow 1.6s ease-out both;
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}

/** 三联卡：primary + secondary + hidden 横向展示 */
export function PersonalityCardRow({
  primary,
  secondary,
  hidden,
  userScores,
  size = "md",
  theme = "dark",
}: {
  primary: PersonalityCardData | string;
  secondary: PersonalityCardData | string;
  hidden: PersonalityCardData | string;
  userScores?: Partial<Record<PersonalityDimension, number>>;
  size?: CardSize;
  theme?: "light" | "dark";
}) {
  const resolve = (x: PersonalityCardData | string) =>
    typeof x === "string" ? PERSONALITY_CARD_BY_ID[x] : x;

  const p = resolve(primary);
  const s = resolve(secondary);
  const h = resolve(hidden);

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {p ? <PersonalityCard card={p} size={size} label="primary" theme={theme} userScores={userScores} /> : null}
      {s ? <PersonalityCard card={s} size={size} label="secondary" theme={theme} userScores={userScores} /> : null}
      {h ? <PersonalityCard card={h} size={size} label="hidden" theme={theme} userScores={userScores} /> : null}
    </div>
  );
}
