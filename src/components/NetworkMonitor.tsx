"use client";

import { useEffect } from 'react';
import { startNetworkMonitoring } from '@/lib/firestore';
import { toast } from 'sonner';

export function NetworkMonitor() {
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      console.log('ネットワーク監視を開始します');
      
      // ネットワーク監視を開始
      startNetworkMonitoring();
      
      // アプリ起動時に未送信データがある場合の通知
      const checkPendingData = async () => {
        try {
          // IndexedDBを開く
          const request = indexedDB.open('bullshitCheckinDB', 1);
          
          request.onsuccess = async (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(['pendingCheckins'], 'readonly');
            const store = transaction.objectStore('pendingCheckins');
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
              const count = countRequest.result;
              if (count > 0) {
                toast.info(`${count}件の未送信データがあります`, {
                  description: 'ネットワーク接続が回復次第、自動的に送信されます',
                  duration: 5000,
                });
              }
              db.close();
            };
          };
        } catch (error) {
          console.error('未送信データの確認中にエラーが発生しました:', error);
        }
      };
      
      // オンライン状態なら未送信データをチェック
      if (navigator.onLine) {
        // 少し遅延させて実行（アプリの初期化が完了してから）
        setTimeout(checkPendingData, 2000);
      }
    }
  }, []);

  // このコンポーネントは何も表示しない
  return null;
}