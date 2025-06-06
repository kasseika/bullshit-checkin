import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { functions } from './firebase';
import { convertFullWidthNumbersToHalfWidth } from '../utils/textUtils';

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
  const normalizedTitle = convertFullWidthNumbersToHalfWidth(title);
  // タイトルからアンダースコア前の部分を抽出
  const match = normalizedTitle.match(/^([^_]+)_/);
  return match ? match[1] : null;
}

/**
 * 予約タイトルから6番の部屋タイプ（大部屋・工作室）を判定する関数
 * @param reservationTitle 予約のタイトル
 * @returns 'large6' (大部屋) または 'workshop6' (工作室)
 */
export function determineRoom6Type(reservationTitle: string): 'large6' | 'workshop6' {
  const title = reservationTitle.toLowerCase();
  
  // 工作室関連キーワードをチェック
  const workshopKeywords = ['工作室', 'レーザー加工機', '3dプリンター', '3dプリンタ'];
  
  // タイトルまたは括弧内に工作室関連キーワードが含まれているかチェック
  if (workshopKeywords.some(keyword => title.includes(keyword))) {
    return 'workshop6';
  }
  
  // デフォルトは大部屋
  return 'large6';
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

// カレンダーの予約の終了時間を更新する関数
export async function updateReservationEndTime(reservationId: string, endTime: string): Promise<boolean> {
  try {
    // Firebase Functionsを呼び出す
    const updateCalendarEvent = httpsCallable(functions, 'updateCalendarEvent');
    
    const result = await updateCalendarEvent({ eventId: reservationId, endTime });
    const data = result.data as { success: boolean, eventId: string, logs?: string[] };
    
    // Cloud Functionsのログ情報をコンソールに表示
    if (data.logs && data.logs.length > 0) {
      console.group('Cloud Functions Logs:');
      data.logs.forEach(log => console.log(log));
      console.groupEnd();
    }
    
    return data.success;
  } catch (error) {
    console.error('Error updating reservation end time:', error);
    
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

// 指定された期間の予約を取得する関数
export async function getReservationsForPeriod(
  startDate: string,
  endDate: string,
  roomId: string = 'all'
): Promise<Reservation[]> {
  try {
    // Firebase Functionsを呼び出す
    const getCalendarReservationsForPeriod = httpsCallable(functions, 'getCalendarReservationsForPeriod');
    
    const result = await getCalendarReservationsForPeriod({
      room: roomId,
      startDate,
      endDate
    });
    
    const data = result.data as { reservations: Reservation[], logs?: string[] };
    
    // Cloud Functionsのログ情報をコンソールに表示
    if (data.logs && data.logs.length > 0) {
      console.group('Cloud Functions Logs:');
      data.logs.forEach(log => console.log(log));
      console.groupEnd();
    }
    
    return data.reservations || [];
  } catch (error) {
    console.error('Error fetching reservations for period:', error);
    
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

// 予約情報の型定義
export interface BookingEventData {
  room: string;        // 部屋ID (例: 'private4')
  name: string;        // 予約者名
  startTime: string;   // 開始時間 (HH:MM形式)
  endTime: string;     // 終了時間 (HH:MM形式)
  startDate: string;   // 予約日 (YYYY-MM-DD形式)
  contactPhone?: string; // 電話番号
  contactEmail?: string; // メールアドレス
  count?: number;      // 利用人数
  purpose?: string;    // 利用目的
  purposeDetail?: string; // 詳細な利用目的
}

// カレンダーに予約イベントを追加する関数
export async function addBookingToCalendar(bookingData: BookingEventData): Promise<boolean> {
  try {
    // Firebase Functionsを呼び出す
    const addBookingEvent = httpsCallable(functions, 'addBookingEvent');
    
    const result = await addBookingEvent(bookingData);
    const data = result.data as { success: boolean, eventId: string, logs?: string[] };
    
    // Cloud Functionsのログ情報をコンソールに表示
    if (data.logs && data.logs.length > 0) {
      console.group('Cloud Functions Logs:');
      data.logs.forEach(log => console.log(log));
      console.groupEnd();
    }
    
    if (data.success) {
      try {
        // 予約成功時にGoogle Chatに通知を送信
        const sendBookingNotification = httpsCallable(functions, 'sendBookingNotification');
        await sendBookingNotification(bookingData);
      } catch (notificationError) {
        console.error('通知の送信中にエラーが発生しました:', notificationError);
        // 通知の失敗は予約の成功に影響しないようにする
      }
    }
    return data.success;
  } catch (error) {
    console.error('Error adding booking event to calendar:', error);
    
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
