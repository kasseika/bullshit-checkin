"use client";

import { useEffect, useState } from 'react';
// ナビゲーションを削除したので、これらのimportは不要
// import { usePathname } from 'next/navigation';
// import Link from 'next/link';

// ナビゲーションを削除したので、このルート定義も不要
// const appRoutes = [
//   { path: '/', label: 'ホーム' },
//   { path: '/checkin/time', label: '時間選択' },
//   { path: '/checkin/room', label: '部屋選択' },
//   { path: '/checkin/purpose', label: '目的選択' },
//   { path: '/checkin/count', label: '人数選択' },
//   { path: '/checkin/survey', label: 'アンケート' },
//   { path: '/checkin/confirm', label: '確認' },
// ];

export function AppShell({ children }: { children: React.ReactNode }) {
  // pathnameも使わなくなったので削除
  // const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);

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

  // フッターナビゲーションを削除したので、これらの変数は不要
  // const currentRouteIndex = appRoutes.findIndex(route => route.path === pathname);
  // const prevRoute = currentRouteIndex > 0 ? appRoutes[currentRouteIndex - 1] : null;
  // const nextRoute = currentRouteIndex < appRoutes.length - 1 ? appRoutes[currentRouteIndex + 1] : null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* オフライン通知 - オフライン時のみ表示 */}
      {isOffline && (
        <div className="bg-yellow-100 text-yellow-800 p-2 text-center">
          <span className="font-medium">オフラインモード</span> - インターネット接続がありません
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>
    </div>
  );
}