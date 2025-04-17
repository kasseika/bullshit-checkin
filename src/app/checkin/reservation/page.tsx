"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodayReservations, Reservation } from "@/lib/googleCalendar";
import { getCheckedInReservationIds } from "@/lib/firestore";

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
  const noReservation = searchParams.get("noReservation") === "true";
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<{ status: string; isAvailable: boolean }>({ status: "読み込み中...", isAvailable: false });
  const [nextReservation, setNextReservation] = useState<Reservation | null>(null);
  const [checkedInReservationIds, setCheckedInReservationIds] = useState<string[]>([]);

  // UTCの時間文字列をJST（UTC+9）に変換する関数
  const convertToJST = (timeStr: string): string => {
    // HH:MM形式の文字列をパース
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // UTC時間にJST（+9時間）を加算
    let jstHours = hours + 9;
    
    // 24時間を超える場合は調整
    if (jstHours >= 24) {
      jstHours -= 24;
    }
    
    // HH:MM形式に戻す
    return `${jstHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // コンポーネントがマウントされたら予約情報を取得
  useEffect(() => {
    if (room) {
      fetchReservations();
    }
  }, [room]);

  // 予約情報を取得
  const fetchReservations = async () => {
    if (!room) return;
    
    setLoading(true);
    try {
      // 予約データを取得
      const data = await getTodayReservations(room);
      console.log('Fetched reservations:', data);
      
      // チェックイン済みの予約IDを取得
      const checkedInIds = await getCheckedInReservationIds();
      setCheckedInReservationIds(checkedInIds);
      console.log('Checked-in reservation IDs:', checkedInIds);
      
      // 予約データの時間をJSTに変換
      const jstReservations = data.map(reservation => ({
        ...reservation,
        startTime: convertToJST(reservation.startTime),
        endTime: convertToJST(reservation.endTime)
      }));
      
      setReservations(jstReservations);
      
      // 現在の使用状況と次の予約を設定
      setCurrentStatus(determineCurrentStatus(jstReservations));
      setNextReservation(findNextReservation(jstReservations));
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 現在の使用状況を判断する関数
  const determineCurrentStatus = (reservations: Reservation[]): { status: string; isAvailable: boolean } => {
    if (reservations.length === 0) return { status: "使用可能", isAvailable: true };
    
    // 現在の時刻を取得
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // 現在時刻が予約時間内にあるかチェック
    for (const reservation of reservations) {
      if (reservation.startTime <= currentTimeStr && currentTimeStr < reservation.endTime) {
        return {
          status: `使用中: ${reservation.title} (${reservation.startTime}〜${reservation.endTime})`,
          isAvailable: false
        };
      }
    }
    
    return { status: "使用可能", isAvailable: true };
  };

  // 次の予約を取得する関数
  const findNextReservation = (reservations: Reservation[]): Reservation | null => {
    if (reservations.length === 0) return null;
    
    // 現在の時刻を取得
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // 現在時刻以降の予約を時間順にソート
    const futureReservations = reservations
      .filter(res => res.startTime > currentTimeStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    return futureReservations.length > 0 ? futureReservations[0] : null;
  };

  // 予約を選択した場合
  const handleSelectReservation = (reservation: Reservation) => {
    // 選択された予約の時間もJSTに変換（すでに変換済みのデータを使用）
    // 確認ダイアログを表示せずに直接時間選択画面に遷移
    if (room) {
      // 次の予約情報を取得
      const nextRes = findNextReservationAfter(reservation, reservations);
      
      // 時間選択画面に遷移（予約情報と次の予約情報を渡す）
      let url = `/checkin/time?room=${room}&startTime=${reservation.startTime}&endTime=${reservation.endTime}&reservationId=${reservation.id}`;
      
      // 次の予約がある場合は、その開始時間を終了時間の上限として渡す
      if (nextRes) {
        url += `&nextReservationStart=${nextRes.startTime}`;
      }
      
      router.push(url);
    }
  };

  // 予約確認ダイアログで確定を押した場合の処理は削除（handleSelectReservationに統合）

  // 特定の予約の後の次の予約を見つける関数
  const findNextReservationAfter = (currentReservation: Reservation, allReservations: Reservation[]): Reservation | null => {
    if (allReservations.length <= 1) return null;
    
    // 予約を時間順にソート
    const sortedReservations = [...allReservations].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    
    // 現在の予約のインデックスを見つける
    const currentIndex = sortedReservations.findIndex(res => res.id === currentReservation.id);
    
    // 次の予約があれば返す
    if (currentIndex !== -1 && currentIndex < sortedReservations.length - 1) {
      return sortedReservations[currentIndex + 1];
    }
    
    return null;
  };

  // 予約なしで続ける場合
  const handleNoReservation = () => {
    if (room) {
      // 時間選択画面に遷移（次の予約情報があれば渡す）
      let url = `/checkin/time?room=${room}`;
      
      // 次の予約がある場合は、その開始時間を終了時間の上限として渡す
      if (nextReservation) {
        url += `&nextReservationStart=${nextReservation.startTime}`;
      }
      
      router.push(url);
    }
  };

  // 戻るボタンを押した場合
  const handleBack = () => {
    // 部屋選択画面に戻る
    if (noReservation) {
      router.push("/checkin/room-selection?hasReservation=false");
    } else {
      router.push("/checkin/room-selection?hasReservation=true");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">
        {noReservation ? `${ROOM_NAMES[room || '']}の予約状況` : '本日の予約一覧'}
      </h1>
      <div className="w-full max-w-2xl mb-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl">予約情報を取得中...</p>
          </div>
        ) : noReservation ? (
          // 予約なしモードの場合は現在の使用状況と次の予約を表示
          <Card
            className={currentStatus.isAvailable
              ? "border-green-500 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
              : "border-red-500 border-2 bg-red-50"
            }
            onClick={currentStatus.isAvailable ? handleNoReservation : undefined}
          >
            <CardHeader>
              <CardTitle className={"text-xl text-center"}>
                {currentStatus.isAvailable
                  ? `${ROOM_NAMES[room || '']}の予約状況`
                  : `${ROOM_NAMES[room || '']}は現在ご利用できません`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">現在の使用状況</h3>
                  <p className={"p-3 rounded-md bg-white"}>
                    {currentStatus.status}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">次の予約</h3>
                  {nextReservation ? (
                    <div className="p-3 bg-white rounded-md">
                      <p className="font-medium">{nextReservation.title}</p>
                      <p className="text-gray-600">{nextReservation.startTime} 〜 {nextReservation.endTime}</p>
                    </div>
                  ) : (
                    <p className="text-gray-700 p-3 bg-white rounded-md">なし</p>
                  )}
                </div>
              </div>
              
              {currentStatus.isAvailable ? (
                <Button
                  className="w-full mt-6 bg-green-600 hover:bg-green-700"
                  onClick={handleNoReservation}
                >
                  この部屋を使用する
                </Button>
              ) : (
                <Button
                  className="w-full mt-6 bg-red-600 text-white cursor-not-allowed"
                  disabled
                >
                  現在使用できません
                </Button>
              )}
            </CardContent>
          </Card>
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
                      {checkedInReservationIds.includes(reservation.id) && (
                        <p className="text-green-600 font-medium mt-1">
                          ✓ チェックイン済み
                        </p>
                      )}
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

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-4 w-full max-w-xs text-xl h-12"
      >
        戻る
      </Button>

      {/* 予約確認ダイアログは不要なため削除 */}
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