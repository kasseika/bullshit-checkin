/**
 * 年月別集計ページのテスト
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MonthlyDashboardPage from "../page";
import { getMonthlyStats } from "@/lib/dashboardFirestore";

// モック設定
jest.mock("@/lib/dashboardFirestore", () => ({
  getMonthlyStats: jest.fn(),
}));

const mockGetMonthlyStats = getMonthlyStats as jest.MockedFunction<typeof getMonthlyStats>;

describe("MonthlyDashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("初期表示で現在の年月のデータを取得する", async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    mockGetMonthlyStats.mockResolvedValue({
      year: currentYear,
      month: currentMonth,
      totalCheckIns: 150,
      totalBookings: 120,
      averageUtilizationRate: 65,
      peakDay: "2025-01-15",
      peakDayCheckIns: 25,
    });

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      expect(mockGetMonthlyStats).toHaveBeenCalledWith(currentYear, currentMonth);
    });

    expect(screen.getByText("月別集計")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("年月を変更するとデータを再取得する", async () => {
    mockGetMonthlyStats.mockResolvedValue({
      year: 2024,
      month: 12,
      totalCheckIns: 200,
      totalBookings: 180,
      averageUtilizationRate: 75,
      peakDay: null,
      peakDayCheckIns: 0,
    });

    render(<MonthlyDashboardPage />);

    // 年を変更
    const yearSelect = screen.getByDisplayValue(/年$/);
    fireEvent.change(yearSelect, { target: { value: "2024" } });

    // 月を変更
    const monthSelect = screen.getByDisplayValue(/月$/);
    fireEvent.change(monthSelect, { target: { value: "12" } });

    await waitFor(() => {
      expect(mockGetMonthlyStats).toHaveBeenCalledWith(2024, 12);
    });

    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("データ取得中はローディング表示を行う", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockGetMonthlyStats.mockReturnValue(promise as any);

    render(<MonthlyDashboardPage />);

    // ローディング中の表示を確認（animate-pulseクラスを持つ要素を探す）
    const loadingElements = document.querySelectorAll(".animate-pulse");
    expect(loadingElements.length).toBeGreaterThan(0);

    // データ取得完了
    resolvePromise!({
      year: 2025,
      month: 1,
      totalCheckIns: 100,
      totalBookings: 80,
      averageUtilizationRate: 50,
      peakDay: null,
      peakDayCheckIns: 0,
    });

    await waitFor(() => {
      const afterLoadingElements = document.querySelectorAll(".animate-pulse");
      expect(afterLoadingElements.length).toBe(0);
    });
  });

  it("エラー時は適切にハンドリングする", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    mockGetMonthlyStats.mockRejectedValue(new Error("データ取得エラー"));

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching monthly stats:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("ピーク日がない場合は「-」を表示する", async () => {
    mockGetMonthlyStats.mockResolvedValue({
      year: 2025,
      month: 1,
      totalCheckIns: 0,
      totalBookings: 0,
      averageUtilizationRate: 0,
      peakDay: null,
      peakDayCheckIns: 0,
    });

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });
});