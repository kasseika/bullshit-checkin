"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// 部屋選択画面のコンポーネント
function RoomSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasReservation = searchParams.get("hasReservation") === "true";
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  // 予約ありの場合の部屋リスト
  const reservationRooms = [
    { id: "private4", name: "4番個室" },
    { id: "large6", name: "6番 大部屋・工作室" },
  ];
  
  // 予約なしの場合の部屋リスト
  const noReservationRooms = [
    { id: "room1", name: "1番" },
    { id: "private4", name: "4番個室" },
    { id: "large4", name: "4番大部屋" },
    { id: "large6", name: "6番大部屋" },
    { id: "tour", name: "見学" },
  ];
  
  // 表示する部屋リスト
  const rooms = hasReservation ? reservationRooms : noReservationRooms;
  
  // 部屋を選択したときの処理
  const handleRoomSelect = (roomId: string) => {
    setIsLoading(true);
    setSelectedRoomId(roomId);
    
    if (hasReservation) {
      // 予約ありの場合は予約選択画面へ
      router.push(`/checkin/reservation?room=${roomId}`);
    } else {
      // 予約なしの場合
      if (roomId === "private4" || roomId === "large6") {
        // 4番個室・6番大部屋の場合は予約情報確認画面へ
        router.push(`/checkin/reservation?room=${roomId}&noReservation=true`);
      } else if (roomId === "tour") {
        // 見学の場合は、利用目的を「視察・見学・取材」に自動設定して時間選択画面へ
        router.push(`/checkin/time?room=${roomId}&purpose=tour`);
      } else {
        // その他の部屋は直接時間選択画面へ
        router.push(`/checkin/time?room=${roomId}`);
      }
    }
  };
  
  // 戻るボタンを押したときの処理
  const handleBack = () => {
    setIsLoading(true);
    router.push("/checkin/reservation-selection");
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12">使用する部屋を選択してください</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl mb-6 sm:mb-8">
        {rooms.map((room) => (
          <Button
            key={room.id}
            variant="outline"
            size="lg"
            className="w-full h-16 sm:h-24 text-base sm:text-xl"
            onClick={() => handleRoomSelect(room.id)}
            isLoading={isLoading && selectedRoomId === room.id}
          >
            {room.name}
          </Button>
        ))}
      </div>
      
      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-2 sm:mt-4 w-full max-w-xs text-base sm:text-xl h-10 sm:h-12"
        isLoading={isLoading && selectedRoomId === null}
      >
        戻る
      </Button>
    </div>
  );
}

export default function RoomSelectionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <RoomSelectionContent />
    </Suspense>
  );
}
