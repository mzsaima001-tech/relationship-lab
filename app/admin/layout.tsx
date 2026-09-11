"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "数据看板", exact: true },
  { href: "/admin/questions", label: "题库管理" },
  { href: "/admin/rules", label: "报告规则" },
  { href: "/admin/patterns", label: "双人模式" },
  { href: "/admin/archetypes", label: "原型卡牌" },
  { href: "/admin/debug", label: "调试工具" },
  { href: "/admin/operations", label: "运营数据" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // 登录页不显示侧边栏
  if (pathname === "/admin/login") return <>{children}</>;

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  const navItems = (
    <>
      {NAV.map(item => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={`block rounded-lg px-3 py-2 text-sm ${
              active
                ? "bg-gray-900 text-white font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 桌面侧边栏 */}
      <aside className="hidden md:flex w-52 flex-col border-r border-gray-200 bg-white p-4 shrink-0">
        <div className="mb-6 px-1">
          <p className="font-bold text-gray-900">默契研究所</p>
          <p className="text-xs text-gray-400">内容资产管理后台</p>
        </div>
        <nav className="flex-1 space-y-1">{navItems}</nav>
        <button
          onClick={logout}
          className="mt-4 text-left text-sm text-gray-400 hover:text-gray-700 px-3 py-2"
        >
          退出登录
        </button>
      </aside>

      {/* 移动端顶栏 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <p className="font-bold text-gray-900 text-sm">默契研究所 · 后台</p>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600"
          >
            菜单
          </button>
        </header>
        {menuOpen && (
          <nav className="md:hidden border-b border-gray-200 bg-white p-3 space-y-1">
            {navItems}
            <button
              onClick={logout}
              className="block w-full text-left text-sm text-gray-400 px-3 py-2"
            >
              退出登录
            </button>
          </nav>
        )}
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
