/**
 * ダッシュボードアプリのレイアウトコンポーネント
 * チェックイン情報の管理画面用のレイアウトを提供する
 */
import type { Metadata } from "next";
import { DashboardNav } from "@/components/DashboardNav";

export const metadata: Metadata = {
  title: "チェックイン管理ダッシュボード",
  description: "チェックイン情報の管理と分析",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              チェックイン管理ダッシュボード
            </h1>
            <DashboardNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}