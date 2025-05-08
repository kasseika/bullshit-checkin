import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { firestoreDb } from './firebase';
import { toast } from 'sonner';

// 予約データの型定義
export interface BookingData {
  id?: string;
  room: string;
  startTime: string;
  endTime: string;
  startDate: string; // 開始日（YYYY-MM-DD形式）
  endDate: string;   // 終了日（YYYY-MM-DD形式）
  count: number;
  purpose: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  checkedIn: boolean;
}

/**
 * 予約データをFirestoreに保存する関数
 * @param data 予約データ
 * @returns 保存が成功した場合は予約ID、失敗した場合はnull
 */
export async function saveBookingData(data: Omit<BookingData, 'id' | 'status' | 'checkedIn'>): Promise<string | null> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態を検出しました。予約できません。');
      toast.error('ネットワーク接続がありません', {
        description: 'インターネットに接続してから再度お試しください',
        duration: 5000,
      });
      return null;
    }

    // データに追加情報を付与
    const dataToSave = {
      ...data,
      status: 'pending' as const,
      checkedIn: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      // 'bookings' コレクションにデータを追加
      const bookingsRef = collection(firestoreDb, 'bookings');
      const docRef = await addDoc(bookingsRef, dataToSave);
      
      console.log('予約データを保存しました:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('予約データの保存に失敗しました:', error);
      toast.error('予約の保存に失敗しました', {
        description: 'しばらくしてから再度お試しください',
        duration: 5000,
      });
      return null;
    }
  } catch (error) {
    console.error('予約データの保存処理中にエラーが発生しました:', error);
    toast.error('予約処理中にエラーが発生しました', {
      description: 'しばらくしてから再度お試しください',
      duration: 5000,
    });
    return null;
  }
}

/**
 * 特定の日付の予約を取得する関数
 * @param date 日付（YYYY-MM-DD形式）
 * @returns 予約データの配列
 */
export async function getBookingsByDate(date: string): Promise<BookingData[]> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態のため、予約データの取得をスキップします。');
      return [];
    }

    // 指定日の予約データを取得
    const bookingsRef = collection(firestoreDb, 'bookings');
    const q = query(
      bookingsRef,
      where('startDate', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    // 予約データの配列を作成
    const bookings: BookingData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bookings.push({
        id: doc.id,
        room: data.room,
        startTime: data.startTime,
        endTime: data.endTime,
        startDate: data.startDate,
        endDate: data.endDate,
        count: data.count,
        purpose: data.purpose,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: data.status,
        checkedIn: data.checkedIn
      });
    });
    
    console.log(`${date}の予約データ:`, bookings);
    return bookings;
  } catch (error) {
    console.error('予約データの取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * 特定の部屋と日付の予約を取得する関数
 * @param room 部屋名
 * @param date 日付（YYYY-MM-DD形式）
 * @returns 予約データの配列
 */
export async function getBookingsByRoomAndDate(room: string, date: string): Promise<BookingData[]> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態のため、予約データの取得をスキップします。');
      return [];
    }

    // 指定の部屋と日付の予約データを取得
    const bookingsRef = collection(firestoreDb, 'bookings');
    const q = query(
      bookingsRef,
      where('room', '==', room),
      where('startDate', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    // 予約データの配列を作成
    const bookings: BookingData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bookings.push({
        id: doc.id,
        room: data.room,
        startTime: data.startTime,
        endTime: data.endTime,
        startDate: data.startDate,
        endDate: data.endDate,
        count: data.count,
        purpose: data.purpose,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: data.status,
        checkedIn: data.checkedIn
      });
    });
    
    console.log(`${room}の${date}の予約データ:`, bookings);
    return bookings;
  } catch (error) {
    console.error('予約データの取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * 予約ステータスを更新する関数
 * @param bookingId 予約ID
 * @param status 新しいステータス
 * @returns 更新が成功した場合はtrue、失敗した場合はfalse
 */
export async function updateBookingStatus(bookingId: string, status: BookingData['status']): Promise<boolean> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態のため、予約ステータスの更新をスキップします。');
      return false;
    }

    const bookingRef = doc(firestoreDb, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    console.log(`予約ID: ${bookingId} のステータスを ${status} に更新しました。`);
    return true;
  } catch (error) {
    console.error('予約ステータスの更新中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * 予約のチェックイン状態を更新する関数
 * @param bookingId 予約ID
 * @param checkedIn チェックイン状態
 * @returns 更新が成功した場合はtrue、失敗した場合はfalse
 */
export async function updateBookingCheckedInStatus(bookingId: string, checkedIn: boolean): Promise<boolean> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態のため、チェックイン状態の更新をスキップします。');
      return false;
    }

    const bookingRef = doc(firestoreDb, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      checkedIn,
      updatedAt: serverTimestamp()
    });
    
    console.log(`予約ID: ${bookingId} のチェックイン状態を ${checkedIn} に更新しました。`);
    return true;
  } catch (error) {
    console.error('チェックイン状態の更新中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * 予約を取得する関数
 * @param bookingId 予約ID
 * @returns 予約データ、存在しない場合はnull
 */
export async function getBookingById(bookingId: string): Promise<BookingData | null> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態のため、予約データの取得をスキップします。');
      return null;
    }

    const bookingRef = doc(firestoreDb, 'bookings', bookingId);
    const docSnap = await getDoc(bookingRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        room: data.room,
        startTime: data.startTime,
        endTime: data.endTime,
        startDate: data.startDate,
        endDate: data.endDate,
        count: data.count,
        purpose: data.purpose,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: data.status,
        checkedIn: data.checkedIn
      };
    } else {
      console.log(`予約ID: ${bookingId} の予約データが見つかりませんでした。`);
      return null;
    }
  } catch (error) {
    console.error('予約データの取得中にエラーが発生しました:', error);
    return null;
  }
}

/**
 * 予約を削除する関数
 * @param bookingId 予約ID
 * @returns 削除が成功した場合はtrue、失敗した場合はfalse
 */
export async function deleteBooking(bookingId: string): Promise<boolean> {
  try {
    // ネットワーク状態をチェック
    if (!navigator.onLine) {
      console.log('オフライン状態のため、予約の削除をスキップします。');
      return false;
    }

    const bookingRef = doc(firestoreDb, 'bookings', bookingId);
    await deleteDoc(bookingRef);
    
    console.log(`予約ID: ${bookingId} の予約を削除しました。`);
    return true;
  } catch (error) {
    console.error('予約の削除中にエラーが発生しました:', error);
    return false;
  }
}