/**
 * ダッシュボードのナビゲーションコンポーネント
 * アクティブなリンクをハイライト表示する
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DashboardNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "本日",
      isActive: pathname === "/dashboard",
    },
    {
      href: "/dashboard/monthly",
      label: "月別集計",
      isActive: pathname === "/dashboard/monthly",
    },
  ];

  return (
    <nav className="flex space-x-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            item.isActive
              ? "bg-gray-900 text-white"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}