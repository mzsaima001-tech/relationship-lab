// =====================================================
// 默契研究所 — SVG 装饰层组件
// 罗盘刻度 / 星图连线 / 信纸边框 / 分隔花纹 / 塔罗牌卡
// 纯展示组件，无状态，可在服务端或客户端使用
// =====================================================

/** 罗盘刻度盘（可缓慢自转） */
export function CompassDial({
  size = 220,
  className = "",
  spin = true,
  opacity = 0.35,
}: {
  size?: number;
  className?: string;
  spin?: boolean;
  opacity?: number;
}) {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 5 * Math.PI) / 180;
    const major = i % 6 === 0; // 每 30° 一根长刻度
    const r1 = major ? 78 : 84;
    const x1 = 100 + r1 * Math.sin(angle);
    const y1 = 100 - r1 * Math.cos(angle);
    const x2 = 100 + 90 * Math.sin(angle);
    const y2 = 100 - 90 * Math.cos(angle);
    return { x1, y1, x2, y2, major };
  });
  const points = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const r = i % 2 === 0 ? 62 : 40;
    return { x: 100 + r * Math.sin(angle), y: 100 - r * Math.cos(angle), main: i % 2 === 0 };
  });
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${spin ? "compass-spin " : ""}${className}`}
      style={{ opacity }}
      aria-hidden
    >
      <g fill="none" stroke="var(--accent)" strokeWidth="0.8">
        <circle cx="100" cy="100" r="92" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="84" strokeDasharray="2 3" />
        <circle cx="100" cy="100" r="56" strokeDasharray="1 4" />
        <circle cx="100" cy="100" r="30" />
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            strokeWidth={t.major ? 1.1 : 0.5}
          />
        ))}
        {/* 八芒星玫瑰 */}
        {points.map((p, i) => (
          <line
            key={`r${i}`}
            x1={p.main ? 100 : 100}
            y1={p.main ? 100 : 100}
            x2={p.x}
            y2={p.y}
            strokeWidth={p.main ? 1 : 0.5}
            strokeDasharray={p.main ? undefined : "3 3"}
          />
        ))}
        {points.filter(p => p.main).map((p, i) => (
          <circle key={`c${i}`} cx={p.x} cy={p.y} r="2.2" fill="var(--accent)" stroke="none" />
        ))}
        <circle cx="100" cy="100" r="4" fill="var(--accent)" stroke="none" />
      </g>
    </svg>
  );
}

/** 星图连线背景（固定星座排布，作装饰背景使用） */
export function StarMap({
  className = "",
  opacity = 0.18,
  seed = 1,
}: {
  className?: string;
  opacity?: number;
  seed?: number;
}) {
  // 两组预置星座（避免随机数导致每次渲染抖动）
  const constellations =
    seed % 2 === 0
      ? {
          points: [
            [60, 90], [140, 60], [230, 110], [320, 70], [410, 140],
            [520, 100], [610, 170], [520, 240], [380, 210], [150, 200],
          ],
          links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 2], [8, 9], [9, 0]],
        }
      : {
          points: [
            [80, 150], [180, 90], [280, 160], [390, 80], [500, 150],
            [590, 90], [640, 200], [300, 260], [480, 250], [200, 240],
          ],
          links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [7, 9], [4, 8], [8, 6]],
        };
  return (
    <svg
      viewBox="0 0 680 320"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity }}
      aria-hidden
    >
      <g stroke="var(--accent)" strokeWidth="0.6" fill="none" strokeDasharray="3 4">
        {constellations.links.map(([a, b], i) => (
          <line
            key={i}
            x1={constellations.points[a][0]}
            y1={constellations.points[a][1]}
            x2={constellations.points[b][0]}
            y2={constellations.points[b][1]}
          />
        ))}
      </g>
      {constellations.points.map(([x, y], i) => (
        <g key={`p${i}`}>
          <circle cx={x} cy={y} r="2" fill="var(--accent)" />
          <circle cx={x} cy={y} r="5" fill="var(--accent)" opacity="0.25" />
        </g>
      ))}
      {/* 散落星尘 */}
      {[[30, 40], [110, 30], [340, 40], [450, 30], [620, 60], [660, 150], [40, 250], [600, 290], [360, 300]].map(
        ([x, y], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r="1.2" fill="var(--accent)" opacity="0.7" />
        )
      )}
    </svg>
  );
}

/** 分隔花纹（菱形 + 两侧渐细线） */
export function OrnamentDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--accent-dim)] to-[var(--accent)] opacity-60" />
      <svg width="46" height="14" viewBox="0 0 46 14" fill="none">
        <path d="M23 1 L28 7 L23 13 L18 7 Z" stroke="var(--accent)" strokeWidth="1" fill="none" />
        <circle cx="23" cy="7" r="1.4" fill="var(--accent)" />
        <circle cx="8" cy="7" r="1" fill="var(--accent)" opacity="0.7" />
        <circle cx="38" cy="7" r="1" fill="var(--accent)" opacity="0.7" />
        <line x1="10" y1="7" x2="16" y2="7" stroke="var(--accent)" strokeWidth="0.6" opacity="0.5" />
        <line x1="30" y1="7" x2="36" y2="7" stroke="var(--accent)" strokeWidth="0.6" opacity="0.5" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--accent-dim)] to-[var(--accent)] opacity-60" />
    </div>
  );
}

/** 信纸边框（四角花饰 + 双线框，包裹信纸质感内容） */
export function LetterFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const corner = (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <path
        d="M25 1 H8 Q1 1 1 8 V25"
        stroke="var(--accent)"
        strokeWidth="1.2"
        fill="none"
        opacity="0.9"
      />
      <path d="M7 1 Q7 7 1 7" stroke="var(--accent)" strokeWidth="0.8" fill="none" opacity="0.6" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="var(--accent)" opacity="0.9" />
    </svg>
  );
  return (
    <div className={`paper-sheet relative ${className}`}>
      <span className="pointer-events-none absolute left-2 top-2">{corner}</span>
      <span className="pointer-events-none absolute right-2 top-2 scale-x-[-1]">{corner}</span>
      <span className="pointer-events-none absolute bottom-2 left-2 scale-y-[-1]">{corner}</span>
      <span className="pointer-events-none absolute bottom-2 right-2 scale-[-1]">{corner}</span>
      {children}
    </div>
  );
}

/** 塔罗牌卡（图片 + 花框 + 牌名） */
export function TarotCard({
  image,
  cardTitle,
  cardTitleEn,
  motto,
  width = 176,
  className = "",
  elevated = false,
}: {
  image: string;
  cardTitle: string;
  cardTitleEn: string;
  motto?: string;
  width?: number;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <figure className={`tarot-card ${elevated ? "tarot-card-elevated " : ""}${className}`} style={{ width }}>
      <div className="tarot-card-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`塔罗牌：${cardTitle}`} className="block w-full" loading="eager" />
      </div>
      <figcaption className="mt-3 text-center">
        <p className="display-serif text-base text-[var(--accent)] tracking-widest">「{cardTitle}」</p>
        <p className="file-number mt-1">{cardTitleEn}</p>
        {motto && (
          <p className="display-serif mt-2 text-xs text-[var(--text-muted)] italic">{motto}</p>
        )}
      </figcaption>
    </figure>
  );
}
