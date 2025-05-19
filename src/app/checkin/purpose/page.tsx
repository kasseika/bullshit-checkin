"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense, useState } from "react";

const purposes = [
  { id: "meeting", name: "会議・打合せ" },
  { id: "remote", name: "仕事・テレワーク" },
  { id: "study", name: "学習" },
  { id: "event", name: "イベント・講座" },
  { id: "creation", name: "制作" },
  { id: "tour", name: "視察・見学・取材" },
  { id: "other", name: "その他" },
];

function PurposeSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const count = searchParams.get("count");
  const reservationId = searchParams.get("reservationId"); // 予約ID（予約ありからの遷移の場合）
  const originalEndTime = searchParams.get("originalEndTime"); // 元の終了時間（予約時間変更の検出用）
  const [isLoading, setIsLoading] = useState<'select' | 'back' | null>(null);
  const [selectedPurposeId, setSelectedPurposeId] = useState<string | null>(null);

  const handleSelect = (purposeId: string) => {
    if (room && startTime && endTime && count) {
      setIsLoading('select');
      setSelectedPurposeId(purposeId);
      
      // 次の画面に選択した情報を渡す
      let url = `/checkin/survey?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}&purpose=${purposeId}`;
      
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
    if (room && startTime && endTime) {
      setIsLoading('back');
      setSelectedPurposeId(null);
      
      // 前の画面に戻る（人数選択画面）
      let url = `/checkin/count?room=${room}&startTime=${startTime}&endTime=${endTime}`;
      
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12">利用用途を選択してください</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl">
        {purposes.map((purpose) => (
          <Button
            key={purpose.id}
            variant="outline"
            size="lg"
            onClick={() => handleSelect(purpose.id)}
            className="w-full h-16 sm:h-24 text-base sm:text-xl" // ボタンの高さと文字サイズを調整
            isLoading={isLoading === 'select' && selectedPurposeId === purpose.id}
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
        className="mt-8 sm:mt-12 w-full max-w-xs text-base sm:text-xl h-10 sm:h-12"
        isLoading={isLoading === 'back'}
      >
        戻る
      </Button>
    </div>
  );
}

export default function PurposeSelectionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <PurposeSelection />
    </Suspense>
  );
}
