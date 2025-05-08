"use client";

import { useEffect, useState, useCallback } from 'react';
import { startNetworkMonitoring, resendPendingCheckins } from '@/lib/firestore';
import { toast } from 'sonner';

export function NetworkMonitor() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // IndexedDBから未送信データの数を取得する関数
  const checkPendingData = useCallback(async () => {
    try {
      // IndexedDBを開く（バージョン2に更新）
      const request = indexedDB.open('bullshitCheckinDB', 2);
      
      // データベースのバージョンが上がった時やDBが存在しない時に実行される
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // オブジェクトストアが存在しない場合は作成
        if (!db.objectStoreNames.contains('pendingCheckins')) {
          // auto-incrementをtrueにして、一意のIDを自動生成
          db.createObjectStore('pendingCheckins', { keyPath: 'id', autoIncrement: true });
          console.log(`オブジェクトストア 'pendingCheckins' を作成しました`);
        }
      };
      
      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          // オブジェクトストアが存在するか確認
          if (!db.objectStoreNames.contains('pendingCheckins')) {
            console.error('pendingCheckinsオブジェクトストアが存在しません');
            setPendingCount(0);
            db.close();
            return;
          }
          
          const transaction = db.transaction(['pendingCheckins'], 'readonly');
          const store = transaction.objectStore('pendingCheckins');
          const countRequest = store.count();
          
          countRequest.onsuccess = () => {
            const count = countRequest.result;
            setPendingCount(count);
            
            if (count > 0 && isOnline) {
              toast.info(`${count}件の未送信データがあります`, {
                description: 'ネットワーク接続が回復次第、自動的に送信されます',
                duration: 5000,
              });
            }
            db.close();
          };
        } catch (error) {
          console.error('IndexedDBの操作中にエラーが発生しました:', error);
          setPendingCount(0);
          db.close();
        }
      };
    } catch (error) {
      console.error('未送信データの確認中にエラーが発生しました:', error);
    }
  }, [isOnline]);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      console.log('ネットワーク監視を開始します');
      
      // 初期オンライン状態を設定
      setIsOnline(navigator.onLine);
      
      // ネットワーク監視を開始
      startNetworkMonitoring();
      
      // カスタムイベントリスナーを設定
      const handleOnline = () => {
        setIsOnline(true);
        toast.success('ネットワーク接続が回復しました', {
          duration: 3000,
        });
        // オンラインになったら未送信データを再送信
        setTimeout(() => {
          resendPendingCheckins().then(() => {
            // 再送信後に未送信データの数を更新
            checkPendingData();
          });
        }, 1000);
      };
      
      const handleOffline = () => {
        setIsOnline(false);
        toast.error('ネットワーク接続が切断されました', {
          description: 'データはオフラインで保存され、接続回復時に送信されます',
          duration: 5000,
        });
        // オフライン時も未送信データの数を更新
        checkPendingData();
      };
      
      // カスタムイベントリスナーを登録
      document.addEventListener('app-online', handleOnline);
      document.addEventListener('app-offline', handleOffline);
      
      // 標準のオンライン/オフラインイベントも監視
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // アプリ起動時に未送信データをチェック
      setTimeout(checkPendingData, 2000);
      
      // 定期的に未送信データの数をチェック（1分ごと）
      const intervalId = setInterval(checkPendingData, 60000);
      
      return () => {
        // クリーンアップ
        document.removeEventListener('app-online', handleOnline);
        document.removeEventListener('app-offline', handleOffline);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(intervalId);
      };
    }
  }, [checkPendingData]);

  // オフライン時のみ表示するバナー
  if (!isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 text-yellow-800 p-2 text-center text-sm z-50">
        <span className="font-medium">オフラインモード</span> - データはローカルに保存され、接続回復時に送信されます
        {pendingCount > 0 && (
          <span className="ml-2 bg-yellow-200 px-2 py-0.5 rounded-full text-xs">
            未送信: {pendingCount}件
          </span>
        )}
      </div>
    );
  }

  // オンライン時は何も表示しない
  return null;
}