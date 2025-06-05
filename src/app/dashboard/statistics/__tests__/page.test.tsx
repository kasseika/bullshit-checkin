/**
 * 集計ページのテスト
 * 期間指定での統計表示機能をテストする
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StatisticsPage from "../page";
import { getDateRangeStats, getDateRangeCheckIns } from "@/lib/dashboardFirestore";
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
  LabelList: () => <div data-testid="label-list" />,
}));

// ChartContainer のモック設定
jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
  ChartLegendContent: () => <div data-testid="chart-legend-content" />,
}));

// DateRangePicker のモック設定
jest.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({ onUpdate }: { onUpdate: (params: { range: { from: Date; to: Date } }) => void }) => (
    <button 
      data-testid="date-range-picker"
      onClick={() => onUpdate({
        range: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      })}
    >
      日付範囲選択
    </button>
  ),
}));

// モック設定
jest.mock("@/lib/dashboardFirestore", () => ({
  getDateRangeStats: jest.fn(),
  getDateRangeCheckIns: jest.fn(),
}));

const mockGetDateRangeStats = getDateRangeStats as jest.MockedFunction<typeof getDateRangeStats>;
const mockGetDateRangeCheckIns = getDateRangeCheckIns as jest.MockedFunction<typeof getDateRangeCheckIns>;

describe("StatisticsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("初期表示で現在月のデータを取得する", async () => {
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const mockStatsData: MonthlyStats = {
      totalCheckIns: 10,
      totalUsers: 25,
      peakDay: "2025-06-15",
      peakDayCheckIns: 5,
      ageGroupStats: { under20: 5, twenties: 10, thirties: 8, forties: 2, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 10, telework: 8, study: 5, event: 2, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 5, tuesday: 4, wednesday: 3, thursday: 6, friday: 7, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 10, afternoon: 12, evening: 3, unknown: 0 },
      roomStats: { "1番": 2, "4番個室": 5, "4番大部屋": 8, "6番大部屋": 7, "6番工作室": 3, "見学": 0 },
      participantCountStats: { "1": 15, "2": 8, "3": 2 }
    };

    const mockCheckInsData: DashboardCheckInData[] = [];

    mockGetDateRangeStats.mockResolvedValue(mockStatsData);
    mockGetDateRangeCheckIns.mockResolvedValue(mockCheckInsData);

    render(<StatisticsPage />);

    // タイトルが表示されることを確認
    expect(screen.getByText("集計")).toBeInTheDocument();

    await waitFor(() => {
      // 統計データが表示されることを確認
      expect(screen.getByText("10")).toBeInTheDocument(); // totalCheckIns
      expect(screen.getByText("25人")).toBeInTheDocument(); // totalUsers
    });

    // 新しい日付範囲での関数が呼ばれることを確認
    expect(mockGetDateRangeStats).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date)
    );
    expect(mockGetDateRangeCheckIns).toHaveBeenCalledWith(
      expect.any(Date), 
      expect.any(Date)
    );
  });

  it("日付範囲を変更するとデータを再取得する", async () => {
    const mockStatsData: MonthlyStats = {
      totalCheckIns: 5,
      totalUsers: 12,
      peakDay: null,
      peakDayCheckIns: 0,
      ageGroupStats: { under20: 0, twenties: 5, thirties: 4, forties: 3, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 5, telework: 4, study: 3, event: 0, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 2, tuesday: 1, wednesday: 1, thursday: 1, friday: 0, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 3, afternoon: 2, evening: 0, unknown: 0 },
      roomStats: { "1番": 1, "4番個室": 2, "4番大部屋": 2, "6番大部屋": 0, "6番工作室": 0, "見学": 0 },
      participantCountStats: { "1": 3, "2": 2 }
    };

    const mockCheckInsData: DashboardCheckInData[] = [];

    mockGetDateRangeStats.mockResolvedValue(mockStatsData);
    mockGetDateRangeCheckIns.mockResolvedValue(mockCheckInsData);

    render(<StatisticsPage />);

    // 日付範囲選択をクリック
    const dateRangePicker = screen.getByTestId("date-range-picker");
    fireEvent.click(dateRangePicker);

    await waitFor(() => {
      // データが再取得されることを確認
      expect(mockGetDateRangeStats).toHaveBeenCalledTimes(2); // 初期表示 + 日付変更
      expect(mockGetDateRangeCheckIns).toHaveBeenCalledTimes(2);
    });
  });

  it("データ取得中はローディング表示を行う", async () => {
    // データ取得を遅延させる
    let resolveStats: (value: MonthlyStats) => void;
    let resolveCheckIns: (value: DashboardCheckInData[]) => void;
    
    const statsPromise = new Promise<MonthlyStats>((resolve) => {
      resolveStats = resolve;
    });
    const checkInsPromise = new Promise<DashboardCheckInData[]>((resolve) => {
      resolveCheckIns = resolve;
    });

    mockGetDateRangeStats.mockReturnValue(statsPromise);
    mockGetDateRangeCheckIns.mockReturnValue(checkInsPromise);

    render(<StatisticsPage />);

    // ローディング中の表示を確認（animate-pulseクラスを持つ要素を探す）
    const loadingElements = document.querySelectorAll(".animate-pulse");
    expect(loadingElements.length).toBeGreaterThan(0);

    // データ取得完了
    const mockStatsData: MonthlyStats = {
      totalCheckIns: 0,
      totalUsers: 0,
      peakDay: null,
      peakDayCheckIns: 0,
      ageGroupStats: { under20: 0, twenties: 0, thirties: 0, forties: 0, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 0, telework: 0, study: 0, event: 0, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 0, afternoon: 0, evening: 0, unknown: 0 },
      roomStats: { "1番": 0, "4番個室": 0, "4番大部屋": 0, "6番大部屋": 0, "6番工作室": 0, "見学": 0 },
      participantCountStats: {}
    };

    resolveStats!(mockStatsData);
    resolveCheckIns!([]);

    await waitFor(() => {
      // ローディングが終了してデータが表示されることを確認
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  it("エラー時は適切にハンドリングする", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    const mockError = new Error("Firestore error");
    mockGetDateRangeStats.mockRejectedValue(mockError);
    mockGetDateRangeCheckIns.mockRejectedValue(mockError);

    render(<StatisticsPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching date range stats:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("ピーク日がない場合は「-」を表示する", async () => {
    const mockStatsData: MonthlyStats = {
      totalCheckIns: 0,
      totalUsers: 0,
      peakDay: null,
      peakDayCheckIns: 0,
      ageGroupStats: { under20: 0, twenties: 0, thirties: 0, forties: 0, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 0, telework: 0, study: 0, event: 0, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 0, afternoon: 0, evening: 0, unknown: 0 },
      roomStats: { "1番": 0, "4番個室": 0, "4番大部屋": 0, "6番大部屋": 0, "6番工作室": 0, "見学": 0 },
      participantCountStats: {}
    };

    mockGetDateRangeStats.mockResolvedValue(mockStatsData);
    mockGetDateRangeCheckIns.mockResolvedValue([]);

    render(<StatisticsPage />);

    await waitFor(() => {
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  it("詳細統計が正しく表示される", async () => {
    const mockStatsData: MonthlyStats = {
      totalCheckIns: 10,
      totalUsers: 25,
      peakDay: "2025-06-15",
      peakDayCheckIns: 5,
      ageGroupStats: { under20: 5, twenties: 10, thirties: 8, forties: 2, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 10, telework: 8, study: 5, event: 2, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 5, tuesday: 4, wednesday: 3, thursday: 6, friday: 7, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 10, afternoon: 12, evening: 3, unknown: 0 },
      roomStats: { "1番": 2, "4番個室": 5, "4番大部屋": 8, "6番大部屋": 7, "6番工作室": 3, "見学": 0 },
      participantCountStats: { "1": 15, "2": 8, "3": 2 }
    };

    mockGetDateRangeStats.mockResolvedValue(mockStatsData);
    mockGetDateRangeCheckIns.mockResolvedValue([]);

    render(<StatisticsPage />);

    await waitFor(() => {
      expect(screen.getByText("年代別")).toBeInTheDocument();
      expect(screen.getByText("目的別")).toBeInTheDocument();
      expect(screen.getByText("曜日別")).toBeInTheDocument();
      expect(screen.getByText("時間帯別")).toBeInTheDocument();
      expect(screen.getByText("部屋別")).toBeInTheDocument();
      expect(screen.getByText("人数別")).toBeInTheDocument();
    });
  });

  it("グラフコンポーネントが正しく表示される", async () => {
    const mockStatsData: MonthlyStats = {
      totalCheckIns: 10,
      totalUsers: 25,
      peakDay: "2025-06-15",
      peakDayCheckIns: 5,
      ageGroupStats: { under20: 5, twenties: 10, thirties: 8, forties: 2, fifties: 0, over60: 0, unknown: 0 },
      purposeStats: { meeting: 10, telework: 8, study: 5, event: 2, digital: 0, inspection: 0, other: 0, unknown: 0 },
      dayOfWeekStats: { monday: 5, tuesday: 4, wednesday: 3, thursday: 6, friday: 7, saturday: 0, sunday: 0 },
      timeSlotStats: { morning: 10, afternoon: 12, evening: 3, unknown: 0 },
      roomStats: { "1番": 2, "4番個室": 5, "4番大部屋": 8, "6番大部屋": 7, "6番工作室": 3, "見学": 0 },
      participantCountStats: { "1": 15, "2": 8, "3": 2 }
    };

    mockGetDateRangeStats.mockResolvedValue(mockStatsData);
    mockGetDateRangeCheckIns.mockResolvedValue([]);

    render(<StatisticsPage />);

    await waitFor(() => {
      expect(screen.getByText("日別利用者数")).toBeInTheDocument();
      expect(screen.getByText("年代別利用統計")).toBeInTheDocument();
      expect(screen.getByText("目的別利用統計")).toBeInTheDocument();
      expect(screen.getByText("曜日別利用統計")).toBeInTheDocument();
      expect(screen.getByText("時間帯別利用状況")).toBeInTheDocument();
      expect(screen.getByText("部屋別利用統計")).toBeInTheDocument();
      expect(screen.getByText("人数別チェックイン統計")).toBeInTheDocument();
    });
  });
});