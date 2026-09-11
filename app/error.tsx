"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="archive-label text-[var(--accent)] mb-3">Oops</p>
      <h1 className="display-serif text-2xl md:text-3xl text-[var(--text-warm)] font-bold mb-3">
        页面加载出错
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-2 max-w-md leading-relaxed">
        这个页面暂时没能正常打开。要不重新试试？
      </p>
      {error?.digest && (
        <p className="text-xs text-[var(--text-muted)] mb-6 font-mono">digest: {error.digest}</p>
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
  );
}
