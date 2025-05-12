"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ja } from "date-fns/locale";

function WelcomeContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

  // 予約ボタンを押したときの処理
  const handleReservation = () => {
    if (!date) return;
    
    setIsLoading(true);
    // 選択した日付を含めて次のページへ遷移
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD形式
    router.push(`/booking/reservation?date=${formattedDate}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-2">大船渡テレワークセンター</h1>
      <h2 className="text-2xl font-bold mb-8">予約システム</h2>
      
      <Card className="w-full max-w-md mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ja}
              className="rounded-md border mb-6"
            />
            
            <Button
              size="lg"
              className="w-full h-14 text-xl"
              onClick={handleReservation}
              isLoading={isLoading}
              disabled={!date}
            >
              この日で予約する
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <WelcomeContent />
    </Suspense>
  );
}