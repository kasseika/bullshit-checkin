"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";

function ParkingConfirmation() {
  const router = useRouter();

  // 次へボタンを押したときの処理
  const handleNext = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const fromWelcome = searchParams.get("fromWelcome") === "true";
    
    // ルートページに遷移（fromWelcomeとfromParkingパラメータを追加）
    if (fromWelcome) {
      router.push("/?fromWelcome=true&fromParking=true");
    } else {
      router.push("/?fromParking=true");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">駐車場のご確認</h1>
      
      <Card className="w-full max-w-md mb-8">
        <CardContent className="p-6">
          {/* 駐車場の画像 */}
          <div className="flex justify-center mb-6">
            <img
              src="/parking.png"
              alt="駐車場"
              className="rounded-md max-w-full h-auto"
            />
          </div>
          
          {/* 注意文 */}
          <p className="text-lg text-red-600 font-medium text-center mb-6">
            団地住民用のスペースに駐車してトラブルになるケースが多発しています。
            <br />
            <b>駐車場は必ず来客用駐車場をご利用ください。</b>
          </p>
          
          {/* 次へボタン */}
          <Button
            size="lg"
            className="w-full h-14 text-xl"
            onClick={handleNext}
          >
            確認しました
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ParkingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <ParkingConfirmation />
    </Suspense>
  );
}