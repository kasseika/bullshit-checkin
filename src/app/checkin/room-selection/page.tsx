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
interface Room {
  id: string;
  name: string;
  description?: string;
  priority?: boolean;
}

// 予約ありの場合の部屋リスト
const reservationRooms: Room[] = [
  { id: "private4", name: "4番個室" },
  { id: "large6", name: "6番 大部屋・工作室" },
];

// 予約なしの場合の部屋リスト
const noReservationRooms: Room[] = [
  { id: "large4", name: "4番大部屋", description: "テレワーク・勉強に使えるオープン席です", priority: true },
  { id: "private4", name: "4番個室", description: "Web会議等。予約がないときに使えます" },
  { id: "large6", name: "6番大部屋", description: "複数名の会議・イベント等。予約がないときに使えます" },
  { id: "room1", name: "1番", description: "飲食や他の部屋が使えないときなどにお使いください" },
  { id: "tour", name: "見学", description: "施設内を見学する際に選択してください" },
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
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">使用する部屋を選択してください</h1>
      
      {!hasReservation ? (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
          {rooms.map((room) => (
            <Button
              key={room.id}
              variant="outline"
              size="lg"
              className={`w-full ${room.id === "large4" && "col-span-2"} flex flex-col items-center justify-center p-4 ${room.id === "large4" ? "h-32" : "h-24"}`}
              onClick={() => handleRoomSelect(room.id)}
              isLoading={isLoading && selectedRoomId === room.id}
              data-testid={room.id === "large4" ? "room-large4-button" : `room-${room.id}-button`}
              role="button"
              aria-label={room.name}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleRoomSelect(room.id);
                }
              }}
            >
              <span className="text-xl font-semibold" data-testid={room.id === "large4" ? "room-large4-name" : undefined}>{room.name}</span>
              {"description" in room && (
                <span className="text-xs mt-1 text-gray-500" data-testid={room.id === "large4" ? "room-large4-description" : undefined}>{room.description}</span>
              )}
            </Button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
          {rooms.map((room) => (
            <Button
              key={room.id}
              variant="outline"
              size="lg"
              className="w-full h-24 text-xl"
              onClick={() => handleRoomSelect(room.id)}
              isLoading={isLoading && selectedRoomId === room.id}
            >
              {room.name}
            </Button>
          ))}
        </div>
      )}
      
      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-4 w-full max-w-xs text-xl h-12"
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