"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// アプリのナビゲーション構造
const appRoutes = [
  { path: '/', label: 'ホーム' },
  { path: '/checkin/time', label: '時間選択' },
  { path: '/checkin/room', label: '部屋選択' },
  { path: '/checkin/purpose', label: '目的選択' },
  { path: '/checkin/count', label: '人数選択' },
  { path: '/checkin/survey', label: 'アンケート' },
  { path: '/checkin/confirm', label: '確認' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);

  // オンライン/オフライン状態の監視
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 初期状態を設定
      setIsOffline(!navigator.onLine);

      // オンライン/オフライン状態の変化を監視
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      // カスタムイベントリスナーを登録
      document.addEventListener('app-online', handleOnline);
      document.addEventListener('app-offline', handleOffline);
      
      // 標準のオンライン/オフラインイベントも監視
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        // クリーンアップ
        document.removeEventListener('app-online', handleOnline);
        document.removeEventListener('app-offline', handleOffline);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
      };
    }
  }, []);

  // 現在のルートに基づいてアクティブなナビゲーションアイテムを特定
  const currentRouteIndex = appRoutes.findIndex(route => route.path === pathname);
  const prevRoute = currentRouteIndex > 0 ? appRoutes[currentRouteIndex - 1] : null;
  const nextRoute = currentRouteIndex < appRoutes.length - 1 ? appRoutes[currentRouteIndex + 1] : null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー - App Shellの一部としてキャッシュされる */}
      <header className="bg-black text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">Bullshit Checkin</Link>
          <button 
            onClick={() => setShowNavigation(!showNavigation)}
            className="p-2 rounded-md hover:bg-gray-800"
          >
            <span className="sr-only">メニュー</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* オフライン通知 - オフライン時のみ表示 */}
      {isOffline && (
        <div className="bg-yellow-100 text-yellow-800 p-2 text-center">
          <span className="font-medium">オフラインモード</span> - インターネット接続がありません
        </div>
      )}

      {/* ナビゲーションメニュー - 表示/非表示を切り替え可能 */}
      {showNavigation && (
        <nav className="bg-gray-100 p-4 shadow-inner">
          <ul className="space-y-2">
            {appRoutes.map((route) => (
              <li key={route.path}>
                <Link 
                  href={route.path}
                  className={`block p-2 rounded ${pathname === route.path ? 'bg-gray-200 font-medium' : 'hover:bg-gray-200'}`}
                  onClick={() => setShowNavigation(false)}
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* メインコンテンツ */}
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>

      {/* フッターナビゲーション - App Shellの一部としてキャッシュされる */}
      <footer className="bg-gray-100 p-4 shadow-inner mt-auto">
        <div className="container mx-auto flex justify-between">
          {prevRoute && (
            <Link 
              href={prevRoute.path}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              ← {prevRoute.label}
            </Link>
          )}
          <div className="flex-grow"></div>
          {nextRoute && (
            <Link 
              href={nextRoute.path}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              {nextRoute.label} →
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}