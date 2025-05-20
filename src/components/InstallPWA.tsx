"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { BeforeInstallPromptEvent } from '@/types/pwa';
import { usePathname } from 'next/navigation';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const pathname = usePathname();
  
  // トップページ（/checkin/welcome）でのみ表示する
  const isTopPage = pathname === '/checkin/welcome';

  useEffect(() => {
    // beforeinstallpromptイベントをキャプチャ
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // デフォルトの動作を防止
      e.preventDefault();
      // イベントを保存
      setDeferredPrompt(e);
      // インストール可能フラグを設定
      setIsInstallable(true);
    };

    // appinstalledイベントをキャプチャ
    const handleAppInstalled = () => {
      // インストール済みフラグを設定
      setIsInstalled(true);
      // インストール可能フラグをリセット
      setIsInstallable(false);
      // deferredPromptをリセット
      setDeferredPrompt(null);
      console.log('アプリがインストールされました');
    };

    // イベントリスナーを追加
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // すでにインストールされているかチェック
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              window.navigator.standalone ||
                              document.referrer.includes('android-app://');
    
    if (isInStandaloneMode) {
      setIsInstalled(true);
    }

    // クリーンアップ関数
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // インストールプロンプトを表示
    deferredPrompt.prompt();

    // ユーザーの選択を待つ
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`ユーザーの選択: ${outcome}`);

    // deferredPromptをリセット
    setDeferredPrompt(null);
    // インストール可能フラグをリセット
    setIsInstallable(false);
  };

  // インストール可能でない場合、またはトップページでない場合は何も表示しない
  if (!isInstallable || isInstalled || !isTopPage) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded-lg shadow-lg flex items-center gap-2 sm:gap-4 max-w-[95%] sm:max-w-md">
        <div className="flex-1">
          <h3 className="font-bold text-sm sm:text-lg">アプリをインストール</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            ホーム画面に追加してオフラインでも使用できます
          </p>
        </div>
        <Button onClick={handleInstallClick}>
          インストール
        </Button>
      </div>
    </div>
  );
}
