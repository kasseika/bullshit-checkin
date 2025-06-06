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
import { formatDateToJST, formatTimeToJST, getJSTTodayStart, getCurrentTime } from "@/utils/dateUtils";

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
}

/**
 * 滞在時間を分単位で計算する
 * @param startTime 開始時刻（HH:MM形式）
 * @param endTime 終了時刻（HH:MM形式）
 * @returns 滞在時間（分）、無効な場合はnull
 */
export function calculateStayMinutes(startTime: string | undefined, endTime: string | undefined): number | null {
  if (!startTime || !endTime) {
    return null;
  }

  const startParts = startTime.split(':');
  const endParts = endTime.split(':');

  // 時刻形式の検証
  if (startParts.length !== 2 || endParts.length !== 2) {
    return null;
  }

  const startHour = Number(startParts[0]);
  const startMinute = Number(startParts[1]);
  const endHour = Number(endParts[0]);
  const endMinute = Number(endParts[1]);

  // 数値の妥当性チェック
  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
    return null;
  }

  // 時間と分の範囲チェック
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 ||
      startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
    return null;
  }

  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;

  // 日跨ぎ対応：終了時刻が開始時刻より前の場合、24時間追加
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
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
  const now = getCurrentTime();
  const currentTime = formatTimeToJST(now); // HH:MM形式
  const todayStr = formatDateToJST(now);

  const checkInsRef = collection(db, "checkins");
  const q = query(
    checkInsRef,
    where("startDate", "==", todayStr),
    where("startTime", "<=", currentTime)
  );

  const querySnapshot = await getDocs(q);
  
  // Client-side filtering for endTime
  const activeCheckIns = querySnapshot.docs.filter(doc => {
    const data = doc.data();
    return data.endTime >= currentTime;
  });
  
  return activeCheckIns.length;
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

    return {
      todayCheckIns: todayCheckIns.length,
      currentlyInUse,
      todayBookings: todayBookings.length,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      todayCheckIns: 0,
      currentlyInUse: 0,
      todayBookings: 0,
    };
  }
}

// 月別集計用のデータ型
export interface MonthlyStats {
  year?: number;
  month?: number;
  totalCheckIns: number;
  totalBookings?: number;
  peakDay: string | null;
  peakDayCheckIns: number;
  totalUsers: number; // 選択区間の利用者数
  averageStayTime: number; // 平均滞在時間（分）
  ageGroupStats: AgeGroupStats;
  purposeStats: PurposeStats;
  dayOfWeekStats: DayOfWeekStats;
  timeSlotStats: TimeSlotStats;
  roomStats: RoomStats;  // 部屋別統計を追加
  participantCountStats: ParticipantCountStats;  // 人数別統計を追加
}

// 年代別統計
export interface AgeGroupStats {
  under20: number;    // 10代以下
  twenties: number;   // 20代
  thirties: number;   // 30代
  forties: number;    // 40代
  fifties: number;    // 50代
  over60: number;     // 60代以上
  unknown: number;    // 不明
  [key: string]: number;  // インデックスシグネチャ
}

// 目的別統計
export interface PurposeStats {
  meeting: number;         // 会議・打合せ利用
  telework: number;        // テレワーク利用
  study: number;           // 学習利用
  event: number;           // イベント・講座
  digital: number;         // デジタル制作(VR等含む)
  inspection: number;      // 視察・見学・取材
  other: number;           // その他(IT相談、機器貸出等)
  unknown: number;         // 不明
  [key: string]: number;   // インデックスシグネチャ
}

// 曜日別統計
export interface DayOfWeekStats {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  [key: string]: number;   // インデックスシグネチャ
}

// 時間帯別統計
export interface TimeSlotStats {
  morning: number;    // 午前(9:00-12:00)
  afternoon: number;  // 午後(12:00-18:00)
  evening: number;    // 夜(18:00-0:00)
  unknown: number;    // 不明
  [key: string]: number;   // インデックスシグネチャ
}

// 部屋別統計
export interface RoomStats {
  [room: string]: number;  // 部屋名: 利用者数
}

// 人数別統計
export interface ParticipantCountStats {
  [count: string]: number;  // 人数: チェックイン回数
}

/**
 * 年代グループを判定する
 */
function categorizeAgeGroup(ageGroup: string): keyof AgeGroupStats {
  switch (ageGroup) {
    case "under10s":
      return "under20";
    case "20s":
      return "twenties";
    case "30s":
      return "thirties";
    case "40s":
      return "forties";
    case "50s":
      return "fifties";
    case "over60s":
      return "over60";
    default:
      return "unknown";
  }
}

/**
 * 目的を分類する
 */
function categorizePurpose(purpose: string): keyof PurposeStats {
  switch (purpose) {
    case "meeting":
      return "meeting";
    case "remote":
      return "telework";
    case "study":
      return "study";
    case "event":
      return "event";
    case "creation":
      return "digital";
    case "tour":
      return "inspection";
    case "other":
      return "other";
    default:
      return "unknown";
  }
}

/**
 * 日付から曜日を取得する
 */
function getDayOfWeek(dateStr: string): keyof DayOfWeekStats {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (dayOfWeek) {
    case 1: return "monday";
    case 2: return "tuesday";
    case 3: return "wednesday";
    case 4: return "thursday";
    case 5: return "friday";
    case 6: return "saturday";
    case 0: return "sunday";
    default: return "monday"; // fallback
  }
}

/**
 * 時間帯を分類する
 */
function categorizeTimeSlot(timeStr: string): keyof TimeSlotStats {
  if (!timeStr) return "unknown";
  
  const [hourStr] = timeStr.split(":");
  const hour = Number.parseInt(hourStr, 10);
  
  if (hour >= 9 && hour < 12) {
    return "morning";    // 9:00-12:00
  } else if (hour >= 12 && hour < 18) {
    return "afternoon";  // 12:00-18:00
  } else if (hour >= 18 && hour < 24) {
    return "evening";    // 18:00-0:00
  } else {
    return "unknown";
  }
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

// 部屋コードと日本語名のマッピング
const ROOM_CODE_TO_NAME: { [key: string]: string } = {
  "room1": "1番",
  "private4": "4番個室",
  "large4": "4番大部屋",
  "large6": "6番大部屋",
  "workshop6": "6番工作室",
  "tour": "見学",
  // 既に日本語名の場合はそのままマッピング
  "1番": "1番",
  "4番個室": "4番個室",
  "4番大部屋": "4番大部屋",
  "6番大部屋": "6番大部屋",
  "6番工作室": "6番工作室",
  "6番 大部屋・工作室": "6番大部屋",  // 旧名称の統一
  "見学": "見学",
};

// 全ての部屋のリスト（0人の部屋も表示するため）
const ALL_ROOMS = [
  "1番",
  "4番個室",
  "4番大部屋",
  "6番大部屋",
  "6番工作室",
  "見学",
];

/**
 * 部屋名を正規化する
 */
function normalizeRoomName(room: string): string {
  return ROOM_CODE_TO_NAME[room] || room;
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
    let peakDay = null;
    let peakDayCheckIns = 0;
    Object.entries(dailyCheckIns).forEach(([date, count]) => {
      if (count > peakDayCheckIns) {
        peakDay = date;
        peakDayCheckIns = count;
      }
    });
    
    
    // 選択区間の利用者数を計算（各チェックインのcountを合計）
    const totalUsers = checkIns.reduce((sum, checkIn) => sum + (checkIn.count || 0), 0);
    
    // 平均滞在時間を計算
    let totalStayTime = 0;
    let validStayTimeCount = 0;
    
    checkIns.forEach(checkIn => {
      const stayMinutes = calculateStayMinutes(checkIn.startTime, checkIn.endTime);
      if (stayMinutes !== null) {
        totalStayTime += stayMinutes;
        validStayTimeCount++;
      }
    });
    
    const averageStayTime = validStayTimeCount > 0 ? Math.round(totalStayTime / validStayTimeCount) : 0;
    
    // 年代別統計を初期化
    const ageGroupStats: AgeGroupStats = {
      under20: 0,
      twenties: 0,
      thirties: 0,
      forties: 0,
      fifties: 0,
      over60: 0,
      unknown: 0,
    };
    
    // 目的別統計を初期化
    const purposeStats: PurposeStats = {
      meeting: 0,
      telework: 0,
      study: 0,
      event: 0,
      digital: 0,
      inspection: 0,
      other: 0,
      unknown: 0,
    };
    
    // 曜日別統計を初期化
    const dayOfWeekStats: DayOfWeekStats = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
    };
    
    // 時間帯別統計を初期化
    const timeSlotStats: TimeSlotStats = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      unknown: 0,
    };
    
    // 部屋別統計を初期化（全ての部屋を0で初期化）
    const roomStats: RoomStats = {};
    ALL_ROOMS.forEach(room => {
      roomStats[room] = 0;
    });
    
    // 人数別統計を初期化
    const participantCountStats: ParticipantCountStats = {};
    
    // 各チェックインデータを集計
    checkIns.forEach(checkIn => {
      const userCount = checkIn.count || 0;
      
      // 年代別統計
      const ageCategory = categorizeAgeGroup(checkIn.ageGroup || "");
      ageGroupStats[ageCategory] += userCount;
      
      // 目的別統計
      const purposeCategory = categorizePurpose(checkIn.purpose || "");
      purposeStats[purposeCategory] += userCount;
      
      // 曜日別統計
      if (checkIn.startDate) {
        const dayCategory = getDayOfWeek(checkIn.startDate);
        dayOfWeekStats[dayCategory] += userCount;
      }
      
      // 時間帯別統計
      const timeCategory = categorizeTimeSlot(checkIn.startTime || "");
      timeSlotStats[timeCategory] += userCount;
      
      // 部屋別統計（部屋名を正規化）
      if (checkIn.room) {
        const normalizedRoom = normalizeRoomName(checkIn.room);
        roomStats[normalizedRoom] = (roomStats[normalizedRoom] || 0) + userCount;
      }
      
      // 人数別統計（0人は除外）
      if (userCount > 0) {
        const countKey = userCount.toString();
        participantCountStats[countKey] = (participantCountStats[countKey] || 0) + 1;
      }
    });
    
    return {
      year,
      month,
      totalCheckIns: checkIns.length,
      totalBookings: bookings.length,
      peakDay,
      peakDayCheckIns,
      totalUsers,
      averageStayTime,
      ageGroupStats,
      purposeStats,
      dayOfWeekStats,
      timeSlotStats,
      roomStats,
      participantCountStats,
    };
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    return {
      year,
      month,
      totalCheckIns: 0,
      totalBookings: 0,
      peakDay: null,
      peakDayCheckIns: 0,
      totalUsers: 0,
      averageStayTime: 0,
      ageGroupStats: {
        under20: 0,
        twenties: 0,
        thirties: 0,
        forties: 0,
        fifties: 0,
        over60: 0,
        unknown: 0,
      },
      purposeStats: {
        meeting: 0,
        telework: 0,
        study: 0,
        event: 0,
        digital: 0,
        inspection: 0,
        other: 0,
        unknown: 0,
      },
      dayOfWeekStats: {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      },
      timeSlotStats: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        unknown: 0,
      },
      roomStats: {},
      participantCountStats: {},
    };
  }
}

/**
 * 指定した日付範囲のチェックイン情報を取得
 */
export async function getDateRangeCheckIns(fromDate: Date, toDate: Date): Promise<DashboardCheckInData[]> {
  const startDateStr = formatDateToJST(fromDate);
  const endDateStr = formatDateToJST(toDate);
  
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
 * 指定した日付範囲の統計情報を取得
 */
export async function getDateRangeStats(fromDate: Date, toDate: Date): Promise<MonthlyStats> {
  const checkIns = await getDateRangeCheckIns(fromDate, toDate);
  
  if (checkIns.length === 0) {
    return {
      totalCheckIns: 0,
      totalUsers: 0,
      averageStayTime: 0,
      peakDay: null,
      peakDayCheckIns: 0,
      ageGroupStats: {
        under20: 0,
        twenties: 0,
        thirties: 0,
        forties: 0,
        fifties: 0,
        over60: 0,
        unknown: 0,
      },
      purposeStats: {
        meeting: 0,
        telework: 0,
        study: 0,
        event: 0,
        digital: 0,
        inspection: 0,
        other: 0,
        unknown: 0,
      },
      dayOfWeekStats: {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      },
      timeSlotStats: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        unknown: 0,
      },
      roomStats: {},
      participantCountStats: {},
    };
  }

  // 統計データを初期化
  const ageGroupStats: AgeGroupStats = {
    under20: 0,
    twenties: 0,
    thirties: 0,
    forties: 0,
    fifties: 0,
    over60: 0,
    unknown: 0,
  };

  const purposeStats: PurposeStats = {
    meeting: 0,
    telework: 0,
    study: 0,
    event: 0,
    digital: 0,
    inspection: 0,
    other: 0,
    unknown: 0,
  };

  const dayOfWeekStats: DayOfWeekStats = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  };

  const timeSlotStats: TimeSlotStats = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    unknown: 0,
  };

  const roomStats: RoomStats = {};
  const participantCountStats: ParticipantCountStats = {};

  // 日別のチェックイン数を追跡（ピーク日算出用）
  const dailyCheckIns: Record<string, number> = {};

  // 全ての部屋を初期化
  ALL_ROOMS.forEach(room => {
    roomStats[room] = 0;
  });

  // チェックインデータを集計
  let totalUsers = 0;
  let totalStayTime = 0;
  let validStayTimeCount = 0;
  
  checkIns.forEach(checkIn => {
    const userCount = checkIn.count || 0;
    totalUsers += userCount;

    // 年代別統計
    const ageGroup = categorizeAgeGroup(checkIn.ageGroup);
    ageGroupStats[ageGroup] += userCount;

    // 目的別統計
    const purpose = categorizePurpose(checkIn.purpose);
    purposeStats[purpose] += userCount;

    // 曜日別統計
    if (checkIn.startDate) {
      const dayOfWeek = getDayOfWeek(checkIn.startDate);
      dayOfWeekStats[dayOfWeek] += userCount;

      // 日別チェックイン数を記録
      dailyCheckIns[checkIn.startDate] = (dailyCheckIns[checkIn.startDate] || 0) + 1;
    }

    // 時間帯別統計
    const timeSlot = categorizeTimeSlot(checkIn.startTime);
    timeSlotStats[timeSlot] += userCount;

    // 部屋別統計（部屋名を正規化）
    if (checkIn.room) {
      const normalizedRoom = normalizeRoomName(checkIn.room);
      roomStats[normalizedRoom] = (roomStats[normalizedRoom] || 0) + userCount;
    }

    // 人数別統計
    const participantCount = userCount.toString();
    participantCountStats[participantCount] = (participantCountStats[participantCount] || 0) + 1;
    
    // 滞在時間の計算
    if (checkIn.startTime && checkIn.endTime) {
      const [startHour, startMinute] = checkIn.startTime.split(':').map(Number);
      const [endHour, endMinute] = checkIn.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // 終了時間が開始時間より後の場合のみ計算
      if (endMinutes > startMinutes) {
        totalStayTime += endMinutes - startMinutes;
        validStayTimeCount++;
      }
    }
  });

  // ピーク日を算出
  let peakDay: string | null = null;
  let peakDayCheckIns = 0;

  Object.entries(dailyCheckIns).forEach(([date, count]) => {
    if (count > peakDayCheckIns) {
      peakDay = date;
      peakDayCheckIns = count;
    }
  });

  const averageStayTime = validStayTimeCount > 0 ? Math.round(totalStayTime / validStayTimeCount) : 0;
  
  return {
    totalCheckIns: checkIns.length,
    totalUsers,
    averageStayTime,
    peakDay,
    peakDayCheckIns,
    ageGroupStats,
    purposeStats,
    dayOfWeekStats,
    timeSlotStats,
    roomStats,
    participantCountStats,
  };
}