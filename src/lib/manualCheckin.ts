/**
 * 手動チェックイン用の保存関数
 * 管理者が後からチェックインデータを追加する際に使用
 */
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { CheckInData } from './firestore';
import { formatDateToJST } from '../utils/dateUtils';

export async function saveManualCheckIn(checkInData: CheckInData, checkInDate: Date) {
  try {
    // チェックイン日付をJSTベースで設定（通常のチェックインと同じ形式）
    const dateString = formatDateToJST(checkInDate);
    
    // 開始時刻を使って、UTC形式のcheckInTimeを生成
    // checkInDateの日付とstartTimeを組み合わせて、UTC形式のISO文字列を作成
    const [hours, minutes] = checkInData.startTime.split(':').map(Number);
    const checkInDateTime = new Date(checkInDate);
    checkInDateTime.setHours(hours, minutes, 0, 0);
    const checkInTimeUTC = checkInDateTime.toISOString();
    
    // サーバータイムスタンプと日付を追加
    const dataToSave = {
      ...checkInData,
      startDate: dateString,
      endDate: dateString,
      checkInTime: checkInTimeUTC,  // UTC形式のISO文字列
      clientCheckInTime: checkInTimeUTC,  // 通常のチェックインと同じ形式
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