/**
 * ダッシュボード用Firestore関数のテスト
 */
import { getDocs, QuerySnapshot, DocumentData } from "firebase/firestore";
import {
  getTodayCheckIns,
  getRecentCheckIns,
  getTodayBookings,
  getCurrentlyInUseCount,
  getDashboardStats,
  getMonthlyCheckIns,
  getMonthlyBookings,
  getMonthlyStats,
  getDateRangeStats,
  calculateStayMinutes,
} from "../dashboardFirestore";

jest.mock("../firebase", () => ({
  firestoreDb: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

jest.mock("@/utils/dateUtils", () => ({
  formatDateToJST: jest.fn(() => "2024-03-15"),
  formatTimeToJST: jest.fn(() => "14:30"),
  getJSTTodayStart: jest.fn(() => new Date("2024-03-15T00:00:00+09:00")),
  getCurrentTime: jest.fn(() => new Date("2024-03-15T14:30:00+09:00")),
}));

const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

describe("dashboardFirestore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTodayCheckIns", () => {
    it("今日のチェックイン情報を取得できる", async () => {
      const mockData = [
        {
          id: "1",
          data: () => ({
            room: "会議室A",
            startTime: "10:00",
            endTime: "11:00",
            count: 5,
            purpose: "会議",
            ageGroup: "20-40代",
            checkInTime: "09:55",
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockData,
        size: mockData.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getTodayCheckIns();
      expect(result).toHaveLength(1);
      expect(result[0].room).toBe("会議室A");
    });
  });

  describe("getRecentCheckIns", () => {
    it("最近のチェックイン情報を取得できる", async () => {
      const mockData = [
        {
          id: "1",
          data: () => ({
            room: "会議室B",
            startTime: "14:00",
            endTime: "15:00",
            count: 3,
            purpose: "打ち合わせ",
            ageGroup: "30-50代",
            checkInTime: "13:55",
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockData,
        size: mockData.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getRecentCheckIns(5);
      expect(result).toHaveLength(1);
      expect(result[0].room).toBe("会議室B");
    });
  });

  describe("getTodayBookings", () => {
    it("今日の予約情報を取得できる", async () => {
      const mockData = [
        {
          id: "1",
          data: () => ({
            room: "セミナー室",
            startTime: "16:00",
            endTime: "18:00",
            startDate: "2024-03-15",
            endDate: "2024-03-15",
            count: 20,
            purpose: "セミナー",
            contactName: "田中太郎",
            contactEmail: "tanaka@example.com",
            contactPhone: "090-1234-5678",
            status: "confirmed",
            checkedIn: false,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockData,
        size: mockData.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getTodayBookings();
      expect(result).toHaveLength(1);
      expect(result[0].room).toBe("セミナー室");
      expect(result[0].status).toBe("confirmed");
    });
  });

  describe("getCurrentlyInUseCount", () => {
    it("現在利用中の部屋数を取得できる", async () => {
      const mockDocs = [
        { data: () => ({ endTime: "23:59" }) }, // Will pass filter
        { data: () => ({ endTime: "23:59" }) }, // Will pass filter
        { data: () => ({ endTime: "23:59" }) }, // Will pass filter
      ];
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        size: mockDocs.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getCurrentlyInUseCount();
      expect(result).toBe(3);
    });
  });

  describe("getDashboardStats", () => {
    it("ダッシュボードの統計情報を取得できる", async () => {
      const mockCheckIns = [
        { id: "1", data: () => ({ room: "会議室A" }) },
        { id: "2", data: () => ({ room: "会議室B" }) },
        { id: "3", data: () => ({ room: "会議室C" }) },
      ];
      const mockBookings = [
        { id: "1", data: () => ({ room: "セミナー室" }) },
        { id: "2", data: () => ({ room: "研修室" }) },
      ];

      const mockInUseDocs = [
        { data: () => ({ endTime: "23:59" }) },
        { data: () => ({ endTime: "23:59" }) },
        { data: () => ({ endTime: "23:59" }) },
        { data: () => ({ endTime: "23:59" }) },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockCheckIns,
          size: mockCheckIns.length,
        } as unknown as QuerySnapshot<DocumentData>)
        .mockResolvedValueOnce({
          docs: mockBookings,
          size: mockBookings.length,
        } as unknown as QuerySnapshot<DocumentData>)
        .mockResolvedValueOnce({
          docs: mockInUseDocs,
          size: mockInUseDocs.length,
        } as unknown as QuerySnapshot<DocumentData>);

      const result = await getDashboardStats();
      expect(result).toEqual({
        todayCheckIns: 3,
        currentlyInUse: 4,
        todayBookings: 2,
      });
    });

    it("エラー時はゼロを返す", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const result = await getDashboardStats();
      expect(result).toEqual({
        todayCheckIns: 0,
        currentlyInUse: 0,
        todayBookings: 0,
      });
    });
  });

  describe("getMonthlyCheckIns", () => {
    it("指定した年月のチェックイン情報を取得できる", async () => {
      const mockData = [
        {
          id: "1",
          data: () => ({
            room: "会議室A",
            startTime: "10:00",
            endTime: "11:00",
            startDate: "2025-01-15",
            count: 5,
            purpose: "会議",
            ageGroup: "20-40代",
            checkInTime: "09:55",
          }),
        },
        {
          id: "2",
          data: () => ({
            room: "会議室B",
            startTime: "14:00",
            endTime: "15:00",
            startDate: "2025-01-20",
            count: 3,
            purpose: "打ち合わせ",
            ageGroup: "30-50代",
            checkInTime: "13:55",
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockData,
        size: mockData.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getMonthlyCheckIns(2025, 1);
      expect(result).toHaveLength(2);
      expect(result[0].startDate).toBe("2025-01-15");
      expect(result[1].startDate).toBe("2025-01-20");
    });
  });

  describe("getMonthlyBookings", () => {
    it("指定した年月の予約情報を取得できる", async () => {
      const mockData = [
        {
          id: "1",
          data: () => ({
            room: "セミナー室",
            startTime: "16:00",
            endTime: "18:00",
            startDate: "2025-01-10",
            endDate: "2025-01-10",
            count: 20,
            purpose: "セミナー",
            contactName: "田中太郎",
            contactEmail: "tanaka@example.com",
            contactPhone: "090-1234-5678",
            status: "confirmed",
            checkedIn: false,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockData,
        size: mockData.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const result = await getMonthlyBookings(2025, 1);
      expect(result).toHaveLength(1);
      expect(result[0].startDate).toBe("2025-01-10");
    });
  });

  describe("getMonthlyStats", () => {
    it("月別の統計情報を取得できる", async () => {
      const mockCheckIns = [
        {
          id: "1",
          data: () => ({
            room: "large4",
            startDate: "2025-01-15",
            startTime: "10:00",
            endTime: "11:00",
            count: 3,
            ageGroup: "20s",
            purpose: "meeting",
          }),
        },
        {
          id: "2",
          data: () => ({
            room: "private4",
            startDate: "2025-01-15",
            startTime: "14:00",
            endTime: "15:00",
            count: 2,
            ageGroup: "30s",
            purpose: "remote",
          }),
        },
        {
          id: "3",
          data: () => ({
            room: "tour",
            startDate: "2025-01-20",
            startTime: "09:00",
            endTime: "10:00",
            count: 1,
            ageGroup: "under10s",
            purpose: "study",
          }),
        },
      ];
      const mockBookings = [
        {
          id: "1",
          data: () => ({
            room: "セミナー室",
            startDate: "2025-01-10",
          }),
        },
        {
          id: "2",
          data: () => ({
            room: "研修室",
            startDate: "2025-01-25",
          }),
        },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockCheckIns,
          size: mockCheckIns.length,
        } as unknown as QuerySnapshot<DocumentData>)
        .mockResolvedValueOnce({
          docs: mockBookings,
          size: mockBookings.length,
        } as unknown as QuerySnapshot<DocumentData>);

      const result = await getMonthlyStats(2025, 1);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.totalCheckIns).toBe(3);
      expect(result.totalBookings).toBe(2);
      expect(result.totalUsers).toBe(6); // 3 + 2 + 1
      expect(result.averageStayTime).toBe(60); // 全てが1時間なので平均は60分
      expect(result.peakDay).toBe("2025-01-15");
      expect(result.peakDayCheckIns).toBe(2);
      
      // 年代別統計
      expect(result.ageGroupStats.under20).toBe(1);
      expect(result.ageGroupStats.twenties).toBe(3);
      expect(result.ageGroupStats.thirties).toBe(2);
      expect(result.ageGroupStats.forties).toBe(0);
      
      // 目的別統計
      expect(result.purposeStats.meeting).toBe(3);
      expect(result.purposeStats.telework).toBe(2);
      expect(result.purposeStats.study).toBe(1);
      
      // 曜日別統計（2025-01-15は水曜日、2025-01-20は月曜日）
      expect(result.dayOfWeekStats.wednesday).toBe(5); // 3 + 2
      expect(result.dayOfWeekStats.monday).toBe(1);
      
      // 時間帯別統計
      expect(result.timeSlotStats.morning).toBe(4); // 09:00 and 10:00
      expect(result.timeSlotStats.afternoon).toBe(2); // 14:00
      
      // 部屋別統計（部屋コードが日本語名に正規化されていることを確認）
      expect(result.roomStats["4番大部屋"]).toBe(3);  // large4 -> 4番大部屋
      expect(result.roomStats["4番個室"]).toBe(2);    // private4 -> 4番個室
      expect(result.roomStats["見学"]).toBe(1);        // tour -> 見学
      
      // 全ての部屋が含まれていることを確認
      expect(result.roomStats).toHaveProperty("1番");
      expect(result.roomStats).toHaveProperty("4番個室");
      expect(result.roomStats).toHaveProperty("4番大部屋");
      expect(result.roomStats).toHaveProperty("6番大部屋");
      expect(result.roomStats).toHaveProperty("6番工作室");
      expect(result.roomStats).toHaveProperty("見学");
      
      // 0人の部屋も含まれていることを確認
      expect(result.roomStats["1番"]).toBe(0);
      expect(result.roomStats["6番大部屋"]).toBe(0);
      expect(result.roomStats["6番工作室"]).toBe(0);
      
      // 人数別統計（チェックインごとの人数を確認）
      expect(result.participantCountStats["1"]).toBe(1); // 1人のチェックインが1回
      expect(result.participantCountStats["2"]).toBe(1); // 2人のチェックインが1回  
      expect(result.participantCountStats["3"]).toBe(1); // 3人のチェックインが1回
      expect(result.participantCountStats["0"]).toBeUndefined(); // 0人は除外
    });

    it("エラー時はゼロを返す", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const result = await getMonthlyStats(2025, 1);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.totalCheckIns).toBe(0);
      expect(result.totalBookings).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.averageStayTime).toBe(0);
      expect(result.peakDay).toBeNull();
      expect(result.peakDayCheckIns).toBe(0);
      
      // 全ての統計がゼロ初期化されていることを確認
      expect(result.ageGroupStats.under20).toBe(0);
      expect(result.purposeStats.meeting).toBe(0);
      expect(result.dayOfWeekStats.monday).toBe(0);
      expect(result.timeSlotStats.morning).toBe(0);
      expect(result.roomStats).toEqual({});
      expect(result.participantCountStats).toEqual({});
      expect(result.averageStayTime).toBe(0);
    });
  });

  describe("getDateRangeStats", () => {
    it("指定期間の統計情報を取得できる", async () => {
      const mockCheckIns = [
        {
          id: "1",
          data: () => ({
            room: "large4",
            startDate: "2025-01-10",
            startTime: "09:00",
            endTime: "11:00",
            count: 5,
            ageGroup: "30s",
            purpose: "meeting",
          }),
        },
        {
          id: "2",
          data: () => ({
            room: "workshop6",
            startDate: "2025-01-12",
            startTime: "13:00",
            endTime: "14:30",
            count: 3,
            ageGroup: "20s",
            purpose: "creation",
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockCheckIns,
        size: mockCheckIns.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const fromDate = new Date("2025-01-10");
      const toDate = new Date("2025-01-15");
      const result = await getDateRangeStats(fromDate, toDate);

      expect(result.totalCheckIns).toBe(2);
      expect(result.totalUsers).toBe(8); // 5 + 3
      expect(result.averageStayTime).toBe(105); // (120 + 90) / 2 = 105分
      expect(result.peakDay).toBe("2025-01-10");
      expect(result.peakDayCheckIns).toBe(1);
      
      // 年代別統計
      expect(result.ageGroupStats.twenties).toBe(3);
      expect(result.ageGroupStats.thirties).toBe(5);
      
      // 目的別統計
      expect(result.purposeStats.meeting).toBe(5);
      expect(result.purposeStats.digital).toBe(3);
      
      // 部屋別統計
      expect(result.roomStats["4番大部屋"]).toBe(5);
      expect(result.roomStats["6番工作室"]).toBe(3);
    });

    it("滞在時間のデータが不完全な場合の平均滞在時間", async () => {
      const mockCheckIns = [
        {
          id: "1",
          data: () => ({
            room: "room1",
            startDate: "2025-01-10",
            startTime: "10:00",
            endTime: "12:00",
            count: 2,
          }),
        },
        {
          id: "2",
          data: () => ({
            room: "room1",
            startDate: "2025-01-11",
            startTime: "14:00",
            // endTimeがない
            count: 1,
          }),
        },
        {
          id: "3",
          data: () => ({
            room: "room1",
            startDate: "2025-01-12",
            // startTimeがない
            endTime: "16:00",
            count: 1,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockCheckIns,
        size: mockCheckIns.length,
      } as unknown as QuerySnapshot<DocumentData>);

      const fromDate = new Date("2025-01-10");
      const toDate = new Date("2025-01-15");
      const result = await getDateRangeStats(fromDate, toDate);

      expect(result.totalCheckIns).toBe(3);
      expect(result.totalUsers).toBe(4);
      // 有効なデータは1件だけなので120分
      expect(result.averageStayTime).toBe(120);
    });

    it("データがない場合の平均滞在時間", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        size: 0,
      } as unknown as QuerySnapshot<DocumentData>);

      const fromDate = new Date("2025-01-10");
      const toDate = new Date("2025-01-15");
      const result = await getDateRangeStats(fromDate, toDate);

      expect(result.totalCheckIns).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.averageStayTime).toBe(0);
    });
  });

  describe("calculateStayMinutes", () => {
    it("正常な時刻形式で滞在時間を計算できる", () => {
      expect(calculateStayMinutes("09:00", "17:00")).toBe(480); // 8時間
      expect(calculateStayMinutes("14:30", "16:45")).toBe(135); // 2時間15分
      expect(calculateStayMinutes("00:00", "23:59")).toBe(1439); // 23時間59分
    });

    it("日跨ぎの場合の滞在時間を正しく計算できる", () => {
      expect(calculateStayMinutes("22:00", "02:00")).toBe(240); // 4時間
      expect(calculateStayMinutes("23:30", "00:30")).toBe(60); // 1時間
      expect(calculateStayMinutes("18:00", "09:00")).toBe(900); // 15時間
    });

    it("undefinedの場合はnullを返す", () => {
      expect(calculateStayMinutes(undefined, "17:00")).toBeNull();
      expect(calculateStayMinutes("09:00", undefined)).toBeNull();
      expect(calculateStayMinutes(undefined, undefined)).toBeNull();
    });

    it("不正な時刻形式の場合はnullを返す", () => {
      expect(calculateStayMinutes("09:00:00", "17:00")).toBeNull(); // 秒まで含む
      expect(calculateStayMinutes("09:00", "17")).toBeNull(); // 分がない
      expect(calculateStayMinutes("09", "17:00")).toBeNull(); // 分がない
      expect(calculateStayMinutes("", "17:00")).toBeNull(); // 空文字
      expect(calculateStayMinutes("09:00", "")).toBeNull(); // 空文字
      expect(calculateStayMinutes("9:00", "17:00")).toBe(480); // 1桁の時間も有効
    });

    it("数値でない文字が含まれる場合はnullを返す", () => {
      expect(calculateStayMinutes("ab:cd", "17:00")).toBeNull();
      expect(calculateStayMinutes("09:00", "ef:gh")).toBeNull();
      expect(calculateStayMinutes("9a:00", "17:00")).toBeNull();
      expect(calculateStayMinutes("09:0b", "17:00")).toBeNull();
    });

    it("時間の範囲が不正な場合はnullを返す", () => {
      expect(calculateStayMinutes("24:00", "17:00")).toBeNull(); // 24時は無効
      expect(calculateStayMinutes("09:00", "25:00")).toBeNull(); // 25時は無効
      expect(calculateStayMinutes("-1:00", "17:00")).toBeNull(); // 負の時間
      expect(calculateStayMinutes("09:60", "17:00")).toBeNull(); // 60分は無効
      expect(calculateStayMinutes("09:00", "17:70")).toBeNull(); // 70分は無効
      expect(calculateStayMinutes("09:-5", "17:00")).toBeNull(); // 負の分
    });

    it("境界値のテスト", () => {
      expect(calculateStayMinutes("00:00", "00:01")).toBe(1); // 1分
      expect(calculateStayMinutes("23:59", "00:00")).toBe(1); // 1分（日跨ぎ）
      expect(calculateStayMinutes("00:00", "23:59")).toBe(1439); // 23時間59分
      expect(calculateStayMinutes("12:00", "12:00")).toBe(0); // 同じ時刻は0分
    });
  });
});