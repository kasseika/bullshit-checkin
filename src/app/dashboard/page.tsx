/**
 * ダッシュボードのメインページ
 * チェックイン情報の概要を表示する
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getDashboardStats, 
  getRecentCheckIns,
  DashboardStats,
  DashboardCheckInData 
} from "@/lib/dashboardFirestore";
import { formatDateTimeToJST } from "@/utils/dateUtils";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayCheckIns: 0,
    currentlyInUse: 0,
    todayBookings: 0,
  });
  const [recentCheckIns, setRecentCheckIns] = useState<DashboardCheckInData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, checkInsData] = await Promise.all([
          getDashboardStats(),
          getRecentCheckIns(5),
        ]);
        setStats(statsData);
        setRecentCheckIns(checkInsData);
        setLastUpdate(formatDateTimeToJST(new Date()));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // 30秒ごとに更新
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          最終更新: {lastUpdate} (JST)
        </div>
        <Link 
          href="/dashboard/monthly" 
          className="text-sm font-medium text-primary hover:underline"
        >
          月別集計を見る →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>今日のチェックイン</CardTitle>
            <CardDescription>本日のチェックイン数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.todayCheckIns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>現在利用中</CardTitle>
            <CardDescription>現在利用中の部屋数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.currentlyInUse}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>今日の予約</CardTitle>
            <CardDescription>本日の予約件数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.todayBookings}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近のチェックイン</CardTitle>
          <CardDescription>直近5件のチェックイン情報</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCheckIns.length === 0 ? (
            <p className="text-muted-foreground">チェックイン情報がありません</p>
          ) : (
            <div className="space-y-4">
              {recentCheckIns.map((checkIn) => (
                <div key={checkIn.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{checkIn.room}</p>
                    <p className="text-sm text-muted-foreground">
                      {checkIn.startTime} - {checkIn.endTime} / {checkIn.count}名 / {checkIn.purpose}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {checkIn.checkInTime ? formatDateTimeToJST(new Date(checkIn.checkInTime)) : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}