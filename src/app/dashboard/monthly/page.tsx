/**
 * 年月別集計ページ
 * 月単位でのチェックイン・予約データを集計表示
 * バーチャート・パイチャート機能を含む
 */
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart";
import { getMonthlyStats, MonthlyStats, getMonthlyCheckIns, DashboardCheckInData } from "@/lib/dashboardFirestore";
import { formatDateToJSTWithSlash } from "@/utils/dateUtils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";

// 統計表示用のコンポーネント
function StatsCard({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-sm text-gray-600">{getDisplayLabel(key, title)}</span>
            <span className="font-medium">
              {title === "人数別" ? `${value}回` : `${value}人`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// 表示用ラベルを取得する関数
function getDisplayLabel(key: string, category: string): string {
  const labels: Record<string, Record<string, string>> = {
    "年代別": {
      under20: "10代以下",
      twenties: "20代",
      thirties: "30代",
      forties: "40代",
      fifties: "50代",
      over60: "60代以上",
      unknown: "不明"
    },
    "目的別": {
      meeting: "会議・打合せ利用",
      telework: "テレワーク利用",
      study: "学習利用",
      event: "イベント・講座",
      digital: "デジタル制作(VR等含む)",
      inspection: "視察・見学・取材",
      other: "その他(IT相談、機器貸出等)",
      unknown: "不明"
    },
    "曜日別": {
      monday: "月",
      tuesday: "火",
      wednesday: "水",
      thursday: "木",
      friday: "金",
      saturday: "土",
      sunday: "日"
    },
    "時間帯別": {
      morning: "午前",
      afternoon: "午後",
      evening: "夜",
      unknown: "不明"
    },
    "人数別": {} // 人数はそのまま表示
  };
  
  // 人数別の場合は「X人」として表示
  if (category === "人数別") {
    return `${key}人`;
  }
  
  return labels[category]?.[key] || key;
}

// カスタムXAxisTickコンポーネント
function CustomXAxisTick({ x, y, payload }: any) {
  const lines = payload.value.split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line: string, index: number) => (
        <text
          key={index}
          x={0}
          y={index * 14}
          dy={14}
          textAnchor="middle"
          fill="#666"
          fontSize={11}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// カスタムツールチップコンポーネント
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { tooltipDate: string }; value: number }[] }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="text-sm font-medium text-gray-900">{data.tooltipDate}</p>
        <p className="text-sm text-blue-600">
          利用者数: <span className="font-medium">{payload[0].value}人</span>
        </p>
      </div>
    );
  }
  return null;
}

// 日別利用者数チャートコンポーネント
function DailyUsersChart({ checkIns, year, month }: { 
  checkIns: DashboardCheckInData[]; 
  year: number; 
  month: number; 
}) {
  // 日別のデータを集計
  const dailyData = (() => {
    const dailyUsers: Record<string, number> = {};
    
    // 月の全日付を初期化
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      dailyUsers[dateStr] = 0;
    }
    
    // チェックインデータを集計
    checkIns.forEach(checkIn => {
      if (checkIn.startDate) {
        dailyUsers[checkIn.startDate] = (dailyUsers[checkIn.startDate] || 0) + (checkIn.count || 0);
      }
    });
    
    // チャート用データに変換
    return Object.entries(dailyUsers).map(([date, users]) => {
      const dateObj = new Date(date);
      const day = parseInt(date.split('-')[2]);
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
      const [year, month, dayStr] = date.split('-');
      const tooltipDate = `${year}/${parseInt(month)}/${parseInt(dayStr)} ${dayOfWeek}`;
      return {
        date: `${day}日`,
        dayOfWeek,
        displayLabel: `${day}日\n${dayOfWeek}`,
        tooltipDate,
        users,
        fullDate: date
      };
    });
  })();
  
  const chartConfig = {
    users: {
      label: "利用者数",
      color: "#3b82f6",
    },
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">日別利用者数</h3>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData}>
            <XAxis 
              dataKey="displayLabel" 
              tick={<CustomXAxisTick />}
              interval={0} // すべてのラベルを表示
              height={50}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar dataKey="users" fill="var(--color-users)">
              <LabelList dataKey="users" position="top" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}

// 時間帯別利用状況パイチャートコンポーネント
function TimeSlotPieChart({ timeSlotStats }: { timeSlotStats: Record<string, number> }) {
  const data = Object.entries(timeSlotStats)
    .filter(([_, value]) => value > 0) // 0の項目は除外
    .map(([key, value]) => ({
      name: getDisplayLabel(key, "時間帯別"),
      value,
      key
    }));

  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];
  
  const chartConfig = {
    morning: { label: "午前", color: "#3b82f6" },
    afternoon: { label: "午後", color: "#ef4444" },
    evening: { label: "夜", color: "#22c55e" },
    unknown: { label: "不明", color: "#f59e0b" },
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">時間帯別利用状況</h3>
      {data.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, value }) => 
                  `${name} ${value}人 (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          データがありません
        </div>
      )}
    </Card>
  );
}

// 年代別利用統計バーチャートコンポーネント
function AgeGroupChart({ ageGroupStats }: { ageGroupStats: Record<string, number> }) {
  // 年代の固定順序
  const ageOrder = ['under20', 'twenties', 'thirties', 'forties', 'fifties', 'over60', 'unknown'];
  const data = ageOrder.map(age => ({
    ageGroup: getDisplayLabel(age, "年代別"),
    users: ageGroupStats[age] || 0,
    key: age
  }));

  const chartConfig = {
    users: {
      label: "利用者数",
      color: "#3b82f6",
    },
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">年代別利用統計</h3>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="ageGroup" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="users" fill="var(--color-users)">
              <LabelList dataKey="users" position="top" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}

// 目的別利用統計バーチャートコンポーネント
function PurposeChart({ purposeStats }: { purposeStats: Record<string, number> }) {
  // 目的の固定順序
  const purposeOrder = ['meeting', 'telework', 'study', 'event', 'digital', 'inspection', 'other', 'unknown'];
  const data = purposeOrder.map(purpose => ({
    purpose: getDisplayLabel(purpose, "目的別"),
    users: purposeStats[purpose] || 0,
    key: purpose
  }));

  const chartConfig = {
    users: {
      label: "利用者数",
      color: "#3b82f6",
    },
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">目的別利用統計</h3>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="purpose" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="users" fill="var(--color-users)">
              <LabelList dataKey="users" position="top" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}

// 曜日別利用統計バーチャートコンポーネント
function DayOfWeekChart({ dayOfWeekStats }: { dayOfWeekStats: Record<string, number> }) {
  // 曜日の順序を保持してデータを作成
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const data = dayOrder.map(day => ({
    dayOfWeek: getDisplayLabel(day, "曜日別"),
    users: dayOfWeekStats[day] || 0,
    key: day
  }));

  const chartConfig = {
    users: {
      label: "利用者数",
      color: "#3b82f6",
    },
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">曜日別利用統計</h3>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="dayOfWeek" 
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="users" fill="var(--color-users)">
              <LabelList dataKey="users" position="top" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}

// 部屋別利用統計バーチャートコンポーネント
function RoomUsageChart({ roomStats }: { roomStats: Record<string, number> }) {
  // 部屋の固定順序（dashboardFirestore.tsのALL_ROOMSと同じ順序）
  const roomOrder = ["1番", "4番個室", "4番大部屋", "6番大部屋", "6番工作室", "見学"];
  const data = roomOrder.map(room => ({
    room,
    users: roomStats[room] || 0
  }));

  const chartConfig = {
    users: {
      label: "利用者数",
      color: "#3b82f6",
    },
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">部屋別利用統計</h3>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="room" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="users" fill="var(--color-users)">
              <LabelList dataKey="users" position="top" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}

// 人数別チェックイン統計バーチャートコンポーネント
function ParticipantCountChart({ participantCountStats }: { participantCountStats: Record<string, number> }) {
  // 人数でソートしたデータを作成（0人は除外）
  const data = Object.entries(participantCountStats)
    .filter(([_, count]) => count > 0)
    .map(([people, checkInCount]) => ({
      people: `${people}人`,
      checkIns: checkInCount,
      peopleNum: parseInt(people)
    }))
    .sort((a, b) => a.peopleNum - b.peopleNum);

  const chartConfig = {
    checkIns: {
      label: "チェックイン回数",
      color: "#3b82f6",
    },
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">人数別チェックイン統計</h3>
      {data.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="people" 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="checkIns" fill="var(--color-checkIns)">
                <LabelList dataKey="checkIns" position="top" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          データがありません
        </div>
      )}
    </Card>
  );
}

export default function MonthlyDashboardPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [checkIns, setCheckIns] = useState<DashboardCheckInData[]>([]);
  const [loading, setLoading] = useState(false);

  // 年月選択の選択肢を生成
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // データの取得
  useEffect(() => {
    const fetchMonthlyStats = async () => {
      setLoading(true);
      try {
        const [statsData, checkInsData] = await Promise.all([
          getMonthlyStats(selectedYear, selectedMonth),
          getMonthlyCheckIns(selectedYear, selectedMonth)
        ]);
        setStats(statsData);
        setCheckIns(checkInsData);
      } catch (error) {
        console.error("Error fetching monthly stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyStats();
  }, [selectedYear, selectedMonth]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">月別集計</h1>
        <span className="text-gray-600">
          {selectedYear}年{selectedMonth}月1日 〜{" "}
          {selectedYear}年{selectedMonth}月
          {new Date(selectedYear, selectedMonth, 0).getDate()}日
        </span>
      </div>

      {/* 年月選択 */}
      <div className="flex gap-4 mb-8">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border rounded-md"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}年
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-4 py-2 border rounded-md"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}月
            </option>
          ))}
        </select>
      </div>

      {/* 統計情報 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="text-sm text-gray-600 mb-2">総チェックイン数</p>
              <p className="text-3xl font-bold">{stats.totalCheckIns}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-gray-600 mb-2">月全体の利用者数</p>
              <p className="text-3xl font-bold">{stats.totalUsers}人</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-gray-600 mb-2">ピーク日</p>
              <p className="text-xl font-bold">
                {stats.peakDay ? formatDateToJSTWithSlash(new Date(stats.peakDay)) : "-"}
              </p>
              {stats.peakDay && (
                <p className="text-sm text-gray-600 mt-1">
                  {stats.peakDayCheckIns}件のチェックイン
                </p>
              )}
            </Card>
          </div>

          {/* グラフ表示 */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">グラフ表示</h2>
            
            {/* 日別利用者数バーチャート */}
            <DailyUsersChart 
              checkIns={checkIns} 
              year={selectedYear} 
              month={selectedMonth} 
            />
            
            {/* 統計別チャート1行目 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 年代別バーチャート */}
              <AgeGroupChart ageGroupStats={stats.ageGroupStats} />
              
              {/* 目的別バーチャート */}
              <PurposeChart purposeStats={stats.purposeStats} />
            </div>
            
            {/* 統計別チャート2行目 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 曜日別バーチャート */}
              <DayOfWeekChart dayOfWeekStats={stats.dayOfWeekStats} />
              
              {/* 時間帯別パイチャート */}
              <TimeSlotPieChart timeSlotStats={stats.timeSlotStats} />
            </div>
            
            {/* 統計別チャート3行目 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 部屋別利用統計バーチャート */}
              <RoomUsageChart roomStats={stats.roomStats} />
              
              {/* 人数別チェックイン統計バーチャート */}
              <ParticipantCountChart participantCountStats={stats.participantCountStats} />
            </div>
          </div>

          {/* 詳細統計 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">詳細統計</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatsCard title="年代別" data={stats.ageGroupStats} />
              <StatsCard title="目的別" data={stats.purposeStats} />
              <StatsCard title="曜日別" data={stats.dayOfWeekStats} />
              <StatsCard title="時間帯別" data={stats.timeSlotStats} />
              <StatsCard title="部屋別" data={stats.roomStats} />
              <StatsCard title="人数別" data={stats.participantCountStats} />
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}