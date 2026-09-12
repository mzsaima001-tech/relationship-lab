"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { CompassDial, OrnamentDivider, StarMap } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import { TAROT_CARDS, tarotImage } from "@/lib/reports/tarot";

// =====================================================
// 默契测试分享海报页 /share/[sessionId]
// —— 重设计：去掉分享人信息（昵称/原型/标签），借鉴主页布局
// —— 主图：首页「十一面镜像」塔罗牌阵（随机抽 3 张），不暴露分享人具体身份
// —— 二维码缩小至 88px，左文案右二维码；可长按保存 + 微信识别
// =====================================================

const POSTER_W = 900;
const POSTER_H = 1420;

interface PosterData {
  archetype: string;
  fileNo: string;
}

/** 钩子话术 — 主页同款扎心钩子 + 邀请话术 */
function invitationLines(): { hook: string; sub: string; tag: string } {
  return {
    hook: "你们之间，有没有一种问题，总是在重复发生？",
    sub: "也许问题不是谁对谁错——\n只是你们理解「在乎」的方式不一样。",
    tag: "看 TA 的关系牌——\n你的，会是哪一张？",
  };
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
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

  // ===== 罗盘底纹 + 塔罗牌阵（扇形悬浮） =====
  ctx.save();
  ctx.translate(POSTER_W / 2, 720);
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
  const cardW = 200;
  const cardH = (cardW / cardImgs[0].width) * cardImgs[0].height;
  const positions: Array<{ x: number; y: number; rot: number }> = [
    { x: POSTER_W / 2 - 200, y: 820, rot: -9 },
    { x: POSTER_W / 2, y: 760, rot: 0 },
    { x: POSTER_W / 2 + 200, y: 820, rot: 9 },
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

  // 塔罗牌下文字
  let y = 1080;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `20px ${MONO}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, "ELEVEN MIRRORS · 十一面镜像", POSTER_W / 2, y, 3);
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
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. 取测评结果（只为拿到 archetype — 用于随机塔罗种子，不展示）
        const res = await fetch(`/api/assessments/${sessionId}/complete`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "结果不存在");

        // 2. 创建/复用普通分享码（仅用于累计访问量，扫码目标为首页）
        const shareRes = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const shareJson = await shareRes.json();
        if (!shareRes.ok) throw new Error(shareJson.error || "分享创建失败");

        // 3. QR 指向首页（用户要求：扫码直达主页）
        const homeUrl = `${window.location.origin}/`;
        setShareUrl(homeUrl);

        // 4. 生成二维码
        const qr = await QRCode.toDataURL(homeUrl, {
          width: 512,
          margin: 1,
          color: { dark: "#2a2418", light: "#f5ede0" },
        });
        setQrDataUrl(qr);

        setData({
          archetype: json.archetype,
          fileNo: sessionId.slice(0, 6).toUpperCase(),
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    prepare();
  }, [sessionId]);

  const handleDownload = async () => {
    if (!canvasRef.current || !data || !qrDataUrl) return;
    setDownloading(true);
    try {
      await renderPoster(canvasRef.current, data, qrDataUrl);
      const link = document.createElement("a");
      link.download = `默契研究所-关系牌.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } catch (err: any) {
      setError(err.message || "海报生成失败");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** 复制微信分享文案（唤起微信 / 复制文案提示用户手贴） */
  const handleWechatShare = async () => {
    const text = `我们之间，是不是有什么总是重复？\n来默契研究所，看看你的关系牌是什么。\n${window.location.origin}/`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

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
            十一面镜像，总有一面是你
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

        {/* ===== 操作区 ===== */}
        <div className="space-y-2 fade-in-up" style={{ animationDelay: "0.2s" }}>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary w-full">
            {downloading ? "正在生成..." : "保存海报图片（长按图片也可保存）→"}
          </button>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-ghost flex-1 text-sm">
              {copied ? "✓ 已复制链接" : "复制首页链接"}
            </button>
            <button onClick={handleWechatShare} className="btn-ghost flex-1 text-sm">
              {copied ? "✓ 已复制文案" : "复制给微信好友"}
            </button>
          </div>
          <div className="text-center">
            <Link
              href={`/result/${sessionId}`}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
            >
              ← 回到我的结果
            </Link>
          </div>
        </div>

        {/* 操作提示（移动端长按提示） */}
        <p className="text-[10px] text-[var(--text-muted)] text-center mt-4 leading-relaxed">
          💡 手机端可长按上方海报图片，
          <br />
          保存到相册或转发给朋友（微信会自动识别二维码）
        </p>

        {/* 隐藏画布：用于导出 PNG */}
        <canvas ref={canvasRef} width={POSTER_W} height={POSTER_H} className="hidden" />

        <HomeFooter />
      </div>
    </main>
  );
}