// =====================================================
// 人格测试 — 分享海报组件（2026-09-13）
//
// 用途：在 /share/personality/[code] 页里以"海报模式"展示
// 设计语言：暗夜星空 + 烫金边框 + HUD 角章 + 月光辉光
// 比例：9:16（1080×1920），长按可截图保存至相册
//
// 上下游约定：
//   - 父组件传完整 props，不需要在内部 fetch
//   - 二维码由父组件渲染成 data URL 后传入（保持组件纯净）
// =====================================================

"use client";

import { PERSONALITY_DIMENSION_META, type PersonalityDimension } from "../types";
import type { PersonalityCard as PersonalityCardData } from "../types";

export interface PersonalitySharePosterProps {
  /** 主月相卡 */
  primaryCard: PersonalityCardData;
  /** 匹配度（0-100 整数） */
  matchScore: number;
  /** 判词 */
  tagline: string;
  /** 6 维分（0-100） */
  scores: Record<PersonalityDimension, number>;
  /** 测试编号 / 档案号 */
  fileNo: string;
  /** 扫码落地 URL（如 https://example.com/p/CODE） */
  shareUrl: string;
  /** 已渲染好的二维码 data URL（PNG base64），父组件用 qrcode 库生成 */
  qrCodeDataUrl?: string;
  /** 显示用昵称（可选） */
  nickname?: string;
  /** 海报标语（顶部小字） */
  preTitle?: string;
}

// 1-15 转罗马数字
function toRoman(n: number): string {
  if (!Number.isInteger(n)) return "";
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

// 中文月相名
const PERSONALITY_TYPE_CN: Record<string, string> = {
  P01: "暗礁无声", P02: "星火未燎", P03: "微光不争", P04: "先行探路", P05: "静观一室",
  P06: "解缆离岸", P07: "涉川不止", P08: "心有全图", P09: "守中不倚", P10: "观澜见来",
  P11: "自成一格", P12: "执舵在手", P13: "知止有度", P14: "游刃从容", P15: "万物归沉",
  T01: "沉底·初燃", T02: "初燃·照暗", T03: "照暗·知远", T04: "知远·见全", T05: "见全·不回",
  T06: "不回·涉川", T07: "涉川·全图", T08: "全图·守中", T09: "守中·观澜", T10: "观澜·自格",
  T11: "自格·执舵", T12: "执舵·知止", T13: "知止·从容", T14: "从容·归沉", T15: "归沉·沉底",
};

const DIM_KEY_ORDER: PersonalityDimension[] = ["G", "X", "I", "F", "S", "E"];

export function PersonalitySharePoster({
  primaryCard,
  matchScore,
  tagline,
  scores,
  fileNo,
  shareUrl,
  qrCodeDataUrl,
  nickname,
  preTitle = "默契研究所 · 月相测试",
}: PersonalitySharePosterProps) {
  const roman = toRoman(primaryCard.no);
  const cardName = PERSONALITY_TYPE_CN[primaryCard.id] || primaryCard.name;

  return (
    <div
      className="relative mx-auto"
      style={{
        width: 360, // 1080/3 = 360, mobile preview
        height: 640, // 1920/3 = 640
        aspectRatio: "9 / 16",
        maxWidth: "100%",
        background:
          "radial-gradient(ellipse at 50% 18%, #1a1410 0%, #0a0805 60%, #050402 100%)",
        color: "#f5e8c8",
        fontFamily: '"Source Han Serif SC", "PingFang SC", serif',
        boxShadow: "0 0 60px rgba(227,188,99,0.18), 0 0 0 1px rgba(227,188,99,0.22) inset",
        borderRadius: 16,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* 顶部档案区：标题 + 档案号 */}
      <div className="px-5 pt-6 pb-3 flex items-start justify-between">
        <div>
          <p
            className="text-[9px] font-mono tracking-[0.35em]"
            style={{ color: "rgba(227,188,99,0.55)" }}
          >
            {preTitle.toUpperCase()}
          </p>
          <p
            className="font-serif italic text-[15px] mt-1"
            style={{
              color: "#E3BC63",
              textShadow: "0 0 8px rgba(227,188,99,0.4)",
              fontStyle: "italic",
            }}
          >
            Moonphase Profile
          </p>
        </div>
        <div
          className="text-[8px] font-mono tracking-wider text-right"
          style={{ color: "rgba(227,188,99,0.45)" }}
        >
          ARCHIVE
          <br />
          <span style={{ color: "rgba(227,188,99,0.7)", fontSize: 11 }}>{fileNo}</span>
        </div>
      </div>

      {/* 顶部细金线 */}
      <div
        className="mx-5 mb-4 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(227,188,99,0.55), transparent)",
        }}
      />

      {/* 主月相卡区（HUD 角章 + PNG + 罗马数字） */}
      <div className="flex justify-center px-5">
        <div
          className="relative rounded-2xl overflow-hidden card-poster-main"
          style={{
            width: 280,
            height: 374,
            background:
              "linear-gradient(180deg, rgba(20,16,10,0.7) 0%, rgba(40,30,18,0.92) 100%)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(227,188,99,0.3) inset, 0 0 32px rgba(227,188,99,0.25)",
          }}
        >
          {/* HUD 左上：编号 */}
          <div
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 text-[10px] font-mono tracking-widest"
            style={{
              color: "#E3BC63",
              textShadow: "0 0 6px rgba(227,188,99,0.5)",
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#E3BC63", boxShadow: "0 0 6px rgba(227,188,99,0.6)" }}
            />
            <span>NO.{String(primaryCard.no).padStart(2, "0")}</span>
          </div>

          {/* HUD 右上：主型徽标 */}
          <div
            className="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wider"
            style={{
              color: "#E3BC63",
              border: "0.5px solid rgba(227,188,99,0.55)",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            {primaryCard.type === "主" ? "PRINCIPAL" : "TRANSIT"}
          </div>

          {/* 主图 */}
          <img
            src={primaryCard.png_path}
            alt={`${cardName}（${primaryCard.phase}）`}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* 罗马数字 */}
          {roman && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 font-serif text-2xl tracking-[0.4em] pl-[0.4em]"
              style={{
                color: "rgba(227,188,99,0.92)",
                textShadow:
                  "0 0 12px rgba(227,188,99,0.5), 0 0 4px rgba(0,0,0,0.8)",
                fontStyle: "italic",
              }}
            >
              {roman}
            </div>
          )}

          {/* 月光辉光 */}
          <div
            className="absolute inset-0 pointer-events-none z-[15]"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,248,220,0.10) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.4) 100%)",
              mixBlendMode: "screen",
            }}
          />
        </div>
      </div>

      {/* 匹配度居中 */}
      <div className="text-center mt-4">
        <div className="flex items-center justify-center gap-2.5 text-xs font-mono tracking-wider" style={{ color: "#E3BC63" }}>
          <span className="inline-block flex-1 max-w-12 h-px" style={{ background: "rgba(227,188,99,0.55)" }} />
          <span>{matchScore}%</span>
          <span className="inline-block flex-1 max-w-12 h-px" style={{ background: "rgba(227,188,99,0.55)" }} />
        </div>
      </div>

      {/* 卡名 + 判词 */}
      <div className="text-center px-6 mt-3">
        <h2
          className="display-serif font-bold text-[26px] leading-tight"
          style={{ color: "#f5e8c8", textShadow: "0 0 12px rgba(227,188,99,0.25)" }}
        >
          {cardName}
        </h2>
        <p
          className="text-[10px] mt-1 font-mono tracking-wider"
          style={{ color: "rgba(245,232,200,0.6)" }}
        >
          第 {primaryCard.no} 相 · {primaryCard.phase}
        </p>

        {/* 判词大字号 */}
        <div className="max-w-[300px] mx-auto my-3">
          <div
            className="mx-auto mb-2 h-px w-12"
            style={{ background: "linear-gradient(90deg, transparent, #E3BC63, transparent)" }}
          />
          <p
            className="font-serif italic text-[15px] leading-snug tracking-wide"
            style={{
              color: "#f5e8c8",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            「{tagline}」
          </p>
          <div
            className="mx-auto mt-2 h-px w-12"
            style={{ background: "linear-gradient(90deg, transparent, #E3BC63, transparent)" }}
          />
        </div>
        {nickname && (
          <p
            className="text-[10px] font-mono tracking-wider mt-2"
            style={{ color: "rgba(245,232,200,0.5)" }}
          >
            —— {nickname} 的月相
          </p>
        )}
      </div>

      {/* 6 维 mini 条形 */}
      <div className="mx-6 mt-4">
        <p
          className="text-[9px] font-mono tracking-[0.3em] mb-2 text-center"
          style={{ color: "rgba(227,188,99,0.6)" }}
        >
          SIX MOON-DIMENSIONS
        </p>
        <div className="space-y-1.5">
          {DIM_KEY_ORDER.map((k) => {
            const meta = PERSONALITY_DIMENSION_META[k];
            const v = Math.max(0, Math.min(100, Math.round(scores[k] ?? 0)));
            return (
              <div key={k} className="flex items-center gap-2 text-[9px]" style={{ color: "#f5e8c8" }}>
                <span className="w-6 font-mono tracking-wider" style={{ color: "rgba(227,188,99,0.85)" }}>
                  {k}
                </span>
                <span className="w-12 truncate" style={{ color: "rgba(245,232,200,0.78)" }}>
                  {meta.cn}
                </span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(245,232,200,0.1)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${v}%`,
                      background: "linear-gradient(90deg, rgba(227,188,99,0.55), #E3BC63)",
                      boxShadow: "0 0 6px rgba(227,188,99,0.4)",
                    }}
                  />
                </div>
                <span className="w-5 text-right font-mono" style={{ color: "rgba(227,188,99,0.95)" }}>
                  {v}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部条：CTA + QR */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5 py-3 flex items-center gap-3"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,5,0) 0%, rgba(10,8,5,0.9) 70%, rgba(10,8,5,0.98) 100%)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[8px] font-mono tracking-wider"
            style={{ color: "rgba(227,188,99,0.5)" }}
          >
            SCAN · 看看你是什么月相
          </p>
          <p
            className="font-serif text-[13px] mt-0.5 leading-tight"
            style={{ color: "#f5e8c8" }}
          >
            扫码也来测一下你的
          </p>
          <p
            className="font-serif font-bold text-[15px]"
            style={{
              color: "#E3BC63",
              textShadow: "0 0 8px rgba(227,188,99,0.35)",
            }}
          >
            三十面月相 →
          </p>
        </div>
        <div
          className="w-14 h-14 rounded-md flex items-center justify-center overflow-hidden shrink-0"
          style={{
            background: "#fcf6e2",
            boxShadow: "0 0 0 1px rgba(227,188,99,0.4)",
            padding: 3,
          }}
        >
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR" className="w-full h-full object-contain" />
          ) : (
            <span
              className="text-[7px] font-mono"
              style={{ color: "#5C4520", textAlign: "center", lineHeight: 1.2 }}
            >
              QR
              <br />
              码
            </span>
          )}
        </div>
      </div>

      {/* 入场动效 */}
      <style>{`
        @keyframes posterReveal {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes posterMainFlip {
          0% { transform: perspective(700px) rotateY(180deg); opacity: 0; }
          60% { transform: perspective(700px) rotateY(-6deg); opacity: 1; }
          100% { transform: perspective(700px) rotateY(0deg); opacity: 1; }
        }
        .card-poster-main {
          animation: posterMainFlip 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transform-origin: center center;
        }
      `}</style>
    </div>
  );
}
