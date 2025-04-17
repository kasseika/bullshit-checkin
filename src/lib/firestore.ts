import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { firestoreDb } from './firebase';
import { saveToIndexedDB, getAllPendingCheckins, removeFromIndexedDB, updateAttempts } from './indexedDb';
import { toast } from 'sonner';

// チェックインデータの型定義
export interface CheckInData {
  room: string;
  startTime: string;
  endTime: string;
  startDate?: string; // 開始日（YYYY-MM-DD形式）
  endDate?: string;   // 終了日（YYYY-MM-DD形式）
  count: number;
  purpose: string;
  ageGroup: string;
  checkInTime: string;
  reservationId?: string | null;
}

/**
 * チェックインデータをFirestoreに保存する関数
 * @param data チェックインデータ
 * @returns 保存が成功した場合はtrue、失敗した場合はfalse
 */
export async function saveCheckInData(data: CheckInData): Promise<boolean> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態を検出しました。データをIndexedDBに保存します。');
      return await saveToIndexedDB(data);
    }

    // 当日の日付を取得（YYYY-MM-DD形式）
    const today = new Date().toISOString().split('T')[0];
    
    // データにサーバータイムスタンプと日付を追加
    const dataToSave = {
      ...data,
      // 開始日と終了日を追加（運用上、日をまたぐことはないので当日の日付）
      startDate: today,
      endDate: today,
      // クライアント側のタイムスタンプも保持
      clientCheckInTime: data.checkInTime,
      // サーバー側のタイムスタンプを追加
      serverCheckInTime: serverTimestamp(),
      // 作成日時
      createdAt: serverTimestamp()
    };

    try {
      // 'checkins' コレクションにデータを追加
      const checkinsRef = collection(firestoreDb, 'checkins');
      await addDoc(checkinsRef, dataToSave);
      
      console.log('チェックインデータを保存しました:', data);
      return true;
    } catch (error) {
      console.error('チェックインデータの保存に失敗しました:', error);
      console.log('データをIndexedDBに保存します。');
      return await saveToIndexedDB(data);
    }
  } catch (error) {
    console.error('チェックインデータの保存処理中にエラーが発生しました:', error);
    // 最終的な手段としてIndexedDBに保存を試みる
    try {
      return await saveToIndexedDB(data);
    } catch (innerError) {
      console.error('IndexedDBへの保存も失敗しました:', innerError);
      return false;
    }
  }
}

/**
 * IndexedDBに保存されたデータをFirestoreに再送信する関数
 * @returns 再送信が成功したデータの数
 */
export async function resendPendingCheckins(): Promise<number> {
  // オフライン状態の場合は処理をスキップ
  if (!navigator.onLine) {
    console.log('オフライン状態のため、再送信をスキップします。');
    return 0;
  }

  try {
    // IndexedDBから保存されているデータを取得
    const pendingCheckins = await getAllPendingCheckins();
    
    if (pendingCheckins.length === 0) {
      console.log('再送信するデータがありません。');
      return 0;
    }
    
    console.log(`${pendingCheckins.length}件の未送信データを再送信します。`);
    
    // 再送信開始の通知
    if (pendingCheckins.length > 0) {
      toast.loading(`${pendingCheckins.length}件のデータを送信中...`, {
        id: 'resending-data',
        duration: 10000,
      });
    }
    
    let successCount = 0;
    
    // 各データを再送信
    for (const item of pendingCheckins) {
      try {
        // 試行回数を更新
        await updateAttempts(item.id, item.attempts + 1);
        
        // 当日の日付を取得（YYYY-MM-DD形式）
        const today = new Date().toISOString().split('T')[0];
        
        // データにサーバータイムスタンプと日付を追加
        const dataToSave = {
          ...item.data,
          // 開始日と終了日を追加
          startDate: today,
          endDate: today,
          // クライアント側のタイムスタンプも保持
          clientCheckInTime: item.data.checkInTime,
          // サーバー側のタイムスタンプを追加
          serverCheckInTime: serverTimestamp(),
          // 作成日時
          createdAt: serverTimestamp(),
          // 再送信フラグと元の保存時刻を追加
          isResent: true,
          originalTimestamp: item.timestamp,
          resendAttempts: item.attempts + 1
        };
        
        // Firestoreにデータを追加
        const checkinsRef = collection(firestoreDb, 'checkins');
        await addDoc(checkinsRef, dataToSave);
        
        // 送信成功したらIndexedDBから削除
        await removeFromIndexedDB(item.id);
        
        console.log(`ID: ${item.id} のデータを再送信しました。`);
        successCount++;
      } catch (error) {
        console.error(`ID: ${item.id} のデータの再送信に失敗しました:`, error);
        // 失敗した場合は次のデータに進む
      }
    }
    
    console.log(`${successCount}/${pendingCheckins.length}件のデータを再送信しました。`);
    
    // 再送信完了の通知
    if (successCount > 0) {
      toast.success(`${successCount}件のデータを送信しました`, {
        id: 'resending-data', // 同じIDを使用して前の通知を上書き
        duration: 3000,
      });
    } else if (pendingCheckins.length > 0 && successCount === 0) {
      toast.error('データの送信に失敗しました', {
        id: 'resending-data', // 同じIDを使用して前の通知を上書き
        description: 'ネットワーク接続を確認してください',
        duration: 5000,
      });
    }
    
    return successCount;
  } catch (error) {
    console.error('未送信データの再送信中にエラーが発生しました:', error);
    return 0;
  }
}

/**
 * ネットワーク状態の監視を開始する関数
 */
export function startNetworkMonitoring(): void {
  // オンラインになったときのイベントリスナー
  window.addEventListener('online', async () => {
    console.log('ネットワークが回復しました。未送信データを再送信します。');
    
    // 未送信データの数を確認
    const pendingCheckins = await getAllPendingCheckins();
    if (pendingCheckins.length > 0) {
      toast.info(`ネットワークが回復しました。${pendingCheckins.length}件のデータを送信します...`, {
        duration: 3000,
      });
    }
    
    await resendPendingCheckins();
  });
  
  // オフラインになったときのイベントリスナー
  window.addEventListener('offline', () => {
    console.log('ネットワークが切断されました。データはIndexedDBに保存されます。');
  });
  
  // 初期化時に一度実行
  if (navigator.onLine) {
    console.log('アプリ起動時にネットワークが接続されています。未送信データを確認します。');
    // 少し遅延させて実行（アプリの初期化が完了してから）
    setTimeout(() => {
      resendPendingCheckins();
    }, 3000);
  }
}

/**
 * 本日チェックイン済みの予約IDのリストを取得する関数
 * @returns チェックイン済みの予約IDのリスト
 */
export async function getCheckedInReservationIds(): Promise<string[]> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態のため、チェックイン済み予約の取得をスキップします。');
      return [];
    }

    // 当日の日付を取得（YYYY-MM-DD形式）
    const today = new Date().toISOString().split('T')[0];
    
    // 当日のチェックインデータを取得（インデックスが不要なシンプルなクエリ）
    const checkinsRef = collection(firestoreDb, 'checkins');
    const q = query(
      checkinsRef,
      where('startDate', '==', today)
    );
    
    const querySnapshot = await getDocs(q);
    
    // 予約IDのリストを作成
    const reservationIds: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.reservationId) {
        reservationIds.push(data.reservationId);
      }
    });
    
    console.log('チェックイン済みの予約ID:', reservationIds);
    return reservationIds;
  } catch (error) {
    console.error('チェックイン済み予約の取得中にエラーが発生しました:', error);
    return [];
  }
}