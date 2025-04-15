import { Button } from "@/components/ui/button"; // Shadcn/uiのButtonをインポート
import Link from "next/link"; // 画面遷移のためにLinkをインポート

export default function Home() {
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
    </div>
  );
}
