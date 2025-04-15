"use client";

import { Button } from "@/components/ui/button"; // Shadcn/uiのButtonをインポート
import Link from "next/link"; // 画面遷移のためにLinkをインポート
import { useSearchParams } from "next/navigation"; // クエリパラメータを取得するためのフック
import { useEffect, useState } from "react"; // useEffectとuseStateをインポート
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Dialogコンポーネントをインポート

export default function Home() {
  const searchParams = useSearchParams();
  const [showDialog, setShowDialog] = useState(false);

  // マウント時にクエリパラメータをチェック
  useEffect(() => {
    const checkinComplete = searchParams.get("checkinComplete");
    if (checkinComplete === "true") {
      setShowDialog(true);
      
      // 10秒後に自動的にダイアログを閉じる
      const timer = setTimeout(() => {
        setShowDialog(false);
      }, 10000); // 10秒 = 10000ミリ秒
      
      // コンポーネントのアンマウント時にタイマーをクリア
      return () => clearTimeout(timer);
    }
  }, [searchParams]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">チェックイン</h1>
      <div className="grid grid-cols-1 gap-8 w-full max-w-md">
        {/* 予約ありボタン (今回はダミー) */}
        <Button
          variant="outline"
          size="lg"
          className="h-24 text-2xl"
          disabled // 後で実装するので一旦無効化
        >
          予約あり
        </Button>

        {/* 予約なしボタン */}
        <Link href="/checkin/room" passHref>
          <Button size="lg" className="w-full h-24 text-2xl">
            予約なし
          </Button>
        </Link>
      </div>

      {/* チェックイン完了モーダル */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">チェックイン完了</DialogTitle>
            <DialogDescription className="text-lg pt-2">
              チェックインが正常に完了しました。<br />
              ごゆっくりご利用ください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowDialog(false)} className="w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
