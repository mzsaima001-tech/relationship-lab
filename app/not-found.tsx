import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="archive-label text-[var(--accent)] mb-3">404</p>
      <h1 className="display-serif text-3xl md:text-4xl text-[var(--text-warm)] font-bold mb-4">
        这里没有你要找的东西
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8 max-w-md leading-relaxed">
        链接可能已经过期，或者页面已被移走。要不再去其它地方看看？
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link href="/" className="btn-primary">
          ← 回到首页
        </Link>
        <Link href="/personality" className="btn-ghost">
          测一测我的人格
        </Link>
        <Link href="/start" className="btn-ghost">
          解锁我们的契合画像
        </Link>
      </div>
    </main>
  );
}
