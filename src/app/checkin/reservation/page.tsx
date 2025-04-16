"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodayReservations, Reservation } from "@/lib/googleCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// 部屋名のマッピング
const ROOM_NAMES: Record<string, string> = {
  'private4': '4番個室',
  'large6': '6番大部屋',
  'studio6': '6番工作室',
};

function ReservationSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReservations, setShowReservations] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 予約情報を取得
  const fetchReservations = async () => {
    if (!room) return;
    
    setLoading(true);
    try {
      const data = await getTodayReservations(room);
      console.log('Fetched reservations:', data);
      setReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 予約ありを選択した場合
  const handleHasReservation = async () => {
    await fetchReservations();
    setShowReservations(true);
  };

  // 予約なしを選択した場合
  const handleNoReservation = () => {
    if (room) {
      // 時間選択画面に遷移
      router.push(`/checkin/time?room=${room}`);
    }
  };

  // 予約を選択した場合
  const handleSelectReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowConfirmDialog(true);
  };

  // 予約確認ダイアログで確定を押した場合
  const handleConfirmReservation = () => {
    if (selectedReservation && room) {
      // 時間選択画面に遷移（予約情報を渡す）
      router.push(
        `/checkin/count?room=${room}&startTime=${selectedReservation.startTime}&endTime=${selectedReservation.endTime}&reservationId=${selectedReservation.id}`
      );
    }
  };

  // 戻るボタンを押した場合
  const handleBack = () => {
    if (showReservations) {
      // 予約選択画面に戻る
      setShowReservations(false);
    } else {
      // トップページ（部屋選択画面）に戻る
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      {!showReservations ? (
        // 予約の有無選択画面
        <>
          <h1 className="text-4xl font-bold mb-12">予約の有無を選択してください</h1>
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
        </>
      ) : (
        // 予約一覧画面
        <>
          <h1 className="text-3xl font-bold mb-8">本日の予約一覧</h1>
          <div className="w-full max-w-2xl mb-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-xl">予約情報を取得中...</p>
              </div>
            ) : reservations.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {reservations.map((reservation) => (
                  <Card
                    key={reservation.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSelectReservation(reservation)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold">{reservation.title}</h3>
                          <p className="text-gray-600">
                            {reservation.startTime} 〜 {reservation.endTime}
                          </p>
                        </div>
                        <Button variant="outline">選択</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-center">予約が見つかりません</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-600 mb-4">
                    本日の{ROOM_NAMES[room || '']}の予約はありません。
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleNoReservation}
                  >
                    予約なしで続ける
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-4 w-full max-w-xs text-xl h-12"
      >
        戻る
      </Button>

      {/* 予約確認ダイアログ */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">予約の確認</DialogTitle>
            <DialogDescription className="text-lg pt-2">
              以下の予約でチェックインしますか？
            </DialogDescription>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">予約名:</div>
                <div>{selectedReservation.title}</div>
                
                <div className="font-medium">利用時間:</div>
                <div>{selectedReservation.startTime} 〜 {selectedReservation.endTime}</div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleConfirmReservation}
              className="flex-1"
            >
              確定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <ReservationSelection />
    </Suspense>
  );
}