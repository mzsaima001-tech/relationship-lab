"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { CompassDial, OrnamentDivider, StarMap } from "@/app/components/decor";
import HomeFooter from "@/app/components/HomeFooter";
import { RadarChart } from "@/app/components/RadarChart";
import { type PersonalityType } from "@/lib/personality/types";
import { PersonalityCard } from "@/lib/personality/cards/PersonalityCard";
import {
  TOTEM_ELEMENT_KEY,
  ELEMENT_PALETTE,
  TOTEM_MOON_PHASE,
  MOON_PHASE_MAP,
  TOTEM_MAP,
} from "@/lib/personality/cards/totem";

// =====================================================
// 人格测试分享海报页 /share/personality/[code]
// —— 重设计：借鉴主页布局（标题 + 钩子话术 + 塔罗图案）
// —— 二维码缩小至 88px，左文案右码，引导微信识别 / 长按保存
// —— 海报本身可长按保存到相册，微信会自动识别图中二维码
// =====================================================

const POSTER_W = 900;
const POSTER_H = 1420;

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

/** 主钩子话术 — 借鉴主页那种"扎心钩子"，让收到的人有冲动扫码 */
function invitationLines(primaryCn: string): { hook: string; sub: string; tag: string } {
  return {
    hook: "你们之间，有没有一种问题，总是在重复发生？",
    sub: "也许问题不是谁对谁错。",
    tag: `我是「${primaryCn}」——你呢？`,
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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 简化版 PersonalityCard（Canvas 手绘：渐变 + 图腾 + 名字 + tagline） */
function drawPersonalityCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  type: PersonalityType,
  cx: number,
  topY: number,
  cardW: number,
  cardH: number
) {
  const palette = ELEMENT_PALETTE[TOTEM_ELEMENT_KEY[type]];
  const phaseIndex = TOTEM_MOON_PHASE[type].phaseIndex;

  const left = cx - cardW / 2;
  const top = topY;
  const right = left + cardW;
  const bottom = top + cardH;
  const radius = 22;

  // 卡片径向渐变
  const grad = ctx.createRadialGradient(cx, top + cardH / 2, 40, cx, top + cardH / 2, cardW * 0.7);
  grad.addColorStop(0, palette.bg);
  grad.addColorStop(0.7, palette.bgEdge);
  grad.addColorStop(1, palette.bgEdge);

  ctx.beginPath();
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(left, top, cardW, cardH, radius);
  } else {
    ctx.rect(left, top, cardW, cardH);
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = palette.accent + "55";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 左上大圆装饰
  ctx.save();
  ctx.beginPath();
  ctx.arc(left - 50, top - 50, 90, 0, Math.PI * 2);
  ctx.clip();
  const leftOrbGrad = ctx.createRadialGradient(left - 50, top - 50, 0, left - 50, top - 50, 90);
  leftOrbGrad.addColorStop(0, palette.sideAccentLeft + "55");
  leftOrbGrad.addColorStop(1, palette.sideAccentLeft + "00");
  ctx.fillStyle = leftOrbGrad;
  ctx.fillRect(left - 140, top - 140, 180, 180);
  ctx.restore();

  // 右上大圆装饰
  ctx.save();
  ctx.beginPath();
  ctx.arc(right + 60, top - 60, 110, 0, Math.PI * 2);
  ctx.clip();
  const rightOrbGrad = ctx.createRadialGradient(right + 60, top - 60, 0, right + 60, top - 60, 110);
  rightOrbGrad.addColorStop(0, palette.sideAccent + "50");
  rightOrbGrad.addColorStop(1, palette.sideAccent + "00");
  ctx.fillStyle = rightOrbGrad;
  ctx.fillRect(right - 50, top - 170, 230, 230);
  ctx.restore();

  const SERIF = `"Noto Serif SC", "Songti SC", "SimSun", Georgia, serif`;
  const MONO = `"Courier New", monospace`;

  // 月相序号
  ctx.fillStyle = palette.accent;
  ctx.font = `18px ${MONO}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`第${phaseIndex}序`, left + 24, top + 24);

  // 月相 glyph
  ctx.font = `28px ${MONO}`;
  ctx.textAlign = "right";
  const moonGlyph = ["●","◐","◑","◒","◓","◔","◐","◑","◒","◓","◔","○","◐","◑","●"][phaseIndex - 1] || "●";
  ctx.fillText(moonGlyph, right - 24, top + 20);

  // 简化图腾（双圈 + 十字 + 中心点）
  drawSimpleTotemOnCanvas(ctx, type, cx, top + 110, palette.accent);

  // 五圆点
  drawFiveDotsOnCanvas(ctx, cx, top + 200, palette.accent);

  // 名字
  ctx.fillStyle = palette.ink;
  ctx.font = `bold 38px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(personalityCnName(type), cx, top + 250);

  // tagline
  ctx.fillStyle = palette.accent;
  ctx.font = `16px ${MONO}`;
  ctx.textAlign = "left";
  ctx.fillText("✦", left + 36, top + 300);
  ctx.fillStyle = palette.ink;
  ctx.font = `18px ${SERIF}`;
  const tagline = personalityTagline(type).slice(0, 22);
  ctx.fillText(tagline, left + 60, top + 302);

  // 底部意象副标
  const descY = bottom - 38;
  ctx.strokeStyle = palette.accent + "55";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(left + 28, descY, cardW - 56, 26, 6);
  } else {
    ctx.rect(left + 28, descY, cardW - 56, 26);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.font = `16px ${MONO}`;
  ctx.textAlign = "center";
  ctx.fillText(personalityDescriptor(type), cx, descY + 17);
}

function drawSimpleTotemOnCanvas(
  ctx: CanvasRenderingContext2D,
  type: PersonalityType,
  cx: number,
  cy: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 50); ctx.lineTo(cx, cy + 50);
  ctx.moveTo(cx - 50, cy); ctx.lineTo(cx + 50, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.font = `bold 14px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(personalityCnName(type).slice(0, 2), cx, cy + 60);

  ctx.restore();
}

function drawFiveDotsOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string
) {
  const sizes = [4, 6, 8, 6, 4];
  const opacities = [0.3, 0.6, 1, 0.6, 0.3];
  const gap = 8;
  const totalW = sizes.reduce((a, b) => a + b, 0) + gap * (sizes.length - 1);
  let x = cx - totalW / 2;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x + sizes[i] / 2, cy, sizes[i] / 2, 0, Math.PI * 2);
    ctx.globalAlpha = opacities[i];
    ctx.fillStyle = color;
    ctx.fill();
    x += sizes[i] + gap;
  }
  ctx.restore();
}

function personalityCnName(type: PersonalityType): string {
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

function personalityTagline(type: PersonalityType): string {
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

function personalityDescriptor(type: PersonalityType): string {
  const map: Record<string, string> = {
    dark_reef: "暗礁 · 水下支点",
    spark: "引子 · 一点星火",
    departure: "启程 · 稳行一步",
    scout: "探路 · 先见于远",
    drifter: "漫游 · 立于界间",
    glimmer: "微光 · 照入暗角",
    strategist: "战略 · 把定方向",
    observer: "观察 · 看得更多",
    guardian: "守护 · 为值得者",
    coordinator: "协调 · 连结彼此",
    creator: "创造 · 无法雷同",
    explorer: "探索 · 仍在路上",
    doer: "行动 · 先动起来",
    leader: "掌控 · 定下调子",
    whole: "全貌 · 览尽来去",
    dark_reef__spark: "暗礁·引子 · 暗处将燃",
    spark__departure: "引子·启程 · 星火初行",
    departure__scout: "启程·探路 · 行而有思",
    scout__drifter: "探路·漫游 · 多路并行",
    drifter__glimmer: "漫游·微光 · 界间有光",
    glimmer__strategist: "微光·战略 · 光成格局",
    strategist__observer: "战略·观察 · 判而待之",
    observer__guardian: "观察·守护 · 见而护之",
    guardian__coordinator: "守护·协调 · 护而联之",
    coordinator__creator: "协调·创造 · 联而新作",
    creator__explorer: "创造·探索 · 作而行远",
    explorer__doer: "探索·行动 · 远而即动",
    doer__leader: "行动·掌控 · 动而掌舵",
    leader__whole: "掌控·全貌 · 掌而览尽",
  };
  return map[type] || personalityCnName(type);
}

/**
 * Canvas 海报渲染（导出 PNG 用）—— 主页风：标题 + 钩子 + 雷达 + 人格卡 + 小二维码
 */
async function renderPoster(
  canvas: HTMLCanvasElement,
  data: PersonalityShareData,
  qrDataUrl: string
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const qrImg = await loadImage(qrDataUrl);

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

  // 顶部档案头
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `18px ${MONO}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawSpacedText(ctx, `No. ${data.sharer.fileNo}`, POSTER_W / 2, 100, 3);

  // ===== 主页标题区（顶部 brand block） =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 56px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.fillText("默契研究所", POSTER_W / 2, 180);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = `18px ${MONO}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, "RELATIONSHIP LAB", POSTER_W / 2, 222, 6);

  // 装饰线
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
  // 中间菱形
  ctx.beginPath();
  ctx.moveTo(POSTER_W / 2, lineY - 7);
  ctx.lineTo(POSTER_W / 2 + 7, lineY);
  ctx.lineTo(POSTER_W / 2, lineY + 7);
  ctx.lineTo(POSTER_W / 2 - 7, lineY);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ===== 钩子话术（主页那种扎心钩子） =====
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

  // ===== 罗盘底纹 + 雷达图 =====
  ctx.save();
  ctx.translate(POSTER_W / 2, 700);
  ctx.strokeStyle = ACCENT;
  ctx.globalAlpha = 0.14;
  for (const r of [220, 200, 140]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = r === 220 ? 1.4 : 0.7;
    ctx.stroke();
  }
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const r1 = i % 6 === 0 ? 188 : 196;
    ctx.beginPath();
    ctx.moveTo(r1 * Math.sin(a), -r1 * Math.cos(a));
    ctx.lineTo(206 * Math.sin(a), -206 * Math.cos(a));
    ctx.lineWidth = i % 6 === 0 ? 1 : 0.4;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // 雷达小图（半径 150）
  drawRadarOnCanvas(ctx, data.sharer.scores as any, POSTER_W / 2, 700, 150);

  let y = 700 + 200 + 30;

  // ===== PersonalityCard =====
  if (data.sharer.primaryType) {
    drawPersonalityCardOnCanvas(ctx, data.sharer.primaryType as PersonalityType, POSTER_W / 2, y, 320, 380);
    y += 380 + 30;
  }

  // ===== 「我是 XXX —— 你呢？」 =====
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 28px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.fillText(`我是「${data.sharer.primaryCn}」——你呢？`, POSTER_W / 2, y);
  y += 56;

  // ===== 小二维码 + 文案（左文右码布局） =====
  const qrSize = 150;
  const qrBlockY = y;
  const qrX = POSTER_W / 2 + 30;

  // 二维码白底
  ctx.fillStyle = "#f5ede0";
  ctx.fillRect(qrX, qrBlockY, qrSize, qrSize);
  ctx.drawImage(qrImg, qrX, qrBlockY, qrSize, qrSize);

  // 左侧文案
  ctx.textAlign = "left";
  ctx.fillStyle = TEXT_WARM;
  ctx.font = `bold 22px ${SERIF}`;
  ctx.fillText("长按二维码，", 130, qrBlockY + 38);
  ctx.fillText("看看你在关系里的样子", 130, qrBlockY + 70);

  ctx.fillStyle = ACCENT;
  ctx.font = `18px ${MONO}`;
  ctx.fillText("· 36 题 · 约 5 分钟", 130, qrBlockY + 110);
  ctx.fillText("· 无需注册 · 基础结果免费", 130, qrBlockY + 138);

  y = qrBlockY + qrSize + 40;

  // 品牌签名
  ctx.fillStyle = ACCENT;
  ctx.font = `20px ${SERIF}`;
  ctx.textAlign = "center";
  drawSpacedText(ctx, "我到底什么性格", POSTER_W / 2, y, 8);
}

function drawRadarOnCanvas(
  ctx: CanvasRenderingContext2D,
  scores: Record<string, number>,
  cx: number,
  cy: number,
  radius: number
) {
  const DIMS_CN = ["社交", "理性", "规划", "风险", "掌控", "敏锐"];
  const angleFor = (i: number) => -Math.PI / 2 + (Math.PI * 2 * i) / DIMS_CN.length;
  const dims = Object.keys(scores);

  // 背景网格
  ctx.strokeStyle = "rgba(201, 169, 110, 0.3)";
  ctx.lineWidth = 0.8;
  for (const ratio of [0.33, 0.66, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= dims.length; i++) {
      const a = angleFor(i % dims.length);
      const x = cx + Math.cos(a) * radius * ratio;
      const y = cy + Math.sin(a) * radius * ratio;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 轴线
  ctx.strokeStyle = "rgba(201, 169, 110, 0.2)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < dims.length; i++) {
    const a = angleFor(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.stroke();
  }

  // 数据层
  ctx.beginPath();
  for (let i = 0; i < dims.length; i++) {
    const a = angleFor(i);
    const r = (scores[dims[i]] / 100) * radius;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(201, 169, 110, 0.18)";
  ctx.fill();
  ctx.strokeStyle = "#c9a96e";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = "#c9a96e";
  for (let i = 0; i < dims.length; i++) {
    const a = angleFor(i);
    const r = (scores[dims[i]] / 100) * radius;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 标签
  ctx.fillStyle = "#e8e0d4";
  ctx.font = `18px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < dims.length; i++) {
    const a = angleFor(i);
    const lx = cx + Math.cos(a) * (radius + 32);
    const ly = cy + Math.sin(a) * (radius + 32);
    ctx.fillText(DIMS_CN[i], lx, ly);
  }
}

export default function PersonalitySharePosterPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [data, setData] = useState<PersonalityShareData | null>(null);
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
        const res = await fetch(`/api/shares/${code}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "分享不存在");
        if (json.shareType !== "personality") {
          throw new Error("该分享不是人格测试类型");
        }

        const url = `${window.location.origin}${`/s/${code}`}`;
        setShareUrl(url);
        const qr = await QRCode.toDataURL(url, {
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

  const handleDownload = async () => {
    if (!canvasRef.current || !data || !qrDataUrl) return;
    setDownloading(true);
    try {
      await renderPoster(canvasRef.current, data, qrDataUrl);
      const link = document.createElement("a");
      link.download = `默契研究所-${data.sharer.primaryCn}.png`;
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

  /** 微信分享 — 走 URL scheme（唤起微信 / 复制文案提示用户手贴） */
  const handleWechatShare = async () => {
    // 微信内置浏览器无法直接调 share API；其他场景也只能走复制 + 手动粘贴
    const text = `我在默契研究所测出自己是「${data?.sharer.primaryCn}」——你也来测测？\n${shareUrl}`;
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
        <Link href="/personality" className="btn-ghost">返回人格测试</Link>
      </main>
    );
  }

  const lines = invitationLines(data.sharer.primaryCn);

  return (
    <main className="night-sky flex-1 px-5 py-6 sm:py-8 max-w-md mx-auto w-full safe-bottom relative overflow-hidden">
      <StarMap opacity={0.12} seed={3} />

      <div className="relative">
        {/* ===== 顶部品牌头（与主页一致） ===== */}
        <div className="text-center mb-5 fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="archive-label">Relationship Lab</span>
            <span className="w-8 h-px bg-[var(--border-dim)]" />
            <span className="file-number">No. {data.sharer.fileNo}</span>
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
            <span className="file-number">FILE · {data.sharer.fileNo}</span>
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

          {/* 罗盘 + 雷达主图 */}
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute pointer-events-none">
              <CompassDial size={170} opacity={0.16} />
            </div>
            <div className="w-[180px] h-[180px]">
              <RadarChart scores={data.sharer.scores} size={180} />
            </div>
          </div>

          {/* 核心人格卡（小尺寸） */}
          {data.sharer.primaryType && (
            <div className="flex justify-center mb-4">
              <PersonalityCard
                type={data.sharer.primaryType as PersonalityType}
                userScores={data.sharer.scores as any}
                matchScore={data.sharer.matchScore}
                size="sm"
                label="primary"
              />
            </div>
          )}

          {/* 「我是 XXX —— 你呢？」 */}
          <p className="display-serif text-sm sm:text-base text-[var(--text-warm)] text-center font-medium leading-snug mb-4">
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
                  看看你是哪一种
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  · 36 题 · 约 5 分钟
                  <br />
                  · 无需注册 · 基础免费
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
              {copied ? "✓ 已复制链接" : "复制分享链接"}
            </button>
            <button onClick={handleWechatShare} className="btn-ghost flex-1 text-sm">
              {copied ? "✓ 已复制文案" : "复制给微信好友"}
            </button>
          </div>
          <div className="text-center">
            <Link
              href={`/personality/report/${data.testId}`}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors"
            >
              ← 回到我的完整报告
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