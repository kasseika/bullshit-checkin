/**
 * 年月別集計ページ
 * 月単位でのチェックイン・予約データを集計表示
 */
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { getMonthlyStats, MonthlyStats } from "@/lib/dashboardFirestore";
import { formatDateToJSTWithSlash } from "@/utils/dateUtils";

export default function MonthlyDashboardPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
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
        const data = await getMonthlyStats(selectedYear, selectedMonth);
        setStats(data);
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
      <h1 className="text-3xl font-bold mb-8">月別集計</h1>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <p className="text-sm text-gray-600 mb-2">総チェックイン数</p>
              <p className="text-3xl font-bold">{stats.totalCheckIns}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-gray-600 mb-2">総予約数</p>
              <p className="text-3xl font-bold">{stats.totalBookings}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-gray-600 mb-2">平均利用率</p>
              <p className="text-3xl font-bold">{stats.averageUtilizationRate}%</p>
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

          {/* 期間表示 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">集計期間</h2>
            <p className="text-gray-600">
              {selectedYear}年{selectedMonth}月1日 〜{" "}
              {selectedYear}年{selectedMonth}月
              {new Date(selectedYear, selectedMonth, 0).getDate()}日
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}