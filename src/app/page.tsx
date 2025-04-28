"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleCheckin = () => {
    router.push("/checkin/welcome");
  };

  const handleBooking = () => {
    router.push("/booking");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">大船渡テレワークセンター</h1>
      <h2 className="text-2xl font-bold mb-8">ご利用システム</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card className="w-full">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">チェックイン</h3>
            <p className="mb-6 text-center">
              ご利用当日のチェックインはこちら
            </p>
            <Button
              size="lg"
              className="w-full h-14 text-xl"
              onClick={handleCheckin}
            >
              チェックインする
            </Button>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">予約</h3>
            <p className="mb-6 text-center">
              事前の予約はこちら
            </p>
            <Button
              size="lg"
              className="w-full h-14 text-xl"
              onClick={handleBooking}
            >
              予約する
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
