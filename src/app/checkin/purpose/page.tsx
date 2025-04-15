"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const purposes = [
  { id: "meeting", name: "会議・打合せ" },
  { id: "remote", name: "テレワーク利用" },
  { id: "study", name: "学習利用" },
  { id: "event", name: "イベント・講座" },
  { id: "creation", name: "デジタル制作" },
  { id: "tour", name: "視察・見学・取材" },
  { id: "other", name: "その他" },
];

export default function PurposeSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const count = searchParams.get("count");

  const handleSelect = (purposeId: string) => {
    if (room && startTime && endTime && count) {
      // 次の画面に選択した情報を渡す
      router.push(
        `/checkin/survey?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}&purpose=${purposeId}`
      );
    }
  };

  const handleBack = () => {
    if (room && startTime && endTime) {
      // 前の画面に戻る（人数選択画面）
      router.push(`/checkin/count?room=${room}&startTime=${startTime}&endTime=${endTime}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">利用用途を選択してください</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
        {purposes.map((purpose) => (
          <Button
            key={purpose.id}
            variant="outline"
            size="lg"
            onClick={() => handleSelect(purpose.id)}
            className="w-full h-24 text-xl" // ボタンの高さを調整
          >
            {purpose.name}
          </Button>
        ))}
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