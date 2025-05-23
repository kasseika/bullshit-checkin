"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// useSearchParamsを使用する部分を別コンポーネントに分離
function ReservationSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDialog, setShowDialog] = useState(false);
  
  // 予約情報を取得
  const checkinInfo = {
    roomName: searchParams.get("roomName") || "",
    startTime: searchParams.get("startTime") || "",
    endTime: searchParams.get("endTime") || "",
    count: searchParams.get("count") || "",
    purpose: searchParams.get("purpose") || "",
    ageGroup: searchParams.get("ageGroup") || ""
  };

  // マウント時にクエリパラメータをチェック
  useEffect(() => {
    const checkinComplete = searchParams.get("checkinComplete");
    if (checkinComplete === "true") {
      setShowDialog(true);
      
      // 10秒後に自動的にダイアログを閉じる
      const timer = setTimeout(() => {
        setShowDialog(false);
      }, 10000); // 10秒 = 10000ミリ秒
      
      // コンポーネントのアンマウント時にタイマーをクリア
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // 予約ありを選択したときの処理
  const handleHasReservation = () => {
    router.push("/checkin/room-selection?hasReservation=true");
  };

  // 予約なしを選択したときの処理
  const handleNoReservation = () => {
    router.push("/checkin/room-selection?hasReservation=false");
  };
  
  // 戻るボタンを押したときの処理
  const handleBack = () => {
    router.push("/checkin/parking");
  };
  
  return (
    <>
      <div className="grid grid-cols-1 gap-8 w-full max-w-md">
        {/* 予約ありボタン */}
        <Button
          variant="outline"
          size="lg"
          className="h-24 text-2xl"
          onClick={handleHasReservation}
        >
          予約あり
        </Button>

        {/* 予約なしボタン */}
        <Button
          size="lg"
          className="w-full h-24 text-2xl"
          onClick={handleNoReservation}
        >
          予約なし
        </Button>
      </div>
      
      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-8 w-full max-w-xs text-xl h-12"
      >
        戻る
      </Button>

      {/* チェックイン完了モーダル */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">チェックイン完了</DialogTitle>
            <DialogDescription className="text-lg pt-2">
              チェックインが正常に完了しました。<br />
              ごゆっくりご利用ください。
            </DialogDescription>
          </DialogHeader>
          
          {/* 予約内容の表示 */}
          {checkinInfo.roomName && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold text-lg mb-2">予約内容</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">利用部屋:</div>
                <div>{checkinInfo.roomName}</div>
                
                <div className="font-medium">利用時間:</div>
                <div>{checkinInfo.startTime} 〜 {checkinInfo.endTime}</div>
                
                <div className="font-medium">利用人数:</div>
                <div>{checkinInfo.count}人</div>
                
                <div className="font-medium">利用目的:</div>
                <div>{checkinInfo.purpose}</div>
                
                <div className="font-medium">年代:</div>
                <div>{checkinInfo.ageGroup}</div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowDialog(false)} className="w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ReservationSelectionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">予約の有無を選択してください</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ReservationSelectionContent />
      </Suspense>
    </div>
  );
}