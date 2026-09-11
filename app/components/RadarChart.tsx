"use client";

/**
 * 6 维人格雷达图（纯 SVG，无依赖）
 * - 入参：scores { social, rationality, planning, risk, dominance, sensitivity } 各 0-100
 * - 等距六边形网格 + 数据多边形 + 数据点
 */
export interface RadarChartProps {
  scores: {
    social: number;
    rationality: number;
    planning: number;
    risk: number;
    dominance: number;
    sensitivity: number;
  };
  labels?: string[]; // 6 个维度标签，默认中文
  size?: number;
  className?: string;
}

const DEFAULT_LABELS = ["社交能量", "理性决策", "计划倾向", "风险倾向", "主导性", "情绪感知"];

export function RadarChart({
  scores,
  labels = DEFAULT_LABELS,
  size = 280,
  className,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const sides = 6;
  const values = [
    scores.social,
    scores.rationality,
    scores.planning,
    scores.risk,
    scores.dominance,
    scores.sensitivity,
  ];

  // 多边形顶点（数据）
  const dataPoints = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const r = (v / 100) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  });
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + " Z";

  // 网格环（每 25 一圈）
  const rings = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const pts: string[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const x = cx + radius * ratio * Math.cos(angle);
      const y = cy + radius * ratio * Math.sin(angle);
      pts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
    }
    pts.push("Z");
    return pts.join(" ");
  });

  // 标签位置
  const labelPoints = labels.map((label, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = cx + (radius + 18) * Math.cos(angle);
    const y = cy + (radius + 18) * Math.sin(angle);
    let anchor: "start" | "middle" | "end" = "middle";
    if (Math.abs(Math.cos(angle)) > 0.5) {
      anchor = Math.cos(angle) > 0 ? "start" : "end";
    }
    return { label, x, y, anchor };
  });

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
      {Array.from({ length: sides }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + radius * Math.cos(angle)}
            y2={cy + radius * Math.sin(angle)}
            stroke="rgba(201,169,110,0.18)"
            strokeWidth={1}
          />
        );
      })}
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