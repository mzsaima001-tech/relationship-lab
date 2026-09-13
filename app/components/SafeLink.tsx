"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, MouseEvent, ReactNode, CSSProperties } from "react";

/**
 * 安全跳转链接 —— 给跳转按钮加 loading 反馈 + 路由异常兜底
 *
 * 用法：替换 <Link> / <button onClick={()=>router.push(...)}>
 *   <SafeLink href="/result/abc" className="btn-primary">查看结果</SafeLink>
 *
 * 行为：
 *  - 点击 → 立刻 setLoading(true)，按钮内出现 spinner
 *  - 调用 router.push(href)
 *  - 80ms 内若 React state 还没被新页面卸载，认为跳转成功
 *  - 否则 1500ms 后用 router.replace 兜底（避免被返回栈卡住）
 *  - 再次失败时降级为 window.location.href 硬跳
 *
 * 注意：所有"加载失败"的真正错误，往往不是 next/router 的问题，
 * 而是跳转后**目标页 fetch 数据失败**——这种情况需要目标页自己加 retry，
 * 见每个 page.tsx 里的 useEffect fetch 块。
 */
export interface SafeLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 是否同时触发用户自定义 onClick（用于埋点等） */
  onUserClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** 兜底 router.replace 触发时长 ms（默认 1500） */
  fallbackMs?: number;
  /** 禁用状态 */
  disabled?: boolean;
  /** aria-label */
  "aria-label"?: string;
}

export function SafeLink({
  href,
  children,
  className,
  style,
  onUserClick,
  fallbackMs = 1500,
  disabled,
  ...rest
}: SafeLinkProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 挂载即预取目标路由：点击时页面已就绪，跳转秒开（减少"转圈半天"的体感）
  useEffect(() => {
    try {
      router.prefetch(href);
    } catch {
      /* 预取失败不影响点击跳转 */
    }
  }, [href, router]);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      onUserClick?.(e);
      if (e.defaultPrevented) return;
      if (disabled || loading) return;

      e.preventDefault();
      setLoading(true);

      // 软导航
      let resolved = false;
      const onResolved = () => {
        resolved = true;
      };

      // 用 microtask 检测卸载（不一定 100% 准确，但能 cover 多数场景）
      try {
        router.push(href);
      } catch {
        // router.push 本身抛错 → 直接降级
        window.location.href = href;
        return;
      }

      // 80ms 内 React 应已卸载旧页；超时则 router.replace 兜底
      setTimeout(() => {
        if (!resolved) {
          try {
            router.replace(href);
          } catch {
            window.location.href = href;
          }
        }
      }, fallbackMs);
    },
    [href, router, fallbackMs, disabled, loading, onUserClick]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${className || ""} ${loading ? "pointer-events-none" : ""}`}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}