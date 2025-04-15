"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Inputを追加
import { Label } from "@/components/ui/label"; // Labelを追加
import { Minus, Plus } from "lucide-react"; // アイコンを追加

export default function CountSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

  const [count, setCount] = useState(1); // 初期値を1に設定

  const handleIncrement = () => setCount((prev) => prev + 1);
  const handleDecrement = () => setCount((prev) => Math.max(1, prev - 1)); // 1未満にならないように

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setCount(value);
    } else if (e.target.value === "") {
      // 空の場合は一旦許容 (入力途中かもしれない)
      // 必要であれば、より厳密なバリデーションを追加
    }
  };

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
        <Label htmlFor="count-input" className="text-xl mb-2">
          人数
        </Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={count <= 1} // 1以下の場合は減らせない
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Input
            id="count-input"
            type="number"
            min="1"
            value={count}
            onChange={handleInputChange}
            className="text-center text-2xl h-16 w-24" // サイズ調整
          />
          <Button variant="outline" size="icon" onClick={handleIncrement}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 次へボタン */}
      <Button
        size="lg"
        onClick={handleNext}
        disabled={count < 1} // 人数が1未満の場合は無効
        className="mt-12 w-full max-w-xs text-xl h-16"
      >
        次へ
      </Button>
    </div>
  );
}