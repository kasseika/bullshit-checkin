import { getAllPendingCheckins, removeFromIndexedDB } from './indexedDb';
import { CheckInData } from './firestore';

export async function registerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.log('Background Syncはこのブラウザでサポートされていません');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-checkins');
    console.log('Background Syncを登録しました');
    return true;
  } catch (error) {
    console.error('Background Syncの登録に失敗しました:', error);
    return false;
  }
}

export async function processPendingCheckins() {
  try {
    const pendingCheckins = await getAllPendingCheckins();
    
    if (pendingCheckins.length === 0) {
      console.log('再送信するデータがありません。');
      return 0;
    }
    
    console.log(`${pendingCheckins.length}件の未送信データを再送信します。`);
    
    let successCount = 0;
    
    for (const item of pendingCheckins) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const dataToSave = {
          ...item.data,
          startDate: today,
          endDate: today,
          clientCheckInTime: item.data.checkInTime,
          isResent: true,
          originalTimestamp: item.timestamp,
          resendAttempts: item.attempts + 1
        };
        
        const response = await fetch('/api/checkins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSave),
        });
        
        if (response.ok) {
          await removeFromIndexedDB(item.id);
          
          console.log(`ID: ${item.id} のデータを再送信しました。`);
          successCount++;
        } else {
          throw new Error(`サーバーから${response.status}エラーが返されました`);
        }
      } catch (error) {
        console.error(`ID: ${item.id} のデータの再送信に失敗しました:`, error);
      }
    }
    
    console.log(`${successCount}/${pendingCheckins.length}件のデータを再送信しました。`);
    return successCount;
  } catch (error) {
    console.error('未送信データの再送信中にエラーが発生しました:', error);
    return 0;
  }
}
