"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ja } from "date-fns/locale";

interface ClientCalendarProps {
  openDays: Date[];
}

export default function ClientCalendar({ openDays }: ClientCalendarProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  // 予約ボタンを押したときの処理
  const handleReservation = () => {
    if (!date) return;
    
    setIsLoading(true);
    // 選択した日付を含めて次のページへ遷移
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD形式
    router.push(`/booking/reservation?date=${formattedDate}`);
  };

  // 開館日かどうかをチェックする関数
  const isOpenDay = (day: Date): boolean => {
    return openDays.some(openDay => 
      openDay.getFullYear() === day.getFullYear() &&
      openDay.getMonth() === day.getMonth() &&
      openDay.getDate() === day.getDate()
    );
  };

  return (
    <>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        locale={ja}
        className="rounded-md border mb-6"
        disabled={day => !isOpenDay(day)} // 開館日以外は選択不可
      />
      
      <Button
        size="lg"
        className="w-full h-14 text-xl"
        onClick={handleReservation}
        disabled={!date || isLoading}
      >
        この日で予約する
      </Button>
    </>
  );
}