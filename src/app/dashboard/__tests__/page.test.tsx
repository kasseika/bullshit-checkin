/**
 * ダッシュボードページのテスト
 */
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../page";
import { getDashboardStats, getRecentCheckIns } from "@/lib/dashboardFirestore";

jest.mock("@/lib/dashboardFirestore", () => ({
  getDashboardStats: jest.fn(),
  getRecentCheckIns: jest.fn(),
}));

jest.mock("@/utils/dateUtils", () => ({
  formatDateTimeToJST: jest.fn((date: Date) => {
    // テスト用に日時を返す
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // UTC to JST
    const year = jstDate.getUTCFullYear();
    const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getUTCDate()).padStart(2, '0');
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }),
}));

const mockGetDashboardStats = getDashboardStats as jest.MockedFunction<typeof getDashboardStats>;
const mockGetRecentCheckIns = getRecentCheckIns as jest.MockedFunction<typeof getRecentCheckIns>;

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ローディング中にスケルトンを表示する", () => {
    mockGetDashboardStats.mockResolvedValue({
      todayCheckIns: 0,
      currentlyInUse: 0,
      todayBookings: 0,
    });
    mockGetRecentCheckIns.mockResolvedValue([]);

    render(<DashboardPage />);
    expect(screen.getAllByTestId("skeleton-slot").length).toBeGreaterThan(0);
  });

  it("統計情報を正しく表示する", async () => {
    mockGetDashboardStats.mockResolvedValue({
      todayCheckIns: 5,
      currentlyInUse: 3,
      todayBookings: 8,
    });
    mockGetRecentCheckIns.mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText(/最終更新: .* \(JST\)/)).toBeInTheDocument();
    });
  });

  it("最近のチェックイン情報を表示する", async () => {
    mockGetDashboardStats.mockResolvedValue({
      todayCheckIns: 0,
      currentlyInUse: 0,
      todayBookings: 0,
    });
    mockGetRecentCheckIns.mockResolvedValue([
      {
        id: "1",
        room: "会議室A",
        startTime: "10:00",
        endTime: "11:00",
        count: 5,
        purpose: "会議",
        ageGroup: "20-40代",
        checkInTime: "2024-03-15T00:55:00.000Z",
      },
      {
        id: "2",
        room: "セミナー室",
        startTime: "14:00",
        endTime: "16:00",
        count: 20,
        purpose: "研修",
        ageGroup: "30-50代",
        checkInTime: "2024-03-15T04:50:00.000Z",
      },
    ]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("会議室A")).toBeInTheDocument();
      expect(screen.getByText(/10:00 - 11:00 \/ 5名 \/ 会議/)).toBeInTheDocument();
      expect(screen.getByText("2024/03/15 09:55")).toBeInTheDocument();
      expect(screen.getByText("セミナー室")).toBeInTheDocument();
      expect(screen.getByText(/14:00 - 16:00 \/ 20名 \/ 研修/)).toBeInTheDocument();
      expect(screen.getByText("2024/03/15 13:50")).toBeInTheDocument();
    });
  });

  it("チェックイン情報がない場合のメッセージを表示する", async () => {
    mockGetDashboardStats.mockResolvedValue({
      todayCheckIns: 0,
      currentlyInUse: 0,
      todayBookings: 0,
    });
    mockGetRecentCheckIns.mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("チェックイン情報がありません")).toBeInTheDocument();
    });
  });

  it("エラー時にコンソールにエラーを表示する", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    mockGetDashboardStats.mockRejectedValue(new Error("Firestore error"));
    mockGetRecentCheckIns.mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching dashboard data:",
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });
});