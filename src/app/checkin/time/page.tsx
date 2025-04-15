"use client"; // useRouter, useSearchParams, useState を使うため

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Cardを追加

// 9:00から18:00までの時間リストを生成 (30分刻み)
const availableTimes = Array.from({ length: 19 }, (_, i) => {
  const hour = Math.floor(9 + i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

function TimeSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room"); // 前の画面から部屋情報を取得

  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);

  // 選択可能な終了時間を計算 (startTime以降)
  const availableEndTimes = useMemo(() => {
    if (!startTime) return [];
    const startIndex = availableTimes.indexOf(startTime);
    // 終了時間は開始時間の次から選択可能 (最低30分利用)
    return availableTimes.slice(startIndex + 1);
  }, [startTime]);

  const handleNext = () => {
    if (startTime && endTime && room) {
      // 次の画面に部屋情報、開始時間、終了時間を渡す
      router.push(
        `/checkin/count?room=${room}&startTime=${startTime}&endTime=${endTime}`
      );
    }
  };

  const handleBack = () => {
    if (room) {
      // 前の画面に戻る（部屋選択画面）
      router.push(`/checkin/room`);
    }
  };

  // 時間を数値に変換して比較するヘルパー関数
  // const timeToNumber = (time: string): number => parseInt(time.split(":")[0], 10); // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">利用時間を選択してください</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        {/* 開始時間選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">開始時間</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {availableTimes.slice(0, -1).map((time) => ( // 最後の時間は開始時間として選べない
              <Button
                key={`start-${time}`}
                variant={startTime === time ? "default" : "outline"}
                onClick={() => {
                  setStartTime(time);
                  // 開始時間を変更したら終了時間をリセット
                  setEndTime(null);
                }}
                className="text-lg"
              >
                {time}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* 終了時間選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">終了時間</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {availableEndTimes.map((time) => (
              <Button
                key={`end-${time}`}
                variant={endTime === time ? "default" : "outline"}
                onClick={() => setEndTime(time)}
                disabled={!startTime} // 開始時間が選択されるまで無効
                className="text-lg"
              >
                {time}
              </Button>
            ))}
            {!startTime && (
              <p className="col-span-2 text-muted-foreground text-center">
                開始時間を選択してください
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 次へボタン */}
      <Button
        size="lg"
        onClick={handleNext}
        disabled={!startTime || !endTime} // 開始時間と終了時間が選択されるまで無効
        className="mt-12 w-full max-w-xs text-xl h-16"
      >
        次へ
      </Button>

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-4 w-full max-w-xs text-xl h-12"
      >
        戻る
      </Button>
    </div>
  );
}

export default function TimeSelectionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <TimeSelection />
    </Suspense>
  );
}