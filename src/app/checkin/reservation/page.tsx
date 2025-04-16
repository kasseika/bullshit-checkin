"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function ReservationSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");

  // 予約なしを選択した場合
  const handleNoReservation = () => {
    if (room) {
      // 時間選択画面に遷移
      router.push(`/checkin/time?room=${room}`);
    }
  };

  // 戻るボタンを押した場合
  const handleBack = () => {
    // トップページ（部屋選択画面）に戻る
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">予約の有無を選択してください</h1>
      <div className="grid grid-cols-1 gap-8 w-full max-w-md">
        {/* 予約ありボタン (今回はダミー) */}
        <Button
          variant="outline"
          size="lg"
          className="h-24 text-2xl"
          disabled // 後で実装するので一旦無効化
        >
          予約あり
        </Button>

        {/* 予約なしボタン */}
        <Button 
          size="lg" 
          className="w-full h-24 text-2xl"
          onClick={handleNoReservation}
        >
          予約なし
        </Button>
      </div>

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-12 w-full max-w-xs text-xl h-12"
      >
        戻る
      </Button>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <ReservationSelection />
    </Suspense>
  );
}