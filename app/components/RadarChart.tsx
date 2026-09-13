"use client";

import { useEffect, useState } from "react";

/**
 * 6 维人格雷达图（纯 SVG，无依赖）
 * - 入参：scores 接受 V3 维度（G/X/I/F/S/E）或 V1 维度（social/rationality/planning/risk/dominance/sensitivity），
 *   各 0-100 整数
 * - 等距六边形网格 + 数据多边形 + 数据点
 *
 * Hydration 安全：所有 Math.PI 计算放在 useEffect 之后，
 * 避免 SSR 与 iOS Safari / WeChat WebView 客户端的浮点精度差异触发 hydration mismatch。
 */
type ScoresV3 = Partial<{ G: number; X: number; I: number; F: number; S: number; E: number }>;
type ScoresV1 = Partial<{
  social: number;
  rationality: number;
  planning: number;
  risk: number;
  dominance: number;
  sensitivity: number;
}>;

export interface RadarChartProps {
  scores: ScoresV3 | ScoresV1 | Record<string, number>;
  labels?: string[]; // 6 个维度标签，默认中文
  size?: number;
  className?: string;
}

// 默认标签按 V3 顺序：表达力/应对力/认可需求/方向感/自主性/情绪觉知
const DEFAULT_LABELS = ["表达力", "应对力", "认可需求", "方向感", "自主性", "情绪觉知"];

// V3 → V1 顺序映射：[G, X, I, F, S, E] → [social, rationality, risk, planning, dominance, sensitivity]
const V3_TO_V1_KEYS = ["social", "rationality", "risk", "planning", "dominance", "sensitivity"] as const;
const V3_KEYS = ["G", "X", "I", "F", "S", "E"] as const;

export function RadarChart({
  scores,
  labels = DEFAULT_LABELS,
  size = 280,
  className,
}: RadarChartProps) {
  // 客户端 mount guard：先渲染一个零尺寸占位，mount 后再填充真实坐标。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const sides = 6;

  // 兼容 V3 key（G/X/I/F/S/E）和 V1 key（social/risk/...）：先按 V3 取，取不到按 V1 映射取
  const scoresAny = scores as Record<string, number>;
  const values = V3_KEYS.map((k, i) => {
    const v3 = scoresAny[k];
    if (typeof v3 === "number") return v3;
    const v1 = scoresAny[V3_TO_V1_KEYS[i]];
    return typeof v1 === "number" ? v1 : 0;
  });

  // 多边形顶点（数据）
  const dataPoints = mounted ? values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const r = (v / 100) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  }) : [];
  const dataPath = mounted ? dataPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + " Z" : "";

  // 网格环（每 25 一圈）
  const rings = mounted ? [0.25, 0.5, 0.75, 1].map((ratio) => {
    const pts: string[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const x = cx + radius * ratio * Math.cos(angle);
      const y = cy + radius * ratio * Math.sin(angle);
      pts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
    }
    pts.push("Z");
    return pts.join(" ");
  }) : [];

  // 标签位置
  const labelPoints = mounted ? labels.map((label, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = cx + (radius + 18) * Math.cos(angle);
    const y = cy + (radius + 18) * Math.sin(angle);
    let anchor: "start" | "middle" | "end" = "middle";
    if (Math.abs(Math.cos(angle)) > 0.5) {
      anchor = Math.cos(angle) > 0 ? "start" : "end";
    }
    return { label, x, y, anchor };
  }) : [];

  // 轴线（同样需要 mount 守卫，避免 SSR/CSR 浮点差异触发 hydration mismatch）
  const axes = mounted ? Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return {
      x2: cx + radius * Math.cos(angle),
      y2: cy + radius * Math.sin(angle),
    };
  }) : [];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="人格六维雷达图"
    >
      {/* 网格 */}
      {rings.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(201,169,110,0.18)"
          strokeWidth={1}
        />
      ))}
      {/* 轴线 */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={a.x2}
          y2={a.y2}
          stroke="rgba(201,169,110,0.18)"
          strokeWidth={1}
        />
      ))}
      {/* 数据多边形 */}
      <path d={dataPath} fill="rgba(201,169,110,0.28)" stroke="#c9a96e" strokeWidth={1.5} />
      {/* 数据点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#c9a96e" />
      ))}
      {/* 标签 */}
      {labelPoints.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor={p.anchor}
          dominantBaseline="middle"
          fontSize={11}
          fill="rgba(245,237,224,0.85)"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}