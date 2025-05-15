"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 予約情報の型定義
interface BookingInfo {
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  count: number;
  purpose: string;
  name: string;
  email: string;
  phone: string;
  equipments?: string; // 使用機材（カンマ区切りの文字列）
}

// SearchParamsを使用するコンポーネント
function BookingDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // URLパラメータから予約情報を取得
    const room = searchParams.get("room");
    const date = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const countStr = searchParams.get("count");
    const purpose = searchParams.get("purpose");
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const equipments = searchParams.get("equipments");
    
    // 必須パラメータが存在するか確認
    if (!room || !date || !startTime || !endTime || !name) {
      setError("予約情報が不足しています。");
      setIsLoading(false);
      return;
    }
    
    // 予約情報をセット
    setBooking({
      room,
      date,
      startTime,
      endTime,
      count: countStr ? parseInt(countStr, 10) : 1,
      purpose: purpose || "",
      name,
      email: email || "",
      phone: phone || "",
      equipments: equipments || ""
    });
    
    setIsLoading(false);
  }, [searchParams]);

  const handleBackToHome = () => {
    router.push("/booking");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-6 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold">読み込み中...</h1>
            <p className="mt-2 text-muted-foreground">予約情報を取得しています</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-6 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold">エラーが発生しました</h1>
            <p className="mt-2 text-destructive">{error}</p>
            <button
              onClick={handleBackToHome}
              className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              トップページに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-6 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold">予約情報が見つかりません</h1>
            <button
              onClick={handleBackToHome}
              className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              トップページに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-lg bg-card p-6 shadow-lg">
          <div className="text-center">
            <h1 className="mb-6 text-2xl font-bold">予約が完了しました</h1>
          </div>

          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold">予約内容</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="font-medium">部屋:</div>
              <div className="break-words">{booking.room}</div>
              
              <div className="font-medium">日付:</div>
              <div className="break-words">{booking.date}</div>
              
              <div className="font-medium">時間:</div>
              <div className="break-words">{booking.startTime} 〜 {booking.endTime}</div>
              
              <div className="font-medium">人数:</div>
              <div className="break-words">{booking.count}名</div>
              
              <div className="font-medium">目的:</div>
              <div className="break-words">{booking.purpose}</div>
              
              {booking.equipments && (
                <>
                  <div className="font-medium">使用機材:</div>
                  <div className="break-words">{booking.equipments}</div>
                </>
              )}
            </div>

            <h2 className="mt-6 text-xl font-semibold">連絡先情報</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="font-medium">お名前:</div>
              <div className="break-words">{booking.name}</div>
              
              <div className="font-medium">メールアドレス:</div>
              <div className="break-words">{booking.email}</div>
              
              <div className="font-medium">電話番号:</div>
              <div className="break-words">{booking.phone}</div>
            </div>

            <div className="mt-8 text-center">
              <p className="mb-4 text-muted-foreground">
                予約内容は登録されたメールアドレスに送信されました。
              </p>
              
              <button
                onClick={handleBackToHome}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                トップページに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// メインのページコンポーネント
export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-6 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold">読み込み中...</h1>
            <p className="mt-2 text-muted-foreground">予約情報を取得しています</p>
          </div>
        </div>
      </div>
    }>
      <BookingDetails />
    </Suspense>
  );
}