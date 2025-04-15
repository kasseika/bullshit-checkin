"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function CountSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

  const [count, setCount] = useState(1); // 初期値を1に設定

  const handleIncrement = () => setCount((prev) => prev + 1);
  const handleDecrement = () => setCount((prev) => Math.max(1, prev - 1)); // 1未満にならないように
  const handleIncrementTen = () => setCount((prev) => prev + 10);
  const handleDecrementTen = () => setCount((prev) => Math.max(1, prev - 10)); // 1未満にならないように

  const handleNext = () => {
    if (room && startTime && endTime && count >= 1) {
      // 次の画面に選択した情報を渡す
      router.push(
        `/checkin/purpose?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}`
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">利用者人数を入力してください</h1>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <Label className="text-2xl font-semibold mb-4">人数を選択してください</Label>
        <div className="flex items-center justify-center gap-4"> {/* gapを調整 */}
          {/* -10ボタン */}
          <Button
            variant="default"
            size="lg"
            onClick={handleDecrementTen}
            disabled={count <= 10} // 10以下の場合は減らせない
            className="rounded-full w-16 h-16 p-0 text-white"
            aria-label="人数を10減らす"
          >
            -10
          </Button>

          {/* -1ボタン */}
          <Button
            variant="default"
            size="lg"
            onClick={handleDecrement}
            disabled={count <= 1}
            className="rounded-full w-16 h-16 p-0 text-white"
            aria-label="人数を1減らす"
          >
            -1
          </Button>

          {/* 人数表示 */}
          <span className="text-7xl font-bold w-28 text-center tabular-nums">
            {count}
          </span>

          {/* +1ボタン */}
          <Button
            variant="default"
            size="lg"
            onClick={handleIncrement}
            className="rounded-full w-16 h-16 p-0 text-white"
            aria-label="人数を1増やす"
          >
            +1
          </Button>

          {/* +10ボタン */}
          <Button
            variant="default"
            size="lg"
            onClick={handleIncrementTen}
            className="rounded-full w-16 h-16 p-0 text-white"
            aria-label="人数を10増やす"
          >
            +10
          </Button>
        </div>
      </div>

      {/* 次へボタン */}
      <Button
        size="lg"
        onClick={handleNext}
        disabled={count < 1}
        className="mt-16 w-full max-w-xs text-xl h-16" // マージン調整
      >
        次へ
      </Button>
    </div>
  );
}