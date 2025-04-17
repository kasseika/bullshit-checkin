"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

// 部屋選択画面のコンポーネント
function RoomSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasReservation = searchParams.get("hasReservation") === "true";
  
  // 予約ありの場合の部屋リスト
  const reservationRooms = [
    { id: "private4", name: "4番個室" },
    { id: "large6", name: "6番大部屋" },
    { id: "studio6", name: "6番工作室" },
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
    if (hasReservation) {
      // 予約ありの場合は予約選択画面へ
      router.push(`/checkin/reservation?room=${roomId}`);
    } else {
      // 予約なしの場合は直接時間選択画面へ
      router.push(`/checkin/time?room=${roomId}`);
    }
  };
  
  // 戻るボタンを押したときの処理
  const handleBack = () => {
    router.push("/");
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">使用する部屋を選択してください</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-2xl mb-8">
        {rooms.map((room) => (
          <Button
            key={room.id}
            variant="outline"
            size="lg"
            className="w-full h-24 text-xl"
            onClick={() => handleRoomSelect(room.id)}
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
        className="mt-4 w-full max-w-xs text-xl h-12"
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