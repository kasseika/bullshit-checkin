"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// 部屋選択画面のコンポーネント
function RoomSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const [isLoading, setIsLoading] = useState(false);
  const [, setSelectedRoomId] = useState<string | null>(null);
  
  // 選択可能な部屋リスト
  const rooms = [
    { id: "private4", name: "4番個室" },
    { id: "large6", name: "6番大部屋" },
    { id: "workshop6", name: "6番工作室" },
  ];
  
  // 部屋を選択したときの処理
  const handleRoomSelect = (roomId: string) => {
    setIsLoading(true);
    setSelectedRoomId(roomId);
    
    // 選択した部屋と日付の情報を含めて予約ページへ遷移
    router.push(`/booking/reservation?date=${date}&room=${roomId}`);
  };
  
  // 戻るボタンを押したときの処理
  const handleBack = () => {
    setIsLoading(true);
    router.push("/booking/welcome");
  };
  
  // 日付が選択されていない場合はウェルカムページにリダイレクト
  if (!date) {
    if (typeof window !== 'undefined') {
      router.push("/booking/welcome");
    }
    return null;
  }
  
  // 日付をフォーマット (YYYY-MM-DD → YYYY年MM月DD日)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-2">大船渡テレワークセンター</h1>
      <h2 className="text-2xl font-bold mb-8">予約システム</h2>
      
      <Card className="w-full max-w-md mb-8">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4 text-center">
            {date && formatDate(date)}の予約
          </h3>
          <p className="text-lg mb-6 text-center">使用する部屋を選択してください</p>
          
          <div className="grid grid-cols-1 gap-4 w-full">
            {rooms.map((room) => (
              <Button
                key={room.id}
                variant="outline"
                size="lg"
                className="w-full h-16 text-xl"
                onClick={() => handleRoomSelect(room.id)}
                disabled={isLoading}
              >
                {room.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="w-full max-w-md text-lg h-12"
        disabled={isLoading}
      >
        日付選択に戻る
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