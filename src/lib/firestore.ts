import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestoreDb } from './firebase';

// チェックインデータの型定義
export interface CheckInData {
  room: string;
  startTime: string;
  endTime: string;
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
    // データにサーバータイムスタンプを追加
    const dataToSave = {
      ...data,
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