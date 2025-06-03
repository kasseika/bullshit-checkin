/**
 * 年月別集計ページのテスト
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MonthlyDashboardPage from "../page";
import { getMonthlyStats } from "@/lib/dashboardFirestore";
import type { MonthlyStats } from "@/lib/dashboardFirestore";

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
      totalUsers: 350,
      peakDay: "2025-01-15",
      peakDayCheckIns: 25,
      ageGroupStats: {
        under20: 50,
        twenties: 100,
        thirties: 80,
        forties: 60,
        fifties: 40,
        over60: 20,
        unknown: 0,
      },
      purposeStats: {
        meeting: 120,
        telework: 80,
        study: 60,
        event: 40,
        digital: 20,
        inspection: 15,
        other: 10,
        unknown: 5,
      },
      dayOfWeekStats: {
        monday: 50,
        tuesday: 55,
        wednesday: 60,
        thursday: 58,
        friday: 52,
        saturday: 35,
        sunday: 40,
      },
      timeSlotStats: {
        morning: 150,
        afternoon: 180,
        evening: 20,
        unknown: 0,
      },
    });

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      expect(mockGetMonthlyStats).toHaveBeenCalledWith(currentYear, currentMonth);
    });

    expect(screen.getByText("月別集計")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("350人")).toBeInTheDocument(); // 月全体の利用者数
    
    // 詳細統計の表示確認
    expect(screen.getByText("年代別")).toBeInTheDocument();
    expect(screen.getByText("目的別")).toBeInTheDocument();
    expect(screen.getByText("曜日別")).toBeInTheDocument();
    expect(screen.getByText("時間帯別")).toBeInTheDocument();
  });

  it("年月を変更するとデータを再取得する", async () => {
    mockGetMonthlyStats.mockResolvedValue({
      year: 2024,
      month: 12,
      totalCheckIns: 200,
      totalBookings: 180,
      totalUsers: 450,
      peakDay: null,
      peakDayCheckIns: 0,
      ageGroupStats: { under20: 0, twenties: 0, thirties: 0, forties: 0, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 0, telework: 0, study: 0, event: 0, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 0, afternoon: 0, evening: 0, unknown: 0 },
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
    expect(screen.getByText("450人")).toBeInTheDocument();
  });

  it("データ取得中はローディング表示を行う", async () => {
    // Promise executor内でresolve関数を即座に外部変数に割り当てる
    const { promise, resolve } = (() => {
      let resolveFunc: (value: MonthlyStats) => void = () => {};
      const promiseInstance = new Promise<MonthlyStats>((resolve) => {
        resolveFunc = resolve;
      });
      return { promise: promiseInstance, resolve: resolveFunc };
    })();

    mockGetMonthlyStats.mockReturnValue(promise);

    render(<MonthlyDashboardPage />);

    // ローディング中の表示を確認（animate-pulseクラスを持つ要素を探す）
    const loadingElements = document.querySelectorAll(".animate-pulse");
    expect(loadingElements.length).toBeGreaterThan(0);

    // データ取得完了
    resolve({
      year: 2025,
      month: 1,
      totalCheckIns: 100,
      totalBookings: 80,
      totalUsers: 250,
      peakDay: null,
      peakDayCheckIns: 0,
      ageGroupStats: { under20: 0, twenties: 0, thirties: 0, forties: 0, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 0, telework: 0, study: 0, event: 0, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 0, afternoon: 0, evening: 0, unknown: 0 },
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
      totalUsers: 0,
      peakDay: null,
      peakDayCheckIns: 0,
      ageGroupStats: { under20: 0, twenties: 0, thirties: 0, forties: 0, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 0, telework: 0, study: 0, event: 0, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 0, afternoon: 0, evening: 0, unknown: 0 },
    });

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  it("詳細統計が正しく表示される", async () => {
    mockGetMonthlyStats.mockResolvedValue({
      year: 2025,
      month: 1,
      totalCheckIns: 100,
      totalBookings: 50,
      totalUsers: 250,
      peakDay: "2025-01-15",
      peakDayCheckIns: 15,
      ageGroupStats: {
        under20: 30,
        twenties: 80,
        thirties: 70,
        forties: 40,
        fifties: 20,
        over60: 10,
        unknown: 0,
      },
      purposeStats: {
        meeting: 100,
        telework: 60,
        study: 40,
        event: 30,
        digital: 15,
        inspection: 3,
        other: 2,
        unknown: 0,
      },
      dayOfWeekStats: {
        monday: 40,
        tuesday: 38,
        wednesday: 42,
        thursday: 45,
        friday: 43,
        saturday: 22,
        sunday: 20,
      },
      timeSlotStats: {
        morning: 120,
        afternoon: 110,
        evening: 20,
        unknown: 0,
      },
    });

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      // 統計カテゴリのタイトルが表示されていることを確認
      expect(screen.getByText("年代別")).toBeInTheDocument();
      expect(screen.getByText("目的別")).toBeInTheDocument();
      expect(screen.getByText("曜日別")).toBeInTheDocument();
      expect(screen.getByText("時間帯別")).toBeInTheDocument();

      // 各カテゴリのラベルが表示されていることを確認
      expect(screen.getByText("10代以下")).toBeInTheDocument();
      expect(screen.getByText("20代")).toBeInTheDocument();
      expect(screen.getByText("会議・打合せ利用")).toBeInTheDocument();
      expect(screen.getByText("テレワーク利用")).toBeInTheDocument();
      expect(screen.getByText("月")).toBeInTheDocument();
      expect(screen.getByText("火")).toBeInTheDocument();
      expect(screen.getByText("午前(9:00-13:00)")).toBeInTheDocument();
      expect(screen.getByText("午後(13:00-18:00)")).toBeInTheDocument();

      // いくつかのユニークな数値が表示されていることを確認
      expect(screen.getByText("80人")).toBeInTheDocument(); // 20代
      expect(screen.getByText("100人")).toBeInTheDocument(); // 会議・打合せ利用
      expect(screen.getByText("38人")).toBeInTheDocument(); // 火曜日
      expect(screen.getByText("110人")).toBeInTheDocument(); // 午後
    });
  });
});