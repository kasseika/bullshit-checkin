"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

function WelcomeContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 次へボタンを押したときの処理
  const handleNext = () => {
    setIsLoading(true);
    // fromWelcomeパラメータを付けて駐車場確認ページに遷移
    router.push("/checkin/parking?fromWelcome=true");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">大船渡テレワークセンター</h1>
      <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">セルフチェックインシステム</h2>
      
      <Card className="w-full max-w-md mb-6 sm:mb-8">
        <CardContent className="p-4 sm:p-6">
          {/* チェックイン注意書き */}
          <p className="text-base sm:text-lg font-medium text-center mb-4 sm:mb-6">
            ご利用の前にかならずこちらでチェックインをお願いいたします。
          </p>
          
          {/* 次へボタン */}
          <Button
            size="lg"
            className="w-full h-12 sm:h-14 text-base sm:text-xl"
            onClick={handleNext}
            isLoading={isLoading}
          >
            チェックインを開始する
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <WelcomeContent />
    </Suspense>
  );
}
