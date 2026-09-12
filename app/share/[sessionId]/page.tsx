"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { CompassDial, OrnamentDivider, StarMap } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import SharePosterActions from "@/app/components/SharePosterActions";
import { TAROT_CARDS, tarotImage } from "@/lib/reports/tarot";
import { wrapMystery, FALLBACK_COUPLE } from "@/lib/share-mystery";

/**
 * 「神秘暗号」正文块：长 oneLiner 必须限行，否则会撞出版面。
 * 默认最多 3 行（≈ 75 字）；超出后用户点「展开」才看全。
 * —— 用 <details>/<summary> 实现，零 JS 状态，纯 CSS line-clamp + 浏览器原生展开
 */
function OneLinerBlock({ body }: { body: string }) {
  // 用中文标点切句优先（更符合阅读节奏），其次按字符切
  const MAX_PREVIEW_CHARS = 75;
  const needsTruncate = body.length > MAX_PREVIEW_CHARS;
  const preview = needsTruncate ? body.slice(0, MAX_PREVIEW_CHARS) + "…" : body;

  if (!needsTruncate) {
    return (
      <p className="display-serif text-[14px] sm:text-[15px] text-[var(--text-warm)] font-medium text-center leading-relaxed italic">
        {body}
      </p>
    );
  }

  return (
    <details className="group">
      <summary className="list-none cursor-pointer">
        <p className="display-serif text-[14px] sm:text-[15px] text-[var(--text-warm)] font-medium text-center leading-relaxed italic group-open:hidden">
          {preview}
          <span className="block text-[10px] mt-1.5 text-[var(--accent-dim)] not-italic font-normal">
            ▾ 展开全部
          </span>
        </p>
      </summary>
      <p className="display-serif text-[14px] sm:text-[15px] text-[var(--text-warm)] font-medium text-center leading-relaxed italic">
        {body}
        <span className="block text-[10px] mt-1.5 text-[var(--accent-dim)] not-italic font-normal">
          ▴ 收起
        </span>
      </p>
    </details>
  );
}

// =====================================================
// 默契测试分享海报页 /share/[sessionId]
// —— 重设计：去掉分享人信息（昵称/原型/标签），借鉴主页布局
// —— 主图：首页「十一面镜像」塔罗牌阵（随机抽 3 张），不暴露分享人具体身份
// —— 二维码缩小至 88px，左文案右二维码；可长按保存 + 微信识别
// —— 方案 A：钩子和塔罗之间塞「神秘暗号」（一句 oneLiner + archetype 阴影署名）
// =====================================================

const POSTER_W = 900;
// POSTER_H 从 1420 提升到 1560，给多行 mystery.body（AI 润色版 80-150 字）留垂直空间
const POSTER_H = 1560;

interface PosterData {
  archetype: string;
  fileNo: string;
  /** 分享人的昵称（用于署名行模糊一句"我们之间有一个 XX的人"） */
  oneLiner: string;
  archetypeName: string;
}

/** 钩子话术 — 主页同款扎心钩子 + 邀请话术 */
function invitationLines(): { hook: string; sub: string; tag: string } {
  return {
    hook: "你们之间，有没有一种问题，总是在重复发生？",
    sub: "也许问题不是谁对谁错——\n只是你们理解「在乎」的方式不一样。",
    tag: "看 TA 的关系牌——\n你的，会是哪一张？",
  };
}

/**
 * 字符级水平排版 + 自动换行 + 限行数 + 溢出「…」截断
 * —— 用于神秘暗号/署名等可能超长的文案
 * 参数：
 *   maxWidth  : 单行最大像素宽（默认 POSTER_W - 80，留两边 40px 安全边）
 *   maxLines  : 最多几行（默认 2）；超出加「…」并截断
 *   lineHeight: 行高（默认 30px）
 */
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

  // 1. 把字符按 maxWidth 切成多行（贪心：尽量塞满每行）
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

  // 2. 截断到 maxLines，最后一行用「…」收尾
  let truncated = false;
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    // 去掉最后一行尾部字符，留出「…」的位置（≈ 3 个汉字宽 ≈ 84px@28px）
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

  // 3. 渲染
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
      // 「…」紧接最后一个字符
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

/** 固定种子抽 3 张 — 不暴露具体身份，但与该分享者的 archetype 关联 */
function pickTarotIdx(archetype: string, length: number): number[] {
  // 用 archetype 字符串做种子，确保同一分享者每次看到的塔罗阵一致
  let h = 0;
  for (let i = 0; i < archetype.length; i++) {
    h = (h * 31 + archetype.charCodeAt(i)) >>> 0;
  }
  const rand = seededRandom(h);
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

async function renderPoster(
  canvas: HTMLCanvasElement,
  data: PosterData,
  qrDataUrl: string
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const cardIdxs = pickTarotIdx(data.archetype, TAROT_CARDS.length);
  const cards = cardIdxs.map((i) => TAROT_CARDS[i]);
  const mystery = wrapMystery(
    data.oneLiner || null,
    data.archetypeName
      ? `—— 我们之间有一个「${data.archetypeName}」的人`
      : "—— 我们已经测过默契研究所",
    FALLBACK_COUPLE
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

  const rand = seededRandom(42);
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

  // ---- 外框双线 ----
  ctx.strokeStyle = ACCENT_DIM;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, POSTER_W - 56, POSTER_H - 56);
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(40, 40, POSTER_W - 80, POSTER_H - 80);
  ctx.globalAlpha = 1;

  // ---- 顶部档案头 ----
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `18px ${MONO}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawSpacedText(ctx, `No. ${data.fileNo}`, POSTER_W / 2, 100, 3);

  // ===== 主页标题区 =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 56px ${SERIF}`;
  ctx.textAlign = "center";
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

  // ===== 钩子话术（与主页完全一致） =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 32px ${SERIF}`;
  ctx.textAlign = "center";
  const hookY = 308;
  ctx.fillText("你们之间，", POSTER_W / 2, hookY);
  ctx.fillText("有没有一种问题，", POSTER_W / 2, hookY + 46);
  ctx.fillText("总是在重复发生？", POSTER_W / 2, hookY + 92);

  // 副钩子（次行小字）
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `20px ${SERIF}`;
  ctx.fillText("也许问题不是谁对谁错——", POSTER_W / 2, hookY + 148);
  ctx.fillText("只是你们理解「在乎」的方式不一样。", POSTER_W / 2, hookY + 180);

  // ===== 神秘暗号（方案 A：揭示 oneLiner，署名引出 archetype 名） =====
  const mysteryTopY = hookY + 230;
  // 装饰线
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.45;
  const dY = mysteryTopY - 28;
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

  // 主钩子：oneLiner（不带外包「」，保留文案自带的引号风格）
  // mystery.body 可能是 80-150 字的 AI 润色版，给 maxLines=3 + maxWidth 严格截断
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 24px ${SERIF}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, mystery.body, POSTER_W / 2, mysteryTopY + 8, 1, {
    maxWidth: POSTER_W - 100,
    maxLines: 3,
    lineHeight: 32,
  });

  // 署名（byline 通常短，单行即可）
  ctx.fillStyle = ACCENT_DIM;
  ctx.font = `italic 16px ${SERIF}`;
  drawSpacedText(ctx, mystery.byline, POSTER_W / 2, mysteryTopY + 110, 0, {
    maxWidth: POSTER_W - 100,
    maxLines: 1,
    lineHeight: 18,
  });

  // 罗盘底纹位置（与塔罗牌中心对齐）
  ctx.save();
  ctx.translate(POSTER_W / 2, 820);
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

  // 塔罗牌（扇形布局，与主页一致）
  // —— 下移 ~50px，给多行 mystery.body 留空间 ——
  const cardW = 200;
  const cardH = (cardW / cardImgs[0].width) * cardImgs[0].height;
  const positions: Array<{ x: number; y: number; rot: number }> = [
    { x: POSTER_W / 2 - 200, y: 920, rot: -9 },
    { x: POSTER_W / 2, y: 860, rot: 0 },
    { x: POSTER_W / 2 + 200, y: 920, rot: 9 },
  ];

  cardImgs.forEach((img, i) => {
    const p = positions[i];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    // 金边
    const padX = 8;
    const padY = 6;
    ctx.fillStyle = "#9a7b40";
    ctx.fillRect(-cardW / 2 - padX, -cardH / 2 - padY, cardW + padX * 2, cardH + padY * 2);
    ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);
    // 内描边
    ctx.strokeStyle = "rgba(248, 241, 226, 0.65)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-cardW / 2 - padX + 2, -cardH / 2 - padY + 2, cardW + padX * 2 - 4, cardH + padY * 2 - 4);
    ctx.restore();
  });

  // 塔罗牌下文字（也下移 60px，给多行 body 留垂直空间）
  let y = 1140;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `20px ${MONO}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, "SEVENTY-FOUR MIRRORS · 七十四面镜子", POSTER_W / 2, y, 3);
  y += 32;
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 24px ${SERIF}`;
  ctx.fillText("总有一面，是你。", POSTER_W / 2, y);
  y += 56;

  // ===== 邀请话术 =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 26px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.fillText("看 TA 的关系牌——", POSTER_W / 2, y);
  y += 40;
  ctx.fillText("你的，会是哪一张？", POSTER_W / 2, y);
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
  ctx.fillText("看看你的关系牌", 130, qrBlockY + 70);

  ctx.fillStyle = ACCENT;
  ctx.font = `18px ${MONO}`;
  ctx.fillText("· 36 题 · 约 3 分钟", 130, qrBlockY + 110);
  ctx.fillText("· 无需注册 · TA 看不到答案", 130, qrBlockY + 138);

  y = qrBlockY + qrSize + 36;

  // 品牌签名
  ctx.fillStyle = ACCENT;
  ctx.font = `20px ${SERIF}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, "默契研究所", POSTER_W / 2, y, 8);
}

export default function SharePosterPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [data, setData] = useState<PosterData | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. 取测评结果（只为拿到 archetype — 用于随机塔罗种子，不展示）
        const res = await fetch(`/api/assessments/${sessionId}/complete`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "结果不存在");

        // 2. 创建/复用普通分享码
        const shareRes = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const shareJson = await shareRes.json();
        if (!shareRes.ok) throw new Error(shareJson.error || "分享创建失败");

        // 3. 再抓 sharer 详情（拿 oneLiner / archetype 名 / nickname，作为"神秘暗号"原料）
        const detailRes = await fetch(`/api/shares/${shareJson.code}`);
        const detailJson = await detailRes.json();
        if (!detailRes.ok) throw new Error(detailJson.error || "分享详情加载失败");
        const sharer = detailJson?.sharer ?? {};

        // 4. QR 指向首页（用户要求：扫码直达主页）
        const homeUrl = `${window.location.origin}/`;
        setShareUrl(homeUrl);

        // 5. 生成二维码
        const qr = await QRCode.toDataURL(homeUrl, {
          width: 512,
          margin: 1,
          color: { dark: "#2a2418", light: "#f5ede0" },
        });
        setQrDataUrl(qr);

        setData({
          archetype: json.archetype,
          fileNo: sessionId.slice(0, 6).toUpperCase(),
          oneLiner: sharer.oneLiner || "",
          archetypeName: sharer.archetype || "",
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    prepare();
  }, [sessionId]);

  // —— SharePosterActions 需要：把海报画到一个 canvas 上 ——
  const renderPosterAction = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (!data || !qrDataUrl) throw new Error("海报数据未就绪");
      await renderPoster(canvas, data, qrDataUrl);
    },
    [data, qrDataUrl]
  );

  const defaultCaption =
    "我们之间，是不是有什么总是重复？\n" +
    "来默契研究所，36 道题看看你的关系牌到底是什么。\n" +
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
        <Link href={`/result/${sessionId}`} className="btn-ghost">返回结果页</Link>
      </main>
    );
  }

  const lines = invitationLines();
  const cardIdxs = pickTarotIdx(data.archetype, TAROT_CARDS.length);
  const spread = cardIdxs.map((i) => TAROT_CARDS[i]);

  return (
    <main className="night-sky flex-1 px-5 py-6 sm:py-8 max-w-md mx-auto w-full safe-bottom relative overflow-hidden">
      <StarMap opacity={0.12} seed={3} />

      <div className="relative">
        {/* ===== 顶部品牌头（与主页一致） ===== */}
        <div className="text-center mb-5 fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="archive-label">Relationship Lab</span>
            <span className="w-8 h-px bg-[var(--border-dim)]" />
            <span className="file-number">No. {data.fileNo}</span>
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
            <span className="file-number">FILE · {data.fileNo}</span>
          </div>

          {/* 钩子话术（主页风） */}
          <div className="text-center space-y-2 mb-4">
            <p className="display-serif text-[15px] sm:text-base text-[var(--text-warm)] font-medium leading-relaxed">
              你们之间，有没有一种问题，
              <br />
              总是在重复发生？
            </p>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              也许问题不是谁对谁错——
              <br />
              只是你们理解「在乎」的方式不一样。
            </p>
          </div>

          {/* ===== 神秘暗号（方案 A：揭示一句 oneLiner，署名带 archetype） ===== */}
          <div className="my-5 fade-in-up" style={{ animationDelay: "0.12s" }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="flex-1 max-w-[60px] h-px bg-[var(--accent-dim)] opacity-50" />
              <span className="text-[var(--accent-dim)] text-[10px] tracking-[0.2em]">◆</span>
              <span className="flex-1 max-w-[60px] h-px bg-[var(--accent-dim)] opacity-50" />
            </div>
            {/* mystery.body 可能非常长（AI 润色版 80-150 字），
                必须截断，否则会挤压上下版面、撞出卡片。
                —— 最多 3 行 + 「展开」按钮（用 <details> 无 JS 状态） —— */}
            <OneLinerBlock
              body={wrapMystery(
                data?.oneLiner || null,
                data?.archetypeName
                  ? `—— 我们之间有一个「${data.archetypeName}」的人`
                  : "—— 我们已经测过默契研究所",
                FALLBACK_COUPLE
              ).body}
            />
            <p className="text-[11px] text-[var(--accent-dim)] text-center mt-2 italic">
              {wrapMystery(
                data?.oneLiner || null,
                data?.archetypeName
                  ? `—— 我们之间有一个「${data.archetypeName}」的人`
                  : "—— 我们已经测过默契研究所",
                FALLBACK_COUPLE
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

          {/* 邀请话术 */}
          <p className="display-serif text-sm sm:text-base text-[var(--text-warm)] text-center font-medium leading-snug mb-4 whitespace-pre-line">
            {lines.tag}
          </p>

          <OrnamentDivider className="mb-4" />

          {/* 小二维码 + 文案（左文右码，引导微信识别） */}
          {qrDataUrl && (
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex-1 min-w-0">
                <p className="display-serif text-sm text-[var(--text-warm)] font-medium leading-snug">
                  长按二维码，
                  <br />
                  看看你的关系牌
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  · 36 题 · 约 3 分钟
                  <br />
                  · 无需注册 · TA 看不到答案
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
          fileName={`默契研究所-${data.fileNo}.png`}
        />

        <div className="text-center mt-5">
          <Link
            href={`/result/${sessionId}`}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
          >
            ← 回到我的结果
          </Link>
        </div>

        <HomeFooter />
      </div>
    </main>
  );
}