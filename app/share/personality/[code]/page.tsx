"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { CompassDial, OrnamentDivider, StarMap } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import SharePosterActions from "@/app/components/SharePosterActions";
import { TAROT_CARDS, tarotImage } from "@/lib/reports/tarot";
import { PERSONALITY_COPY_SETS } from "@/lib/personality-copy";
import { PERSONALITY_TYPE_META, type PersonalityType } from "@/lib/personality/types";
import { wrapMystery, FALLBACK_PERSONALITY } from "@/lib/share-mystery";

// =====================================================
// 人格测试分享海报页 /share/personality/[code]
// —— V2 重设计：借鉴主页布局（标题 + 钩子话术 + 3 张塔罗牌）
// —— 钩子话术来自 PERSONALITY_COPY_SETS 随机一套（人格探索主题）
// —— 完全去除分享人信息（昵称 / 原型 / 雷达 / 得分 / 标签）→ 只剩 3 张塔罗 + 钩子
// —— 二维码缩小至 88px，扫码直达主页 `/`
// —— 海报长按可保存到相册，微信会自动识别图中二维码
// =====================================================

const POSTER_W = 900;
// POSTER_H 从 1420 提升到 1560，给多行 mystery.body（AI 润色版 80-150 字）留垂直空间
const POSTER_H = 1560;

interface PersonalityShareData {
  code: string;
  visits: number;
  testId: string;
  sharer: {
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

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number,
  options: { maxWidth?: number; maxLines?: number; lineHeight?: number } = {}
) {
  const maxWidth = options.maxWidth ?? 800;
  const maxLines = options.maxLines ?? 2;
  const lineHeight = options.lineHeight ?? 30;

  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);

  const lines: { chars: string[]; widths: number[]; total: number }[] = [];
  let cur: { chars: string[]; widths: number[]; total: number } = {
    chars: [],
    widths: [],
    total: 0,
  };
  for (let i = 0; i < chars.length; i++) {
    const w = widths[i] + (cur.chars.length > 0 ? spacing : 0);
    if (cur.total + w > maxWidth && cur.chars.length > 0) {
      lines.push(cur);
      cur = { chars: [chars[i]], widths: [widths[i]], total: widths[i] };
    } else {
      cur.chars.push(chars[i]);
      cur.widths.push(widths[i]);
      cur.total += w;
    }
  }
  if (cur.chars.length > 0) lines.push(cur);

  let truncated = false;
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const ELLIPSIS_W = ctx.measureText("……").width;
    const last = kept[maxLines - 1];
    while (last.total > maxWidth - ELLIPSIS_W - spacing && last.chars.length > 1) {
      const removedW = last.widths.pop()! + spacing;
      last.chars.pop();
      last.total -= removedW;
    }
    lines.length = 0;
    lines.push(...kept);
    truncated = true;
  }

  const totalH = (lines.length - 1) * lineHeight;
  let yOffset = y - totalH / 2;
  for (const line of lines) {
    const lineTotal =
      line.widths.reduce((a, b) => a + b, 0) +
      spacing * Math.max(line.chars.length - 1, 0);
    let x = cx - lineTotal / 2;
    for (let i = 0; i < line.chars.length; i++) {
      ctx.fillText(line.chars[i], x, yOffset);
      x += line.widths[i] + spacing;
    }
    if (truncated && line === lines[lines.length - 1]) {
      ctx.fillText("……", x, yOffset);
    }
    yOffset += lineHeight;
  }
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 用 code 作种子 → 确定性地挑一套人格话术 + 3 张塔罗牌 */
function pickCopy(code: string) {
  const idx = hashCode(code) % PERSONALITY_COPY_SETS.length;
  return PERSONALITY_COPY_SETS[idx];
}

function pickTarotIdx(code: string, length: number): number[] {
  const rand = seededRandom(hashCode(code + "-tarot"));
  const pool = Array.from({ length }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Canvas 海报渲染（导出 PNG 用）
 * —— 主页风：标题 + 钩子 + 3 张塔罗 + 邀请 + 小二维码（左文右码）
 * —— 不画人格卡 / 雷达图 / 分享人信息
 * —— 新增方案 A：钩子和塔罗之间塞「神秘暗号」一句（来自分享人 tagline）
 */
async function renderPoster(
  canvas: HTMLCanvasElement,
  data: PersonalityShareData,
  qrDataUrl: string
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const cardIdxs = pickTarotIdx(data.code, TAROT_CARDS.length);
  const cards = cardIdxs.map((i) => TAROT_CARDS[i]);
  const copy = pickCopy(data.code);
  const mystery = wrapMystery(
    data.sharer?.primaryType
      ? PERSONALITY_TYPE_META[data.sharer.primaryType as PersonalityType]?.tagline
      : null,
    "—— 一位走过默契研究所的 TA",
    FALLBACK_PERSONALITY
  );
  const [cardImgs, qrImg] = await Promise.all([
    Promise.all(cards.map((c) => loadImage(tarotImage(c.slug)))),
    loadImage(qrDataUrl),
  ]);

  const ACCENT = "#c9a96e";
  const ACCENT_DIM = "#a08850";
  const TEXT_WARM = "#e8e0d4";
  const TEXT_MUTED = "#9a9080";
  const SERIF = `"Noto Serif SC", "Songti SC", "SimSun", Georgia, serif`;
  const MONO = `"Courier New", monospace`;

  // ---- 背景：夜空渐变 + 星点 ----
  const grad = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  grad.addColorStop(0, "#16130f");
  grad.addColorStop(1, "#100e0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  const rand = seededRandom(17);
  ctx.fillStyle = ACCENT;
  for (let i = 0; i < 90; i++) {
    const x = rand() * POSTER_W;
    const y = rand() * POSTER_H;
    ctx.globalAlpha = 0.15 + rand() * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, rand() * 1.6 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 外框双线
  ctx.strokeStyle = ACCENT_DIM;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, POSTER_W - 56, POSTER_H - 56);
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(40, 40, POSTER_W - 80, POSTER_H - 80);
  ctx.globalAlpha = 1;

  // 顶部档案号（不显示具体分享人）
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `18px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawSpacedText(ctx, `No. ${data.code.slice(0, 6).toUpperCase()}`, POSTER_W / 2, 100, 3);

  // ===== 主页标题区 =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 56px ${SERIF}`;
  ctx.fillText("默契研究所", POSTER_W / 2, 180);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `18px ${MONO}`;
  drawSpacedText(ctx, "RELATIONSHIP LAB", POSTER_W / 2, 222, 6);

  // 装饰线 + 菱形
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  const lineY = 252;
  ctx.beginPath();
  ctx.moveTo(180, lineY);
  ctx.lineTo(POSTER_W / 2 - 16, lineY);
  ctx.moveTo(POSTER_W / 2 + 16, lineY);
  ctx.lineTo(POSTER_W - 180, lineY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(POSTER_W / 2, lineY - 7);
  ctx.lineTo(POSTER_W / 2 + 7, lineY);
  ctx.lineTo(POSTER_W / 2, lineY + 7);
  ctx.lineTo(POSTER_W / 2 - 7, lineY);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ===== 钩子话术（人格主题，随机一套） =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 30px ${SERIF}`;
  ctx.textAlign = "center";
  const hookY = 312;
  copy.hook.forEach((line, i) => {
    ctx.fillText(line, POSTER_W / 2, hookY + i * 42);
  });

  // 副钩子（场景白描）
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `18px ${SERIF}`;
  const subY = hookY + copy.hook.length * 42 + 24;
  copy.scenes.forEach((s, i) => {
    ctx.fillText(s, POSTER_W / 2, subY + i * 28);
  });

  // ===== 神秘暗号（方案 A：揭示一句 tagline，不暴露身份） =====
  const mysteryTopY = subY + copy.scenes.length * 28 + 72;
  // 上一根装饰线（菱形 + 两段横线）
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.45;
  const dY = mysteryTopY - 30;
  ctx.beginPath();
  ctx.moveTo(180, dY);
  ctx.lineTo(POSTER_W / 2 - 18, dY);
  ctx.moveTo(POSTER_W / 2 + 18, dY);
  ctx.lineTo(POSTER_W - 180, dY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(POSTER_W / 2, dY - 6);
  ctx.lineTo(POSTER_W / 2 + 6, dY);
  ctx.lineTo(POSTER_W / 2, dY + 6);
  ctx.lineTo(POSTER_W / 2 - 6, dY);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 主钩子：motto（tagline 自带「」强调，不再外包避免嵌套）
  // tagline 可能也是 AI 润色版（60-100 字），必须限行 + 限宽
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 26px ${SERIF}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, mystery.body, POSTER_W / 2, mysteryTopY + 8, 2, {
    maxWidth: POSTER_W - 100,
    maxLines: 3,
    lineHeight: 34,
  });

  // 署名（byline 通常短，1 行即可）
  ctx.fillStyle = ACCENT_DIM;
  ctx.font = `italic 17px ${SERIF}`;
  drawSpacedText(ctx, mystery.byline, POSTER_W / 2, mysteryTopY + 116, 0, {
    maxWidth: POSTER_W - 100,
    maxLines: 1,
    lineHeight: 18,
  });

  // ===== 罗盘底纹（下移 60px 给多行 mystery.body 留空间） =====
  ctx.save();
  ctx.translate(POSTER_W / 2, 940);
  ctx.strokeStyle = ACCENT;
  ctx.globalAlpha = 0.14;
  for (const r of [240, 220, 150]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = r === 240 ? 1.4 : 0.7;
    ctx.stroke();
  }
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const r1 = i % 6 === 0 ? 208 : 216;
    ctx.beginPath();
    ctx.moveTo(r1 * Math.sin(a), -r1 * Math.cos(a));
    ctx.lineTo(226 * Math.sin(a), -226 * Math.cos(a));
    ctx.lineWidth = i % 6 === 0 ? 1 : 0.4;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // ===== 3 张塔罗牌（扇形悬浮，与主页一致） —— 下移 ~50px，给多行 mystery.body 留空间 =====
  const cardW = 200;
  const cardH = (cardW / cardImgs[0].width) * cardImgs[0].height;
  const positions: Array<{ x: number; y: number; rot: number }> = [
    { x: POSTER_W / 2 - 200, y: 1040, rot: -9 },
    { x: POSTER_W / 2, y: 980, rot: 0 },
    { x: POSTER_W / 2 + 200, y: 1040, rot: 9 },
  ];

  cardImgs.forEach((img, i) => {
    const p = positions[i];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    const padX = 8;
    const padY = 6;
    ctx.fillStyle = "#9a7b40";
    ctx.fillRect(-cardW / 2 - padX, -cardH / 2 - padY, cardW + padX * 2, cardH + padY * 2);
    ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);
    ctx.strokeStyle = "rgba(248, 241, 226, 0.65)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-cardW / 2 - padX + 2, -cardH / 2 - padY + 2, cardW + padX * 2 - 4, cardH + padY * 2 - 4);
    ctx.restore();
  });

  // 塔罗牌下方：十一面镜像（也下移 50px）
  let y = 1230;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `20px ${MONO}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, "SEVENTY-FOUR MIRRORS · 七十四面镜子", POSTER_W / 2, y, 3);
  y += 32;
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 24px ${SERIF}`;
  ctx.fillText("总有一面，是你。", POSTER_W / 2, y);
  y += 48;

  // ===== 邀请话术（人格主题 CTA） =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 26px ${SERIF}`;
  ctx.fillText(copy.tag, POSTER_W / 2, y);
  y += 56;

  // ===== 二维码（左文右码） =====
  const qrSize = 150;
  const qrX = POSTER_W / 2 + 30;
  const qrBlockY = y;
  ctx.fillStyle = "#f5ede0";
  ctx.fillRect(qrX, qrBlockY, qrSize, qrSize);
  ctx.drawImage(qrImg, qrX, qrBlockY, qrSize, qrSize);

  ctx.textAlign = "left";
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 22px ${SERIF}`;
  ctx.fillText("长按二维码，", 130, qrBlockY + 38);
  ctx.fillText("看看你是哪一种", 130, qrBlockY + 70);

  ctx.fillStyle = ACCENT;
  ctx.font = `18px ${MONO}`;
  ctx.fillText("· 36 题 · 约 5 分钟", 130, qrBlockY + 110);
  ctx.fillText("· 无需注册 · 基础结果免费", 130, qrBlockY + 138);

  y = qrBlockY + qrSize + 32;

  // 品牌签名
  ctx.fillStyle = ACCENT;
  ctx.font = `20px ${SERIF}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, "默契研究所 · 性格面", POSTER_W / 2, y, 6);
}

export default function PersonalitySharePosterPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [data, setData] = useState<PersonalityShareData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 随机挑一套人格话术 + 3 张塔罗（用 code 作种子，保证 SSR 一致）
  const copy = pickCopy(code);
  const cardIdxs = pickTarotIdx(code, TAROT_CARDS.length);
  const spread = cardIdxs.map((i) => TAROT_CARDS[i]);

  useEffect(() => {
    async function prepare() {
      try {
        // 拉分享码元数据（仅用于 fileNo 风格，不展示 sharer 信息）
        const res = await fetch(`/api/shares/${code}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "分享不存在");
        if (json.shareType !== "personality") {
          throw new Error("该分享不是人格测试类型");
        }

        // QR 指向主页（用户要求）
        const homeUrl = `${window.location.origin}/`;
        const qr = await QRCode.toDataURL(homeUrl, {
          width: 512,
          margin: 1,
          color: { dark: "#2a2418", light: "#f5ede0" },
        });
        setQrDataUrl(qr);

        setData(json as PersonalityShareData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    prepare();
  }, [code]);

  // —— 新版：SharePosterActions 需要 ——
  const renderPosterAction = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (!data || !qrDataUrl) throw new Error("海报数据未就绪");
      await renderPoster(canvas, data, qrDataUrl);
    },
    [data, qrDataUrl]
  );

  const defaultCaption =
    copy.hook.join("") +
    "\n" +
    copy.scenes.join(" ") +
    "\n\n" +
    "——\n来默契研究所，看看你是哪一种\n36 题 · 5 分钟 · 基础结果免费\n" +
    (typeof window !== "undefined" ? window.location.origin : "") +
    "/";

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm mt-4">正在准备你的分享海报...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[var(--danger)] text-sm">{error || "加载失败"}</p>
        <Link href="/personality" className="btn-ghost">返回人格测试</Link>
      </main>
    );
  }

  return (
    <main className="night-sky flex-1 px-5 py-6 sm:py-8 max-w-md mx-auto w-full safe-bottom relative overflow-hidden">
      <StarMap opacity={0.12} seed={3} />

      <div className="relative">
        {/* ===== 顶部品牌头（与主页一致） ===== */}
        <div className="text-center mb-5 fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="archive-label">Relationship Lab</span>
            <span className="w-8 h-px bg-[var(--border-dim)]" />
            <span className="file-number">No. {code.slice(0, 6).toUpperCase()}</span>
          </div>
          <h1 className="display-serif text-2xl sm:text-3xl font-bold text-[var(--text-warm)] leading-tight">
            默契研究所
          </h1>
        </div>

        {/* ===== 海报卡（用户长按可保存到相册，微信会自动识别其中二维码） ===== */}
        <div
          id="share-poster"
          className="relative border border-[var(--accent-dim)] rounded-sm px-5 pt-5 pb-5 mb-4 fade-in-up cursor-pointer"
          style={{
            background: "linear-gradient(180deg,#16130f,#100e0a)",
            animationDelay: "0.1s",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          title="长按图片可保存到相册，或长按识别图中二维码"
        >
          {/* 顶部小档案号 */}
          <div className="text-center mb-3">
            <span className="file-number">FILE · {code.slice(0, 6).toUpperCase()}</span>
          </div>

          {/* 钩子话术（人格主题，随机一套） */}
          <div className="text-center space-y-2 mb-4">
            <p className="display-serif text-[15px] sm:text-base text-[var(--text-warm)] font-medium leading-relaxed">
              {copy.hook.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < copy.hook.length - 1 && <br />}
                </span>
              ))}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {copy.scenes.map((s, i) => (
                <span key={i}>
                  {s}
                  {i < copy.scenes.length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>

          {/* ===== 神秘暗号（方案 A：揭示一句 tagline，但不暴露身份） ===== */}
          <div className="my-5 fade-in-up" style={{ animationDelay: "0.12s" }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="flex-1 max-w-[60px] h-px bg-[var(--accent-dim)] opacity-50" />
              <span className="text-[var(--accent-dim)] text-[10px] tracking-[0.2em]">◆</span>
              <span className="flex-1 max-w-[60px] h-px bg-[var(--accent-dim)] opacity-50" />
            </div>
            <p className="display-serif text-[15px] sm:text-base text-[var(--text-warm)] font-medium text-center leading-relaxed italic">
              {wrapMystery(
                data?.sharer?.primaryType
                  ? PERSONALITY_TYPE_META[data.sharer.primaryType as PersonalityType]?.tagline
                  : null,
                "—— 一位走过默契研究所的 TA",
                FALLBACK_PERSONALITY
              ).body}
            </p>
            <p className="text-[11px] text-[var(--accent-dim)] text-center mt-2 italic">
              {wrapMystery(
                data?.sharer?.primaryType
                  ? PERSONALITY_TYPE_META[data.sharer.primaryType as PersonalityType]?.tagline
                  : null,
                "—— 一位走过默契研究所的 TA",
                FALLBACK_PERSONALITY
              ).byline}
            </p>
          </div>

          <OrnamentDivider className="mb-4" />

          {/* 罗盘 + 塔罗牌阵（扇形悬浮，与首页同款） */}
          <div className="relative flex items-center justify-center h-[180px] mb-3">
            <div className="absolute pointer-events-none">
              <CompassDial size={180} opacity={0.14} />
            </div>
            <div className="relative flex items-end justify-center">
              {spread.map((card, i) => {
                const rotate = i === 0 ? "-rotate-[9deg]" : i === 2 ? "rotate-[9deg]" : "rotate-0";
                const offset = i === 1 ? "-translate-y-3 z-10" : "z-0";
                const side = i === 0 ? "-mr-3 sm:-mr-4" : i === 2 ? "-ml-3 sm:-ml-4" : "";
                return (
                  <span key={card.slug} className={`${rotate} ${offset} ${side}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tarotImage(card.slug)}
                      alt={`塔罗牌：${card.cardTitle}`}
                      className="tarot-mini w-[68px] sm:w-[76px]"
                      loading="eager"
                    />
                  </span>
                );
              })}
            </div>
          </div>
          <p className="text-center text-[10px] text-[var(--text-muted)] tracking-widest mb-4">
            七十四面镜子，总有一面是你
          </p>

          <OrnamentDivider className="mb-4" />

          {/* 邀请话术（人格主题 CTA） */}
          <p className="display-serif text-sm sm:text-base text-[var(--text-warm)] text-center font-medium leading-snug mb-4">
            {copy.tag}
          </p>

          <OrnamentDivider className="mb-4" />

          {/* 小二维码 + 文案（左文右码，引导微信识别） */}
          {qrDataUrl && (
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex-1 min-w-0">
                <p className="display-serif text-sm text-[var(--text-warm)] font-medium leading-snug">
                  长按二维码，
                  <br />
                  看看你是哪一种
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  · 36 题 · 约 5 分钟
                  <br />
                  · 无需注册 · 基础结果免费
                </p>
              </div>
              <div className="bg-[#f5ede0] p-1.5 rounded-sm flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="分享二维码"
                  className="w-[88px] h-[88px] block"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== 操作区（新版：分享好友 / 朋友圈 / 保存图片） ===== */}
        <SharePosterActions
          renderPoster={renderPosterAction}
          defaultCaption={defaultCaption}
          fileName={`默契研究所-性格面-${code.slice(0, 6)}.png`}
        />

        <div className="text-center mt-5">
          <Link
            href={`/personality/report/${data.testId}`}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
          >
            ← 回到我的完整报告
          </Link>
        </div>

        <HomeFooter />
      </div>
    </main>
  );
}