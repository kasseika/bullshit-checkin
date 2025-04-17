import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { functions } from './firebase';

// Cloud Functionsのエラー詳細の型定義
interface CloudFunctionErrorDetails {
  error?: string;
  logs?: string[];
}

// Firebase Functionsのエラー型
interface FirebaseFunctionError extends FirebaseError {
  details?: CloudFunctionErrorDetails;
}

// 予約情報の型定義
export interface Reservation {
  id: string;
  title: string;
  roomIdentifier: string;
  start: string;
  end: string;
  startTime: string; // HH:MM形式
  endTime: string;   // HH:MM形式
}

// 部屋の識別子を抽出する関数
export function extractRoomIdentifier(title: string): string | null {
  // タイトルからアンダースコア前の部分を抽出
  const match = title.match(/^([^_]+)_/);
  return match ? match[1] : null;
}

// 特定の部屋の当日の予約を取得する関数
export async function getTodayReservations(roomId: string): Promise<Reservation[]> {
  try {
    // Firebase Functionsを呼び出す
    const getCalendarReservations = httpsCallable(functions, 'getCalendarReservations');
    
    const result = await getCalendarReservations({ room: roomId });
    const data = result.data as { reservations: Reservation[], logs?: string[] };
    
    // Cloud Functionsのログ情報をコンソールに表示
    if (data.logs && data.logs.length > 0) {
      console.group('Cloud Functions Logs:');
      data.logs.forEach(log => console.log(log));
      console.groupEnd();
    }
    
    return data.reservations || [];
  } catch (error) {
    console.error('Error fetching reservations:', error);
    
    // エラーオブジェクトからログ情報を取得して表示
    if (error instanceof FirebaseError) {
      const fbError = error as FirebaseFunctionError;
      if (fbError.details) {
        if (fbError.details.logs && fbError.details.logs.length > 0) {
          console.group('Cloud Functions Error Logs:');
          fbError.details.logs.forEach(log => console.log(log));
          console.groupEnd();
        }
        if (fbError.details.error) {
          console.error('Error details:', fbError.details.error);
        }
      }
    }
    
    return [];
  }
}

// 特定の部屋の予約が可能かどうかを確認する関数
export async function isRoomAvailable(roomId: string, startTime: string, endTime: string): Promise<boolean> {
  try {
    const reservations = await getTodayReservations(roomId);
    
    // 文字列の時間をDateオブジェクトに変換
    const parseTime = (timeStr: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    // 予約時間が重複するかどうかをチェック
    const hasOverlap = reservations.some(reservation => {
      const resStart = new Date(reservation.start);
      const resEnd = new Date(reservation.end);
      
      return (
        (start >= resStart && start < resEnd) ||
        (end > resStart && end <= resEnd) ||
        (start <= resStart && end >= resEnd)
      );
    });
    
    return !hasOverlap;
  } catch (error) {
    console.error('Error checking room availability:', error);
    return false;
  }
}

// カレンダーにチェックインイベントを追加する関数
export async function addCheckInEvent(room: string, startTime: string, endTime: string): Promise<boolean> {
  try {
    // Firebase Functionsを呼び出す
    const addCalendarEvent = httpsCallable(functions, 'addCalendarEvent');
    
    const result = await addCalendarEvent({ room, startTime, endTime });
    const data = result.data as { success: boolean, eventId: string, logs?: string[] };
    
    // Cloud Functionsのログ情報をコンソールに表示
    if (data.logs && data.logs.length > 0) {
      console.group('Cloud Functions Logs:');
      data.logs.forEach(log => console.log(log));
      console.groupEnd();
    }
    
    return data.success;
  } catch (error) {
    console.error('Error adding check-in event to calendar:', error);
    
    // エラーオブジェクトからログ情報を取得して表示
    if (error instanceof FirebaseError) {
      const fbError = error as FirebaseFunctionError;
      if (fbError.details) {
        if (fbError.details.logs && fbError.details.logs.length > 0) {
          console.group('Cloud Functions Error Logs:');
          fbError.details.logs.forEach(log => console.log(log));
          console.groupEnd();
        }
        if (fbError.details.error) {
          console.error('Error details:', fbError.details.error);
        }
      }
    }
    
    return false;
  }
}