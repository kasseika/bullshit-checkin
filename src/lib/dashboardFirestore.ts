/**
 * ダッシュボード用のFirestore関数
 * チェックイン情報と予約情報を取得する関数を提供
 */
import { firestoreDb as db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { formatDateToJST, formatTimeToJST, getJSTTodayStart, getJSTNow } from "@/utils/dateUtils";

// ダッシュボード用のチェックインデータ型
export interface DashboardCheckInData {
  id: string;
  room: string;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
  count: number;
  purpose: string;
  ageGroup: string;
  checkInTime: string;
  reservationId?: string | null;
  createdAt?: Timestamp;
}

// ダッシュボード用の予約データ型
export interface DashboardBookingData {
  id: string;
  room: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  count: number;
  purpose: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  checkedIn: boolean;
  createdAt?: Timestamp;
}

// ダッシュボードの統計情報
export interface DashboardStats {
  todayCheckIns: number;
  currentlyInUse: number;
  todayBookings: number;
  utilizationRate: number;
}

/**
 * 今日の日付範囲を取得（JST）
 */
function getTodayDateRange() {
  const today = getJSTTodayStart();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

/**
 * 今日のチェックイン情報を取得
 */
export async function getTodayCheckIns(): Promise<DashboardCheckInData[]> {
  const { today } = getTodayDateRange();
  const todayStr = formatDateToJST(today);

  const checkInsRef = collection(db, "checkins");
  const q = query(
    checkInsRef,
    where("startDate", "==", todayStr),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as DashboardCheckInData[];
}

/**
 * 最近のチェックイン情報を取得
 */
export async function getRecentCheckIns(limitCount: number = 5): Promise<DashboardCheckInData[]> {
  const checkInsRef = collection(db, "checkins");
  const q = query(checkInsRef, orderBy("createdAt", "desc"), limit(limitCount));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as DashboardCheckInData[];
}

/**
 * 今日の予約情報を取得
 */
export async function getTodayBookings(): Promise<DashboardBookingData[]> {
  const { today } = getTodayDateRange();
  const todayStr = formatDateToJST(today);

  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("startDate", "==", todayStr),
    orderBy("startTime", "asc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as DashboardBookingData[];
}

/**
 * 現在利用中の部屋数を取得
 */
export async function getCurrentlyInUseCount(): Promise<number> {
  const now = getJSTNow();
  const currentTime = formatTimeToJST(now); // HH:MM形式
  const todayStr = formatDateToJST(now);

  const checkInsRef = collection(db, "checkins");
  const q = query(
    checkInsRef,
    where("startDate", "==", todayStr),
    where("startTime", "<=", currentTime),
    where("endTime", ">=", currentTime)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.size;
}

/**
 * ダッシュボードの統計情報を取得
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [todayCheckIns, todayBookings, currentlyInUse] = await Promise.all([
      getTodayCheckIns(),
      getTodayBookings(),
      getCurrentlyInUseCount(),
    ]);

    // 利用率の計算（仮に10部屋あるとして）
    const totalRooms = 10;
    const utilizationRate = totalRooms > 0 ? (currentlyInUse / totalRooms) * 100 : 0;

    return {
      todayCheckIns: todayCheckIns.length,
      currentlyInUse,
      todayBookings: todayBookings.length,
      utilizationRate: Math.round(utilizationRate),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      todayCheckIns: 0,
      currentlyInUse: 0,
      todayBookings: 0,
      utilizationRate: 0,
    };
  }
}

// 月別集計用のデータ型
export interface MonthlyStats {
  year: number;
  month: number;
  totalCheckIns: number;
  totalBookings: number;
  averageUtilizationRate: number;
  peakDay: string | null;
  peakDayCheckIns: number;
}

/**
 * 指定した年月のチェックイン情報を取得
 */
export async function getMonthlyCheckIns(year: number, month: number): Promise<DashboardCheckInData[]> {
  // 月の開始日と終了日を計算
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 前月の最終日
  
  const startDateStr = formatDateToJST(startDate);
  const endDateStr = formatDateToJST(endDate);
  
  const checkInsRef = collection(db, "checkins");
  const q = query(
    checkInsRef,
    where("startDate", ">=", startDateStr),
    where("startDate", "<=", endDateStr),
    orderBy("startDate", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  const checkIns = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as DashboardCheckInData[];
  
  // クライアント側でcreatedAtでソート
  return checkIns.sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return b.createdAt.seconds - a.createdAt.seconds;
    }
    return 0;
  });
}

/**
 * 指定した年月の予約情報を取得
 */
export async function getMonthlyBookings(year: number, month: number): Promise<DashboardBookingData[]> {
  // 月の開始日と終了日を計算
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 前月の最終日
  
  const startDateStr = formatDateToJST(startDate);
  const endDateStr = formatDateToJST(endDate);
  
  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("startDate", ">=", startDateStr),
    where("startDate", "<=", endDateStr),
    orderBy("startDate", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  // クライアント側でstartTimeでソート
  const bookings = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as DashboardBookingData[];
  
  // startTimeでソート
  return bookings.sort((a, b) => {
    if (a.startDate === b.startDate) {
      return a.startTime.localeCompare(b.startTime);
    }
    return 0;
  });
}

/**
 * 月別の統計情報を取得
 */
export async function getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
  try {
    const [checkIns, bookings] = await Promise.all([
      getMonthlyCheckIns(year, month),
      getMonthlyBookings(year, month),
    ]);
    
    // 日別のチェックイン数を集計
    const dailyCheckIns: { [date: string]: number } = {};
    checkIns.forEach(checkIn => {
      const date = checkIn.startDate || "";
      dailyCheckIns[date] = (dailyCheckIns[date] || 0) + 1;
    });
    
    // ピーク日を特定
    let peakDay: string | null = null;
    let peakDayCheckIns = 0;
    Object.entries(dailyCheckIns).forEach(([date, count]) => {
      if (count > peakDayCheckIns) {
        peakDay = date;
        peakDayCheckIns = count;
      }
    });
    
    // 平均利用率の計算（簡易版：チェックイン数 / (営業日数 * 部屋数)）
    const totalRooms = 10;
    const daysInMonth = new Date(year, month, 0).getDate();
    const averageUtilizationRate = daysInMonth > 0 && totalRooms > 0 
      ? Math.round((checkIns.length / (daysInMonth * totalRooms)) * 100)
      : 0;
    
    return {
      year,
      month,
      totalCheckIns: checkIns.length,
      totalBookings: bookings.length,
      averageUtilizationRate,
      peakDay,
      peakDayCheckIns,
    };
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    return {
      year,
      month,
      totalCheckIns: 0,
      totalBookings: 0,
      averageUtilizationRate: 0,
      peakDay: null,
      peakDayCheckIns: 0,
    };
  }
}