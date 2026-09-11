"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { CompassDial, OrnamentDivider, StarMap, TarotCard } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import { tarotFor, tarotImage } from "@/lib/reports/tarot";

// ---------- 类型 ----------

interface PosterData {
  nickname: string;
  archetype: string;
  tags: string[];
  oneLiner: string;
  fileNo: string;
}

// ---------- 邀请话术（好奇驱动，不攀比、不提塔罗） ----------

function invitationLines(nickname: string, archetype: string): string[] {
  return [
    `${nickname} 在关系里是「${archetype}」`,
    "每个人在关系里的样子都不一样——",
    "你的，会是什么模样？",
  ];
}

// ---------- Canvas 海报绘制 ----------

const POSTER_W = 900;
const POSTER_H = 1420;

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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 伪随机（种子固定，星点位置每次渲染一致） */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

async function renderPoster(
  canvas: HTMLCanvasElement,
  data: PosterData,
  qrDataUrl: string
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const tarot = tarotFor(data.archetype);
  const [cardImg, qrImg] = await Promise.all([
    loadImage(tarotImage(tarot.slug)),
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
  const fileNo = `No. ${data.fileNo}`;
  drawSpacedText(ctx, fileNo, POSTER_W / 2, 100, 3);

  // ---- 罗盘底纹（简化圆环） ----
  ctx.save();
  ctx.translate(POSTER_W / 2, 430);
  ctx.strokeStyle = ACCENT;
  ctx.globalAlpha = 0.16;
  for (const r of [240, 218, 150]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = r === 240 ? 1.6 : 0.8;
    ctx.stroke();
  }
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const r1 = i % 6 === 0 ? 200 : 208;
    ctx.beginPath();
    ctx.moveTo(r1 * Math.sin(a), -r1 * Math.cos(a));
    ctx.lineTo(218 * Math.sin(a), -218 * Math.cos(a));
    ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.5;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // ---- 牌面 ----
  const cardW = 330;
  const cardH = (cardW / cardImg.width) * cardImg.height;
  const cardX = (POSTER_W - cardW) / 2;
  const cardY = 240;
  ctx.save();
  ctx.shadowColor = "rgba(201, 169, 110, 0.35)";
  ctx.shadowBlur = 40;
  ctx.drawImage(cardImg, cardX, cardY, cardW, cardH);
  ctx.restore();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(cardX - 8, cardY - 8, cardW + 16, cardH + 16);

  let y = cardY + cardH + 62;

  // ---- 牌名 ----
  ctx.fillStyle = ACCENT;
  ctx.font = `40px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.fillText(`「${tarot.cardTitle}」`, POSTER_W / 2, y);
  y += 36;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `17px ${MONO}`;
  drawSpacedText(ctx, tarot.cardTitleEn.toUpperCase(), POSTER_W / 2, y, 2);
  y += 40;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `italic 20px ${SERIF}`;
  ctx.fillText(tarot.motto, POSTER_W / 2, y);
  y += 48;

  // ---- 分隔线（菱形） ----
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(180, y);
  ctx.lineTo(POSTER_W / 2 - 24, y);
  ctx.moveTo(POSTER_W / 2 + 24, y);
  ctx.lineTo(POSTER_W - 180, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(POSTER_W / 2, y - 8);
  ctx.lineTo(POSTER_W / 2 + 8, y);
  ctx.lineTo(POSTER_W / 2, y + 8);
  ctx.lineTo(POSTER_W / 2 - 8, y);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
  y += 48;

  // ---- 答题人 ----
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `30px ${SERIF}`;
  ctx.fillText(data.nickname, POSTER_W / 2, y);
  y += 42;
  ctx.fillStyle = ACCENT;
  ctx.font = `26px ${SERIF}`;
  ctx.fillText(`「${data.archetype}」`, POSTER_W / 2, y);
  y += 40;

  // 标签
  if (data.tags.length > 0) {
    ctx.font = `17px ${SERIF}`;
    const tags = data.tags.slice(0, 4);
    const pillPads = 22;
    const widths = tags.map((t) => ctx.measureText(t).width + pillPads * 2);
    const gap = 14;
    let tx = (POSTER_W - (widths.reduce((a, b) => a + b, 0) + gap * (tags.length - 1))) / 2;
    tags.forEach((t, i) => {
      ctx.strokeStyle = ACCENT_DIM;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      const h = 34;
      const r = h / 2;
      ctx.beginPath();
      ctx.roundRect(tx, y - h / 2, widths[i], h, r);
      ctx.stroke();
      ctx.fillStyle = TEXT_MUTED;
      ctx.fillText(t, tx + widths[i] / 2, y + 1);
      ctx.globalAlpha = 1;
      tx += widths[i] + gap;
    });
    y += 56;
  }

  // ---- 邀请话术 ----
  const lines = invitationLines(data.nickname, data.archetype);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `20px ${SERIF}`;
  ctx.fillText(lines[1], POSTER_W / 2, y);
  y += 36;
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 27px ${SERIF}`;
  ctx.fillText(lines[2], POSTER_W / 2, y);
  y += 50;

  // ---- 二维码 ----
  const qrSize = 190;
  const qrX = (POSTER_W - qrSize) / 2;
  ctx.fillStyle = "#f5ede0";
  ctx.fillRect(qrX - 12, y - 12, qrSize + 24, qrSize + 24);
  ctx.drawImage(qrImg, qrX, y, qrSize, qrSize);
  y += qrSize + 44;

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `18px ${SERIF}`;
  ctx.fillText("长按识别二维码，看看你在关系里的样子", POSTER_W / 2, y);
  y += 44;

  // ---- 底部品牌 ----
  ctx.fillStyle = ACCENT;
  ctx.font = `20px ${SERIF}`;
  drawSpacedText(ctx, "默契研究所", POSTER_W / 2, y, 8);
}

// ---------- 页面 ----------

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
        // 1. 取测评结果（复用 complete 接口，免费字段即可）
        const res = await fetch(`/api/assessments/${sessionId}/complete`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "结果不存在");

        // 2. 创建/复用普通分享码（不进入双人模式）
        const shareRes = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const shareJson = await shareRes.json();
        if (!shareRes.ok) throw new Error(shareJson.error || "分享创建失败");

        const url = `${window.location.origin}${shareJson.url}`;
        setShareUrl(url);

        // 3. 生成二维码（深色模块用 accent 深色，兼容纸底）
        const qr = await QRCode.toDataURL(url, {
          width: 512,
          margin: 1,
          color: { dark: "#2a2418", light: "#f5ede0" },
        });
        setQrDataUrl(qr);

        setData({
          nickname: json.nickname,
          archetype: json.archetype,
          tags: json.tags ?? [],
          oneLiner: json.narrative?.oneLiner ?? "",
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
      link.download = `默契研究所-${data.nickname}的关系牌.png`;
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

  const tarot = tarotFor(data.archetype);
  const lines = invitationLines(data.nickname, data.archetype);

  return (
    <main className="night-sky flex-1 px-5 py-6 max-w-sm mx-auto w-full">
      <StarMap opacity={0.12} seed={2} />
      <div className="relative">
        {/* ===== 海报（单屏紧凑版） ===== */}
        <div
          className="relative border border-[var(--accent-dim)] rounded-sm px-5 pt-5 pb-4 mb-4 fade-in-up"
          style={{ background: "linear-gradient(180deg,#16130f,#100e0a)" }}
        >
          {/* 罗盘 + 牌面（缩小） */}
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute pointer-events-none">
              <CompassDial size={170} opacity={0.16} />
            </div>
            <TarotCard
              image={tarotImage(tarot.slug)}
              cardTitle={tarot.cardTitle}
              cardTitleEn={tarot.cardTitleEn}
              width={104}
              elevated
            />
          </div>
          <p className="text-center text-[11px] text-[var(--text-muted)] italic display-serif mb-3">
            「{tarot.motto}」
          </p>

          <OrnamentDivider className="mb-3" />

          {/* 答题人 + 原型 + 标签（紧凑） */}
          <div className="text-center mb-2.5">
            <p className="display-serif text-base text-[var(--text-warm)] leading-snug">
              {data.nickname}
              <span className="text-[var(--accent)]">「{data.archetype}」</span>
            </p>
            {data.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {data.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] text-[var(--text-muted)] border border-[var(--border-dim)] rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 邀请话术 */}
          <div className="text-center mb-3">
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{lines[1]}</p>
            <p className="display-serif text-sm text-[var(--text-warm)] mt-1 font-medium">
              {lines[2]}
            </p>
          </div>

          {/* 二维码 */}
          {qrDataUrl && (
            <div className="flex flex-col items-center">
              <div className="bg-[#f5ede0] p-2 rounded-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="分享二维码" className="w-24 h-24 block" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                长按识别二维码，看看你在关系里的样子
              </p>
            </div>
          )}
        </div>

        {/* ===== 操作区（紧凑） ===== */}
        <div className="space-y-2 fade-in-up" style={{ animationDelay: "0.1s" }}>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary w-full">
            {downloading ? "正在生成..." : "保存海报图片 →"}
          </button>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-ghost flex-1 text-sm">
              {copied ? "已复制链接" : "复制分享链接"}
            </button>
            <Link href={`/result/${sessionId}`} className="btn-ghost flex-1 text-center text-sm">
              返回结果页
            </Link>
          </div>
        </div>

        {/* 隐藏画布：用于导出 PNG */}
        <canvas ref={canvasRef} width={POSTER_W} height={POSTER_H} className="hidden" />

        <HomeFooter />
      </div>
    </main>
  );
}
