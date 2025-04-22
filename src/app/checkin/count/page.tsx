"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function CountSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const reservationId = searchParams.get("reservationId"); // 予約ID（予約ありからの遷移の場合）
  const originalEndTime = searchParams.get("originalEndTime"); // 元の終了時間（予約時間変更の検出用）

  const [count, setCount] = useState(1); // 初期値を1に設定
  const [isLoading, setIsLoading] = useState<'next' | 'back' | null>(null);

  const handleIncrement = () => setCount((prev) => prev + 1);
  const handleDecrement = () => setCount((prev) => Math.max(1, prev - 1)); // 1未満にならないように
  const handleNext = () => {
    if (room && startTime && endTime && count >= 1) {
      setIsLoading('next');
      
      // 見学の場合は利用目的ページをスキップ
      const purpose = searchParams.get("purpose");
      
      let url;
      if (purpose) {
        // 見学の場合はアンケートページに直接遷移
        url = `/checkin/survey?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}&purpose=${purpose}`;
      } else {
        // 通常の場合は利用目的ページへ
        url = `/checkin/purpose?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}`;
      }
      
      // 予約IDがある場合は追加
      if (reservationId) {
        url += `&reservationId=${reservationId}`;
        
        // 元の終了時間がある場合は追加
        if (originalEndTime) {
          url += `&originalEndTime=${originalEndTime}`;
        }
      }
      
      router.push(url);
    }
  };

  const handleBack = () => {
    if (room) {
      setIsLoading('back');
      
      // 前の画面に戻る（時間選択画面）
      let url = `/checkin/time?room=${room}`;
      
      // 予約IDがある場合は追加
      if (reservationId && startTime && endTime) {
        url += `&reservationId=${reservationId}&startTime=${startTime}&endTime=${endTime}`;
        
        // 元の終了時間がある場合は追加
        if (originalEndTime) {
          url += `&originalEndTime=${originalEndTime}`;
        }
      }
      
      router.push(url);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">利用者人数を入力してください</h1>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <Label className="text-2xl font-semibold mb-4">人数を選択してください</Label>
        <div className="flex items-center justify-center gap-4"> {/* gapを調整 */}
          {/* -ボタン */}
          <Button
            variant="default"
            size="lg"
            onClick={handleDecrement}
            disabled={count <= 1}
            className="rounded-full w-16 h-16 p-0 text-white text-3xl"
            aria-label="人数を1減らす"
          >
            -
          </Button>

          {/* 人数表示 */}
          <span className="text-7xl font-bold w-28 text-center tabular-nums">
            {count}
          </span>

          {/* +ボタン */}
          <Button
            variant="default"
            size="lg"
            onClick={handleIncrement}
            className="rounded-full w-16 h-16 p-0 text-white text-3xl"
            aria-label="人数を1増やす"
          >
            +
          </Button>
        </div>
      </div>

      {/* 次へボタン */}
      <Button
        size="lg"
        onClick={handleNext}
        disabled={count < 1}
        className="mt-16 w-full max-w-xs text-xl h-16" // マージン調整
        isLoading={isLoading === 'next'}
      >
        次へ
      </Button>

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-4 w-full max-w-xs text-xl h-12"
        isLoading={isLoading === 'back'}
      >
        戻る
      </Button>
    </div>
  );
}

export default function CountSelectionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <CountSelection />
    </Suspense>
  );
}