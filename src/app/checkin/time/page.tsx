"use client"; // useRouter, useSearchParams, useState を使うため

import { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, ChevronDown } from "lucide-react";

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

function TimeSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room"); // 前の画面から部屋情報を取得

  // 開始時間は現在時刻で自動設定
  const [startTime, setStartTime] = useState<string | null>(null);
  
  // 終了時間は時間と分を別々に管理
  const [endHour, setEndHour] = useState<string>("18");
  const [endMinute, setEndMinute] = useState<string>("00");
  
  // 終了時間の文字列表現
  const endTime = endHour && endMinute ? `${endHour}:${endMinute}` : null;

  // コンポーネントマウント時に現在時刻を設定
  useEffect(() => {
    const currentTime = getCurrentOrBusinessTime();
    setStartTime(currentTime);
    
    // 開始時間に基づいて終了時間のデフォルト値を設定
    if (currentTime) {
      const [startHour] = currentTime.split(":").map(Number);
      let defaultEndHour = startHour + 1;
      
      // 営業時間内に収まるように調整
      if (defaultEndHour > 18) defaultEndHour = 18;
      
      setEndHour(defaultEndHour.toString().padStart(2, "0"));
      setEndMinute("00"); // デフォルトは00分
    }
  }, []);

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

  // 選択可能な時間オプションを計算（開始時間以降）
  const availableHourOptions = useMemo(() => {
    if (!startTime) return hourOptions;
    
    const [startHour] = startTime.split(":").map(Number);
    // 開始時間と同じか、それ以降の時間のみを選択可能に
    return hourOptions.filter(option => {
      const hour = parseInt(option.value, 10);
      return hour >= startHour;
    });
  }, [startTime]);

  // 選択可能な分オプションを計算（開始時間以降）
  const availableMinuteOptions = useMemo(() => {
    if (!startTime) return minuteOptions;
    
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const selectedHour = parseInt(endHour, 10);
    
    // 18時の場合は00分のみ選択可能
    if (selectedHour === 18) {
      return minuteOptions.filter(option => option.value === "00");
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
  }, [startTime, endHour]);

  const handleNext = () => {
    if (startTime && endTime && room) {
      // 次の画面に部屋情報、開始時間、終了時間を渡す
      router.push(
        `/checkin/count?room=${room}&startTime=${startTime}&endTime=${endTime}`
      );
    }
  };

  const handleBack = () => {
    if (room) {
      // 前の画面に戻る（部屋選択画面）
      router.push(`/checkin/room`);
    }
  };

  // 時間を数値に変換して比較するヘルパー関数
  // const timeToNumber = (time: string): number => parseInt(time.split(":")[0], 10); // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">利用時間を選択してください</h1>
      <div className="w-full max-w-3xl">
        {/* 開始時間の表示 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">開始時間（現在時刻）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="text-3xl font-bold py-4 px-8 bg-primary text-primary-foreground rounded-md">
                {startTime || "読み込み中..."}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 終了時間選択（ホイールピッカー） */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">終了時間を選択してください</CardTitle>
          </CardHeader>
          <CardContent>
            {startTime ? (
              <div className="flex flex-col items-center">
                <div className="flex justify-center items-center gap-8 mb-6">
                  {/* 時間選択ホイールピッカー */}
                  <div className="flex flex-col items-center">
                    <label className="block text-lg font-medium mb-2 text-center">時間</label>
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg"
                        onClick={() => {
                          const currentIndex = availableHourOptions.findIndex(option => option.value === endHour);
                          if (currentIndex > 0) {
                            setEndHour(availableHourOptions[currentIndex - 1].value);
                          }
                        }}
                        disabled={availableHourOptions.findIndex(option => option.value === endHour) <= 0}
                      >
                        <ChevronUp className="h-8 w-8" />
                      </Button>
                      
                      <Card className="w-32 h-14 flex items-center justify-center shadow-md">
                        <CardContent className="p-0 flex items-center justify-center h-full w-full">
                          <span className="text-2xl font-bold">
                            {endHour}時
                          </span>
                        </CardContent>
                      </Card>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg"
                        onClick={() => {
                          const currentIndex = availableHourOptions.findIndex(option => option.value === endHour);
                          if (currentIndex < availableHourOptions.length - 1) {
                            setEndHour(availableHourOptions[currentIndex + 1].value);
                          }
                        }}
                        disabled={availableHourOptions.findIndex(option => option.value === endHour) >= availableHourOptions.length - 1}
                      >
                        <ChevronDown className="h-8 w-8" />
                      </Button>
                    </div>
                  </div>

                  {/* 分選択カード */}
                  <div className="flex flex-col items-center">
                    <label className="block text-lg font-medium mb-2 text-center">分</label>
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg"
                        onClick={() => {
                          const currentIndex = availableMinuteOptions.findIndex(option => option.value === endMinute);
                          if (currentIndex > 0) {
                            setEndMinute(availableMinuteOptions[currentIndex - 1].value);
                          }
                        }}
                        disabled={availableMinuteOptions.findIndex(option => option.value === endMinute) <= 0}
                      >
                        <ChevronUp className="h-8 w-8" />
                      </Button>
                      
                      <Card className="w-32 h-14 flex items-center justify-center shadow-md">
                        <CardContent className="p-0 flex items-center justify-center h-full w-full">
                          <span className="text-2xl font-bold">
                            {endMinute}分
                          </span>
                        </CardContent>
                      </Card>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg"
                        onClick={() => {
                          const currentIndex = availableMinuteOptions.findIndex(option => option.value === endMinute);
                          if (currentIndex < availableMinuteOptions.length - 1) {
                            setEndMinute(availableMinuteOptions[currentIndex + 1].value);
                          }
                        }}
                        disabled={availableMinuteOptions.findIndex(option => option.value === endMinute) >= availableMinuteOptions.length - 1}
                      >
                        <ChevronDown className="h-8 w-8" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-3xl font-bold py-3 px-8 bg-primary text-primary-foreground rounded-md">
                  {endHour}:{endMinute}
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

      {/* 次へボタン */}
      <Button
        size="lg"
        onClick={handleNext}
        disabled={!startTime || !endTime} // 開始時間と終了時間が選択されるまで無効
        className="mt-12 w-full max-w-xs text-2xl h-20 rounded-xl"
      >
        次へ
      </Button>

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-4 w-full max-w-xs text-xl h-14 rounded-xl"
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