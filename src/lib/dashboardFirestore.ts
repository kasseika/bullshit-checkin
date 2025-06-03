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
 * 今日の日付範囲を取得
 */
function getTodayDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

/**
 * 今日のチェックイン情報を取得
 */
export async function getTodayCheckIns(): Promise<DashboardCheckInData[]> {
  const { today, tomorrow } = getTodayDateRange();
  const todayStr = today.toISOString().split("T")[0];

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
  const todayStr = today.toISOString().split("T")[0];

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
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM形式
  const todayStr = now.toISOString().split("T")[0];

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