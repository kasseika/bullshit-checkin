"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBookingById, BookingData } from "../../../lib/bookingFirestore";

// SearchParamsを使用するコンポーネント
function BookingDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) {
        setError("予約IDが見つかりません。");
        setIsLoading(false);
        return;
      }

      try {
        const bookingData = await getBookingById(bookingId);
        if (bookingData) {
          setBooking(bookingData);
        } else {
          setError("予約情報が見つかりませんでした。");
        }
      } catch (err) {
        console.error("予約情報の取得中にエラーが発生しました:", err);
        setError("予約情報の取得中にエラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

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
            <p className="mb-4 text-lg">
              予約ID: <span className="font-mono font-bold">{booking.id}</span>
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold">予約内容</h2>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">部屋:</div>
              <div>{booking.room}</div>
              
              <div className="font-medium">日付:</div>
              <div>{booking.startDate}</div>
              
              <div className="font-medium">時間:</div>
              <div>{booking.startTime} 〜 {booking.endTime}</div>
              
              <div className="font-medium">人数:</div>
              <div>{booking.count}名</div>
              
              <div className="font-medium">目的:</div>
              <div>{booking.purpose}</div>
            </div>

            <h2 className="mt-6 text-xl font-semibold">連絡先情報</h2>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">お名前:</div>
              <div>{booking.contactName}</div>
              
              <div className="font-medium">メールアドレス:</div>
              <div>{booking.contactEmail}</div>
              
              <div className="font-medium">電話番号:</div>
              <div>{booking.contactPhone}</div>
            </div>

            <div className="mt-8 text-center">
              <p className="mb-4 text-muted-foreground">
                予約内容は登録されたメールアドレスに送信されました。
                <br />
                当日は予約IDをご提示ください。
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