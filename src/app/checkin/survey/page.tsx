"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense, useState } from "react";

const ageGroups = [
  { id: "under10s", name: "10代以下" },
  { id: "20s", name: "20代" },
  { id: "30s", name: "30代" },
  { id: "40s", name: "40代" },
  { id: "50s", name: "50代" },
  { id: "over60s", name: "60代以上" },
];

function Survey() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const count = searchParams.get("count");
  const purpose = searchParams.get("purpose");
  const reservationId = searchParams.get("reservationId"); // 予約ID（予約ありからの遷移の場合）
  const originalEndTime = searchParams.get("originalEndTime"); // 元の終了時間（予約時間変更の検出用）
  const [isLoading, setIsLoading] = useState<'select' | 'back' | null>(null);
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState<string | null>(null);

  const handleSelect = (ageGroupId: string) => {
    if (room && startTime && endTime && count && purpose) {
      setIsLoading('select');
      setSelectedAgeGroupId(ageGroupId);
      
      // 確認画面に遷移する
      let url = `/checkin/confirm?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}&purpose=${purpose}&ageGroup=${ageGroupId}`;
      
      // 予約IDがある場合は追加
      if (reservationId) {
        url += `&reservationId=${reservationId}`;
        
        // 元の終了時間がある場合は追加
        if (originalEndTime) {
          url += `&originalEndTime=${originalEndTime}`;
        }
      }
      
      router.push(url);
    } else {
      console.error("必要な情報が不足しています。", { room, startTime, endTime, count, purpose });
      // エラー処理: 例えば前の画面に戻るなど
      router.back();
    }
  };

  const handleBack = () => {
    if (room && startTime && endTime && count) {
      setIsLoading('back');
      setSelectedAgeGroupId(null);
      
      // 見学の場合は人数選択画面に戻る
      if (purpose === "tour") {
        let url = `/checkin/count?room=${room}&startTime=${startTime}&endTime=${endTime}&purpose=${purpose}`;
        
        // 予約IDがある場合は追加
        if (reservationId) {
          url += `&reservationId=${reservationId}`;
          
          // 元の終了時間がある場合は追加
          if (originalEndTime) {
            url += `&originalEndTime=${originalEndTime}`;
          }
        }
        
        router.push(url);
      } else {
        // 通常の場合は利用用途選択画面に戻る
        let url = `/checkin/purpose?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}`;
        
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
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">利用者アンケート</h1>
      <h2 className="text-2xl mb-8">年代を選択してください(グループの場合は代表者)</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-2xl">
        {ageGroups.map((ageGroup) => (
          <Button
            key={ageGroup.id}
            variant="outline"
            size="lg"
            onClick={() => handleSelect(ageGroup.id)}
            className="w-full h-24 text-xl"
            isLoading={isLoading === 'select' && selectedAgeGroupId === ageGroup.id}
          >
            {ageGroup.name}
          </Button>
        ))}
      </div>

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-12 w-full max-w-xs text-xl h-12"
        isLoading={isLoading === 'back'}
      >
        戻る
      </Button>
    </div>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <Survey />
    </Suspense>
  );
}