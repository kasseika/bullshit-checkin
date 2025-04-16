import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestoreDb } from './firebase';

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
}

/**
 * チェックインデータをFirestoreに保存する関数
 * @param data チェックインデータ
 * @returns 保存が成功した場合はtrue、失敗した場合はfalse
 */
export async function saveCheckInData(data: CheckInData): Promise<boolean> {
  try {
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

    // 'checkins' コレクションにデータを追加
    const checkinsRef = collection(firestoreDb, 'checkins');
    await addDoc(checkinsRef, dataToSave);
    
    console.log('チェックインデータを保存しました:', data);
    return true;
  } catch (error) {
    console.error('チェックインデータの保存に失敗しました:', error);
    return false;
  }
}