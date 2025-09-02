"use client"; // useRouter, useSearchParams, useState を使うため

import { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, ChevronsRight } from "lucide-react";

// 注: 以前の30分刻みの時間リストは新しい実装では使用しないため削除

// 時刻文字列を取得する関数（HH:MM形式）- 分単位の詳細な時刻
const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// 営業時間内かどうかを確認する関数
const isWithinBusinessHours = (timeString: string): boolean => {
  const [hours, minutes] = timeString.split(":").map(Number);
  const time = hours * 60 + minutes; // 分に変換
  const openTime = 9 * 60; // 9:00
  const closeTime = 18 * 60; // 18:00
  return time >= openTime && time < closeTime;
};

// 現在時刻を取得する関数（営業時間外の場合は営業開始時間を返す）
const getCurrentOrBusinessTime = (): string => {
  const currentTime = getCurrentTimeString();
  return isWithinBusinessHours(currentTime) ? currentTime : "09:00";
};

// 時間選択用のドラムロールオプション（9時〜18時）
const hourOptions = Array.from({ length: 10 }, (_, i) => {
  const hour = i + 9;
  return {
    value: hour.toString().padStart(2, "0"),
    label: `${hour}時`,
  };
});

// 分選択用のドラムロールオプション（10分単位）
const minuteOptions = Array.from({ length: 6 }, (_, i) => {
  const minute = i * 10;
  return {
    value: minute.toString().padStart(2, "0"),
    label: `${minute}分`,
  };
});

// 部屋コードから表示用の部屋名を取得する関数
const getRoomDisplayName = (roomCode: string | null): string => {
  if (!roomCode) return "不明な部屋";
  
  const roomMap: Record<string, string> = {
    "room1": "1番",
    "private4": "4番個室",
    "large4": "4番大部屋",
    "large6": "6番大部屋",
    "workshop6": "6番工作室",
    "tour": "見学",
    // 必要に応じて他の部屋も追加
  };
  
  return roomMap[roomCode] || roomCode;
};

function TimeSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room"); // 前の画面から部屋情報を取得
  const nextReservationStart = searchParams.get("nextReservationStart"); // 次の予約の開始時間
  const reservationId = searchParams.get("reservationId"); // 予約ID（予約ありからの遷移の場合）
  const paramStartTime = searchParams.get("startTime"); // URLから開始時間を取得（予約ありからの遷移の場合）
  const paramEndTime = searchParams.get("endTime"); // URLから終了時間を取得（予約ありからの遷移の場合）
  const [isLoading, setIsLoading] = useState<'next' | 'back' | null>(null);
  
  // 部屋の表示名を取得
  const roomDisplayName = getRoomDisplayName(room);

  // 開始時間は現在時刻で自動設定
  const [startTime, setStartTime] = useState<string | null>(null);
  
  // 終了時間は時間と分を別々に管理
  const [endHour, setEndHour] = useState<string>("18");
  const [endMinute, setEndMinute] = useState<string>("00");
  
  // 終了時間の文字列表現
  const endTime = endHour && endMinute ? `${endHour}:${endMinute}` : null;

  // 次の予約の開始時間を解析
  const nextReservationLimit = useMemo(() => {
    if (!nextReservationStart) return null;
    
    // HH:MM形式の時間を解析
    const [hours, minutes] = nextReservationStart.split(":").map(Number);
    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      timeString: nextReservationStart
    };
  }, [nextReservationStart]);

  // コンポーネントマウント時に現在時刻を設定
  useEffect(() => {
    // 予約ありからの遷移の場合は、URLパラメータから時間を設定
    if (paramStartTime && paramEndTime) {
      setStartTime(paramStartTime);
      
      // 終了時間を設定
      const [endHourStr, endMinuteStr] = paramEndTime.split(":").map(String);
      setEndHour(endHourStr);
      setEndMinute(endMinuteStr);
    } else {
      // 予約なしの場合は現在時刻を設定
      const currentTime = getCurrentOrBusinessTime();
      setStartTime(currentTime);
      
      // 開始時間に基づいて終了時間のデフォルト値を設定
      if (currentTime) {
        const [startHour] = currentTime.split(":").map(Number);
        let defaultEndHour = startHour + 1;
        
        // 次の予約がある場合は、その開始時間を上限とする
        if (nextReservationLimit) {
          const nextHour = parseInt(nextReservationLimit.hours, 10);
          if (defaultEndHour > nextHour || (defaultEndHour === nextHour && parseInt(nextReservationLimit.minutes, 10) === 0)) {
            defaultEndHour = nextHour;
            setEndMinute(nextReservationLimit.minutes);
          }
        }
        
        // 営業時間内に収まるように調整
        if (defaultEndHour > 18) defaultEndHour = 18;
        
        setEndHour(defaultEndHour.toString().padStart(2, "0"));
        if (defaultEndHour === 18) setEndMinute("00"); // 18時の場合は00分
      }
    }
  }, [nextReservationLimit, paramStartTime, paramEndTime]);

  // 時間が変更されたときに分を調整する
  useEffect(() => {
    if (!startTime) return;
    
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const selectedHour = parseInt(endHour, 10);
    
    // 18時の場合は常に00分に設定
    if (selectedHour === 18) {
      setEndMinute("00");
      return;
    }
    
    // 選択した時間が開始時間と同じ場合、分が開始時間より前にならないように調整
    if (selectedHour === startHour) {
      const selectedMinute = parseInt(endMinute, 10);
      if (selectedMinute <= startMinute) {
        // 開始時間の次の10分単位に設定
        const nextValidMinute = Math.ceil((startMinute + 1) / 10) * 10;
        if (nextValidMinute < 60) {
          setEndMinute(nextValidMinute.toString().padStart(2, "0"));
        } else {
          // 次の時間の00分に設定
          if (selectedHour < 18) {
            setEndHour((selectedHour + 1).toString().padStart(2, "0"));
            setEndMinute("00");
          }
        }
      }
    }
  }, [startTime, endHour, endMinute]);

  // 選択可能な時間オプションを計算（開始時間以降、次の予約開始時間以前）
  const availableHourOptions = useMemo(() => {
    if (!startTime) return hourOptions;
    
    const [startHour] = startTime.split(":").map(Number);
    
    return hourOptions.filter(option => {
      const hour = parseInt(option.value, 10);
      
      // 開始時間以降
      if (hour < startHour) return false;
      
      // 次の予約がある場合、その開始時間以前
      if (nextReservationLimit) {
        const nextHour = parseInt(nextReservationLimit.hours, 10);
        if (hour > nextHour) return false;
      }
      
      return true;
    });
  }, [startTime, nextReservationLimit]);

  // 選択可能な分オプションを計算（開始時間以降、次の予約開始時間以前）
  const availableMinuteOptions = useMemo(() => {
    if (!startTime) return minuteOptions;
    
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const selectedHour = parseInt(endHour, 10);
    
    // 18時の場合は00分のみ選択可能
    if (selectedHour === 18) {
      return minuteOptions.filter(option => option.value === "00");
    }
    
    // 次の予約の開始時間と同じ時間の場合
    if (nextReservationLimit && selectedHour === parseInt(nextReservationLimit.hours, 10)) {
      return minuteOptions.filter(option => {
        const minute = parseInt(option.value, 10);
        return minute < parseInt(nextReservationLimit.minutes, 10);
      });
    }
    
    // 選択した時間が開始時間と同じ場合、開始時間の分以上の値のみを選択可能に
    if (selectedHour === startHour) {
      return minuteOptions.filter(option => {
        const minute = parseInt(option.value, 10);
        return minute > startMinute;
      });
    }
    
    // 選択した時間が開始時間より後の場合、すべての分を選択可能に
    return minuteOptions;
  }, [startTime, endHour, nextReservationLimit]);

  const handleNext = () => {
    if (startTime && endTime && room) {
      setIsLoading('next');
      
      // 次の画面に部屋情報、開始時間、終了時間を渡す
      let url = `/checkin/count?room=${room}&startTime=${startTime}&endTime=${endTime}`;
      
      // 見学の場合は利用目的も渡す
      const purpose = searchParams.get("purpose");
      if (purpose) {
        url += `&purpose=${purpose}`;
      }
      
      // 予約IDがある場合は追加
      if (reservationId) {
        url += `&reservationId=${reservationId}`;
        
        // 元の終了時間がある場合は追加（予約時間変更の検出用）
        if (paramEndTime) {
          url += `&originalEndTime=${paramEndTime}`;
        }
      }
      
      router.push(url);
    }
  };

  const handleBack = () => {
    if (room) {
      setIsLoading('back');
      
      if (reservationId) {
        // 予約ありからの遷移の場合は予約選択画面に戻る
        router.push(`/checkin/reservation?room=${room}`);
      } else {
        // 予約なしの場合は部屋選択画面に戻る
        router.push(`/checkin/room-selection`);
      }
    }
  };

  // 時間を数値に変換して比較するヘルパー関数
  // const timeToNumber = (time: string): number => parseInt(time.split(":")[0], 10); // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">何時までご利用されますか？</h1>
      <div className="w-full max-w-3xl">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <Card className="flex-1">
            <CardContent>
            {startTime ? (
              <div className="flex flex-col items-center">
                {/* 次の予約がある場合は表示 */}
                {nextReservationLimit && (
                  <div className="mb-4 p-3 bg-yellow-100 rounded-md text-center">
                    <p className="font-medium">次の予約: {nextReservationLimit.timeString}〜</p>
                    <p className="text-sm text-gray-600">※終了時間は次の予約開始時間を超えて設定できません</p>
                  </div>
                )}
                {/* 部屋タイプに応じた注意書きを表示 */}
                {(room === "private4" || room === "large6" || room === "workshop6") ? (
                  <div className="mb-4 p-3 bg-yellow-100 rounded-md text-center">
                    <p className="text-sm text-gray-600">一度確定すると変更できません。<br />次の利用者のために時間内にご退室をお願いします。</p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-blue-50 rounded-md text-center">
                    <p className="text-sm text-gray-600">{roomDisplayName}はオープン席です。空いている席をご自由にお使いください。<br />終了時間は目安でご入力ください。</p>
                  </div>
                )}
                <div className="flex items-center justify-center gap-6 mb-8">
                  {/* 開始時刻 */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">開始時刻</span>
                    <div className="text-xl font-semibold py-2 px-4 bg-gray-100 text-gray-600 rounded-md">
                      {startTime || "読み込み中..."}
                    </div>
                  </div>

                  <ChevronsRight className="h-6 w-6 text-gray-400 mt-6" />

                  {/* 終了時刻 */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm text-gray-600 mb-2">終了時刻</span>
                    <div className="flex items-center gap-2">
                      {/* 時間選択 */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            const currentIndex = availableHourOptions.findIndex(option => option.value === endHour);
                            if (currentIndex < availableHourOptions.length - 1) {
                              setEndHour(availableHourOptions[currentIndex + 1].value);
                            }
                          }}
                          disabled={availableHourOptions.findIndex(option => option.value === endHour) >= availableHourOptions.length - 1}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        
                        <div className="text-3xl font-bold py-2 px-4 bg-blue-50 text-blue-700 rounded-md border-2 border-blue-200">
                          {endHour}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            const currentIndex = availableHourOptions.findIndex(option => option.value === endHour);
                            if (currentIndex > 0) {
                              setEndHour(availableHourOptions[currentIndex - 1].value);
                            }
                          }}
                          disabled={availableHourOptions.findIndex(option => option.value === endHour) <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>

                      <span className="text-3xl font-bold">:</span>

                      {/* 分選択 */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            const currentIndex = availableMinuteOptions.findIndex(option => option.value === endMinute);
                            if (currentIndex < availableMinuteOptions.length - 1) {
                              setEndMinute(availableMinuteOptions[currentIndex + 1].value);
                            }
                          }}
                          disabled={availableMinuteOptions.findIndex(option => option.value === endMinute) >= availableMinuteOptions.length - 1}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        
                        <div className="text-3xl font-bold py-2 px-4 bg-blue-50 text-blue-700 rounded-md border-2 border-blue-200">
                          {endMinute}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            const currentIndex = availableMinuteOptions.findIndex(option => option.value === endMinute);
                            if (currentIndex > 0) {
                              setEndMinute(availableMinuteOptions[currentIndex - 1].value);
                            }
                          }}
                          disabled={availableMinuteOptions.findIndex(option => option.value === endMinute) <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                開始時間を計算中...
              </p>
            )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 次へボタン */}
      <Button
        size="lg"
        onClick={handleNext}
        disabled={!startTime || !endTime} // 開始時間と終了時間が選択されるまで無効
        className="mt-12 w-full max-w-xs text-2xl h-20 rounded-xl"
        isLoading={isLoading === 'next'}
      >
        次へ
      </Button>

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-4 w-full max-w-xs text-xl h-14 rounded-xl"
        isLoading={isLoading === 'back'}
      >
        戻る
      </Button>
    </div>
  );
}

export default function TimeSelectionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <TimeSelection />
    </Suspense>
  );
}
