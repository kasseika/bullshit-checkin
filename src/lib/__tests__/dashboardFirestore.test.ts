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
  getJSTNow: jest.fn(() => new Date("2024-03-15T14:30:00+09:00")),
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
      mockGetDocs.mockResolvedValue({
        docs: [],
        size: 3,
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
          docs: [],
          size: 4, // 4部屋利用中
        } as unknown as QuerySnapshot<DocumentData>);

      const result = await getDashboardStats();
      expect(result).toEqual({
        todayCheckIns: 3,
        currentlyInUse: 4,
        todayBookings: 2,
        utilizationRate: 40, // 4/10 * 100
      });
    });

    it("エラー時はゼロを返す", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const result = await getDashboardStats();
      expect(result).toEqual({
        todayCheckIns: 0,
        currentlyInUse: 0,
        todayBookings: 0,
        utilizationRate: 0,
      });
    });
  });
});