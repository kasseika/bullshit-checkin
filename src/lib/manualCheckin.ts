/**
 * 手動チェックイン用の保存関数
 * 管理者が後からチェックインデータを追加する際に使用
 */
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { CheckInData } from './firestore';

export async function saveManualCheckIn(checkInData: CheckInData, checkInDate: Date) {
  try {
    // チェックイン日付をベースに開始日・終了日を設定
    const dateString = checkInDate.toISOString().split('T')[0];
    
    // サーバータイムスタンプと日付を追加
    const dataToSave = {
      ...checkInData,
      startDate: dateString,
      endDate: dateString,
      clientCheckInTime: checkInData.checkInTime,
      serverCheckInTime: serverTimestamp(),
      createdAt: serverTimestamp(),
      isManualEntry: true, // 手動入力フラグ
    };

    // Firestoreに保存
    const docRef = await addDoc(collection(db, 'checkins'), dataToSave);
    console.log('手動チェックインデータを保存しました:', docRef.id);

    // 手動入力の場合はGoogleカレンダーへの追加は行わない
    // （必要に応じて管理者が手動でカレンダーに追加）

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('手動チェックインの保存に失敗しました:', error);
    throw error;
  }
}