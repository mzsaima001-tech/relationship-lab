"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上线时这里接入 Sentry / LogRocket
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--bg-base,#0e0c08)] text-[var(--text-warm,#f5ede0)]">
        <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="archive-label text-[var(--accent,#c9a96e)] mb-3">Oops</p>
          <h1 className="display-serif text-3xl md:text-4xl font-bold mb-4">
            出了一点小意外
          </h1>
          <p className="text-sm text-[var(--text-muted,#9a8f7a)] mb-2 max-w-md leading-relaxed">
            页面没能正常加载，可以重新尝试一下。
          </p>
          {error?.digest && (
            <p className="text-xs text-[var(--text-muted,#9a8f7a)] mb-6 font-mono">
              digest: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
            <button type="button" onClick={() => reset()} className="btn-primary">
              重新加载
            </button>
            <Link href="/" className="btn-ghost">
              回到首页
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
