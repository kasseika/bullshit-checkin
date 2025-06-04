/**
 * 年月別集計ページのテスト
 * グラフ表示機能を含む
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MonthlyDashboardPage from "../page";
import { getMonthlyStats, getMonthlyCheckIns } from "@/lib/dashboardFirestore";
import type { MonthlyStats, DashboardCheckInData } from "@/lib/dashboardFirestore";

// Recharts のモック設定
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Cell: () => <div data-testid="cell" />,
}));

// ChartContainer のモック設定
jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
  ChartLegendContent: () => <div data-testid="chart-legend-content" />,
}));

// モック設定
jest.mock("@/lib/dashboardFirestore", () => ({
  getMonthlyStats: jest.fn(),
  getMonthlyCheckIns: jest.fn(),
}));

const mockGetMonthlyStats = getMonthlyStats as jest.MockedFunction<typeof getMonthlyStats>;
const mockGetMonthlyCheckIns = getMonthlyCheckIns as jest.MockedFunction<typeof getMonthlyCheckIns>;

describe("MonthlyDashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("初期表示で現在の年月のデータを取得する", async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const mockCheckInsData: DashboardCheckInData[] = [
      {
        id: "1",
        room: "会議室A",
        startTime: "10:00",
        endTime: "12:00",
        startDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-15`,
        count: 3,
        purpose: "meeting",
        ageGroup: "20s",
        checkInTime: "09:55",
      },
      {
        id: "2",
        room: "会議室B",
        startTime: "14:00",
        endTime: "16:00",
        startDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-16`,
        count: 2,
        purpose: "telework",
        ageGroup: "30s",
        checkInTime: "13:55",
      },
    ];

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
      roomStats: {
        "会議室A": 100,
        "会議室B": 150,
        "セミナー室": 100,
      },
      participantCountStats: {
        "1": 5,
        "2": 10,
        "3": 8,
      },
    });
    
    mockGetMonthlyCheckIns.mockResolvedValue(mockCheckInsData);

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      expect(mockGetMonthlyStats).toHaveBeenCalledWith(currentYear, currentMonth);
      expect(mockGetMonthlyCheckIns).toHaveBeenCalledWith(currentYear, currentMonth);
    });

    expect(screen.getByText("月別集計")).toBeInTheDocument();
    // 総チェックイン数の確認（カード内）
    await waitFor(() => {
      expect(screen.getByText("総チェックイン数")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
    });
    expect(screen.getByText("350人")).toBeInTheDocument(); // 月全体の利用者数
    
    // グラフ表示の確認
    expect(screen.getByText("グラフ表示")).toBeInTheDocument();
    expect(screen.getByText("日別利用者数")).toBeInTheDocument();
    expect(screen.getByText("時間帯別利用状況")).toBeInTheDocument();
    expect(screen.getByText("部屋別利用統計")).toBeInTheDocument();
    expect(screen.getByText("人数別チェックイン統計")).toBeInTheDocument();
    
    // 詳細統計の表示確認
    expect(screen.getByText("詳細統計")).toBeInTheDocument();
    expect(screen.getByText("年代別")).toBeInTheDocument();
    expect(screen.getByText("目的別")).toBeInTheDocument();
    expect(screen.getByText("曜日別")).toBeInTheDocument();
    expect(screen.getByText("時間帯別")).toBeInTheDocument();
    expect(screen.getByText("部屋別")).toBeInTheDocument();
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
      roomStats: {},
      participantCountStats: {},
    });
    
    mockGetMonthlyCheckIns.mockResolvedValue([]);

    render(<MonthlyDashboardPage />);

    // 年を変更
    const yearSelect = screen.getByDisplayValue(/年$/);
    fireEvent.change(yearSelect, { target: { value: "2024" } });

    // 月を変更
    const monthSelect = screen.getByDisplayValue(/月$/);
    fireEvent.change(monthSelect, { target: { value: "12" } });

    await waitFor(() => {
      expect(mockGetMonthlyStats).toHaveBeenCalledWith(2024, 12);
      expect(mockGetMonthlyCheckIns).toHaveBeenCalledWith(2024, 12);
    });

    await waitFor(() => {
      expect(screen.getByText("200")).toBeInTheDocument();
    });
    expect(screen.getByText("450人")).toBeInTheDocument();
  });

  it("データ取得中はローディング表示を行う", async () => {
    // Promise executor内でresolve関数を即座に外部変数に割り当てる
    const { promise: statsPromise, resolve: resolveStats } = (() => {
      let resolveFunc: (value: MonthlyStats) => void = () => {};
      const promiseInstance = new Promise<MonthlyStats>((resolve) => {
        resolveFunc = resolve;
      });
      return { promise: promiseInstance, resolve: resolveFunc };
    })();
    
    const { promise: checkInsPromise, resolve: resolveCheckIns } = (() => {
      let resolveFunc: (value: DashboardCheckInData[]) => void = () => {};
      const promiseInstance = new Promise<DashboardCheckInData[]>((resolve) => {
        resolveFunc = resolve;
      });
      return { promise: promiseInstance, resolve: resolveFunc };
    })();

    mockGetMonthlyStats.mockReturnValue(statsPromise);
    mockGetMonthlyCheckIns.mockReturnValue(checkInsPromise);

    render(<MonthlyDashboardPage />);

    // ローディング中の表示を確認（animate-pulseクラスを持つ要素を探す）
    const loadingElements = document.querySelectorAll(".animate-pulse");
    expect(loadingElements.length).toBeGreaterThan(0);

    // データ取得完了
    resolveStats({
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
      roomStats: {},
      participantCountStats: {},
    });
    resolveCheckIns([]);

    await waitFor(() => {
      const afterLoadingElements = document.querySelectorAll(".animate-pulse");
      expect(afterLoadingElements.length).toBe(0);
    });
  });

  it("エラー時は適切にハンドリングする", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    mockGetMonthlyStats.mockRejectedValue(new Error("データ取得エラー"));
    mockGetMonthlyCheckIns.mockRejectedValue(new Error("チェックインデータ取得エラー"));

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
      roomStats: {},
      participantCountStats: {},
    });
    
    mockGetMonthlyCheckIns.mockResolvedValue([]);

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
      roomStats: {
        "会議室A": 50,
        "会議室B": 80,
        "セミナー室": 120,
      },
      participantCountStats: {
        "1": 10,
        "2": 15,
        "3": 5,
      },
    });
    
    mockGetMonthlyCheckIns.mockResolvedValue([]);

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      // 統計カテゴリのタイトルが表示されていることを確認
      expect(screen.getByText("年代別")).toBeInTheDocument();
      expect(screen.getByText("目的別")).toBeInTheDocument();
      expect(screen.getByText("曜日別")).toBeInTheDocument();
      expect(screen.getByText("時間帯別")).toBeInTheDocument();
      expect(screen.getByText("部屋別")).toBeInTheDocument();

      // 各カテゴリのラベルが表示されていることを確認
      expect(screen.getByText("10代以下")).toBeInTheDocument();
      expect(screen.getByText("20代")).toBeInTheDocument();
      expect(screen.getByText("会議・打合せ利用")).toBeInTheDocument();
      expect(screen.getByText("テレワーク利用")).toBeInTheDocument();
      expect(screen.getByText("月")).toBeInTheDocument();
      expect(screen.getByText("火")).toBeInTheDocument();
      expect(screen.getByText("午前")).toBeInTheDocument();
      expect(screen.getByText("午後")).toBeInTheDocument();

      // いくつかのユニークな数値が表示されていることを確認
      expect(screen.getAllByText("80人")).toHaveLength(2); // 20代と会議室B
      expect(screen.getByText("100人")).toBeInTheDocument(); // 会議・打合せ利用
      expect(screen.getByText("38人")).toBeInTheDocument(); // 火曜日
      expect(screen.getByText("110人")).toBeInTheDocument(); // 午後
      expect(screen.getAllByText("120人")).toHaveLength(2); // 午前とセミナー室
    });
  });

  it("グラフコンポーネントが正しく表示される", async () => {
    const mockCheckInsData: DashboardCheckInData[] = [
      {
        id: "1",
        room: "会議室A",
        startTime: "10:00",
        endTime: "12:00",
        startDate: "2025-01-15",
        count: 3,
        purpose: "meeting",
        ageGroup: "20s",
        checkInTime: "09:55",
      },
    ];

    mockGetMonthlyStats.mockResolvedValue({
      year: 2025,
      month: 1,
      totalCheckIns: 100,
      totalBookings: 50,
      totalUsers: 250,
      peakDay: "2025-01-15",
      peakDayCheckIns: 15,
      ageGroupStats: { under20: 0, twenties: 0, thirties: 0, forties: 0, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 0, telework: 0, study: 0, event: 0, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      timeSlotStats: {
        morning: 120,
        afternoon: 110,
        evening: 20,
        unknown: 0,
      },
      roomStats: {
        "会議室A": 50,
        "会議室B": 80,
      },
      participantCountStats: {
        "3": 1,
      },
    });
    
    mockGetMonthlyCheckIns.mockResolvedValue(mockCheckInsData);

    render(<MonthlyDashboardPage />);

    await waitFor(() => {
      // グラフ関連のコンポーネントが表示されているか確認
      expect(screen.getByText("日別利用者数")).toBeInTheDocument();
      expect(screen.getByText("年代別利用統計")).toBeInTheDocument();
      expect(screen.getByText("目的別利用統計")).toBeInTheDocument();
      expect(screen.getByText("曜日別利用統計")).toBeInTheDocument();
      expect(screen.getByText("時間帯別利用状況")).toBeInTheDocument();
      expect(screen.getByText("部屋別利用統計")).toBeInTheDocument();
      expect(screen.getByText("人数別チェックイン統計")).toBeInTheDocument();
      
      // Rechartsコンポーネントのモックが呼ばれているか確認
      expect(screen.getAllByTestId("responsive-container").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("bar-chart").length).toBeGreaterThan(0);
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });
  });
});