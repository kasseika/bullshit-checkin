"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WelcomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = () => {
    setIsLoading(true);
    // 次のページへ遷移
    router.push("/booking/reservation");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Bullshit Booking</h1>
          <p className="mt-2 text-muted-foreground">施設予約システム</p>
        </div>

        <div className="space-y-4">
          <p className="text-center">
            このアプリでは施設の予約ができます。
            <br />
            下のボタンをタップして予約を開始してください。
          </p>

          <button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? "読み込み中..." : "予約を開始する"}
          </button>
        </div>
      </div>
    </div>
  );
}