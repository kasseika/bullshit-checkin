"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { getOpeningDays, isOpeningDay } from "@/lib/openingDays";

export default function BookingPage() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [openingDays, setOpeningDays] = useState<string[]>([]);
  const [isLoadingOpeningDays, setIsLoadingOpeningDays] = useState(true);

  // 開館日を取得
  useEffect(() => {
    async function fetchOpeningDays() {
      setIsLoadingOpeningDays(true);
      try {
        const days = await getOpeningDays();
        setOpeningDays(days);
        console.log('Opening days loaded:', days);
      } catch (error) {
        console.error('Failed to load opening days:', error);
      } finally {
        setIsLoadingOpeningDays(false);
      }
    }

    fetchOpeningDays();
  }, []);

  // 予約を進めるボタンを押したときの処理
  const handleReservation = () => {
    if (!date) return;
    
    setIsLoading(true);
    // 選択した日付をクエリパラメータとして次のページに渡す
    // 実際の実装では、この後の画面で部屋選択などを行う
    // router.push(`/booking/room-selection?date=${format(date, 'yyyy-MM-dd')}`);
    
    // 現時点ではUIだけなので、アラートを表示
    alert(`${format(date, 'yyyy年MM月dd日')}を選択しました。この後、部屋選択画面に進みます。`);
    setIsLoading(false);
  };

  // 日付が選択可能かどうかを判定する関数
  const isDateDisabled = (date: Date) => {
    // 今日より前の日付は選択不可
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return true;
    }
    
    // 開館日でない日は選択不可
    return !isOpeningDay(date, openingDays);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">大船渡テレワークセンター</h1>
      <h2 className="text-2xl font-bold mb-8">予約システム</h2>
      
      <Card className="w-full max-w-md mb-8">
        <CardContent className="p-6">
          <p className="text-lg font-medium text-center mb-6">
            ご利用日を選択してください
          </p>
          
          <div className="flex justify-center mb-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ja}
              className="rounded-md border"
              // ローディング中は選択不可、それ以外は開館日のみ選択可能
              disabled={isLoadingOpeningDays ? { before: new Date(2099, 0, 1) } : isDateDisabled}
            />
          </div>
          
          {isLoadingOpeningDays ? (
            <div className="text-center mb-6">
              <p className="text-lg">開館日を読み込み中...</p>
            </div>
          ) : openingDays.length === 0 ? (
            <div className="text-center mb-6">
              <p className="text-lg text-red-500">開館日情報の取得に失敗しました</p>
            </div>
          ) : date ? (
            <div className="text-center mb-6">
              <p className="text-lg">
                選択した日付: <span className="font-bold">{format(date, 'yyyy年MM月dd日 (eee)', { locale: ja })}</span>
              </p>
            </div>
          ) : (
            <div className="text-center mb-6">
              <p className="text-lg">カレンダーから開館日を選択してください</p>
              <p className="text-sm text-gray-500 mt-1">（白色の日付が開館日です）</p>
            </div>
          )}
          
          <Button
            size="lg"
            className="w-full h-14 text-xl"
            onClick={handleReservation}
            disabled={!date || isLoadingOpeningDays}
            isLoading={isLoading}
          >
            予約を進める
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}