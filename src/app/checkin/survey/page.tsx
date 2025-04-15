"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const ageGroups = [
  { id: "under10s", name: "10代以下" },
  { id: "20s", name: "20代" },
  { id: "30s", name: "30代" },
  { id: "40s", name: "40代" },
  { id: "50s", name: "50代" },
  { id: "over60s", name: "60代以上" },
];

export default function SurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const count = searchParams.get("count");
  const purpose = searchParams.get("purpose");

  const handleSelect = (ageGroupId: string) => {
    if (room && startTime && endTime && count && purpose) {
      const checkInData = {
        room,
        startTime,
        endTime,
        count: parseInt(count, 10), // 数値に変換
        purpose,
        ageGroup: ageGroupId,
        checkInTime: new Date().toISOString(), // チェックイン時刻を追加
      };

      // TODO: ここでFirestoreにデータを保存する
      console.log("チェックインデータ:", checkInData);

      // チェックイン完了画面（今回はトップに戻る）
      // 将来的には専用の完了画面に遷移させるのが良いかも
      router.push("/");
      // alert("チェックインが完了しました！"); // 簡単な完了通知
    } else {
      console.error("必要な情報が不足しています。", { room, startTime, endTime, count, purpose });
      // エラー処理: 例えば前の画面に戻るなど
      router.back();
    }
  };

  const handleBack = () => {
    if (room && startTime && endTime && count) {
      // 前の画面に戻る（利用用途選択画面）
      router.push(`/checkin/purpose?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">利用者アンケート</h1>
      <h2 className="text-2xl mb-8">年代を選択してください</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-2xl">
        {ageGroups.map((ageGroup) => (
          <Button
            key={ageGroup.id}
            variant="outline"
            size="lg"
            onClick={() => handleSelect(ageGroup.id)}
            className="w-full h-24 text-xl"
          >
            {ageGroup.name}
          </Button>
        ))}
      </div>

      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="mt-12 w-full max-w-xs text-xl h-12"
      >
        戻る
      </Button>
    </div>
  );
}