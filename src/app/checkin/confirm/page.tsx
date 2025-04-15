"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

// 部屋名のマッピング
const roomNames: Record<string, string> = {
  "room1": "1番",
  "private4": "4番個室",
  "large4": "4番大部屋",
  "large6": "6番大部屋",
  "studio6": "6番工作室",
  "tour": "見学",
};

// 目的のマッピング
const purposeNames: Record<string, string> = {
  "meeting": "会議・打合せ",
  "remote": "仕事・テレワーク利用",
  "study": "学習利用",
  "event": "イベント・講座",
  "creation": "デジタル制作",
  "tour": "視察・見学・取材",
  "other": "その他",
};

// 年代のマッピング
const ageGroupNames: Record<string, string> = {
  "under10s": "10代以下",
  "20s": "20代",
  "30s": "30代",
  "40s": "40代",
  "50s": "50代",
  "over60s": "60代以上",
};

function Confirm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const count = searchParams.get("count");
  const purpose = searchParams.get("purpose");
  const ageGroup = searchParams.get("ageGroup");

  // 必要なデータがない場合はトップページにリダイレクト
  if (!room || !startTime || !endTime || !count || !purpose || !ageGroup) {
    console.error("必要な情報が不足しています。", { room, startTime, endTime, count, purpose, ageGroup });
    // クライアントサイドでのリダイレクトを避けるため、useEffectを使用
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  const handleConfirm = () => {
    const checkInData = {
      room,
      startTime,
      endTime,
      count: parseInt(count, 10),
      purpose,
      ageGroup,
      checkInTime: new Date().toISOString(),
    };

    // TODO: ここでFirestoreにデータを保存する
    console.log("チェックインデータ:", checkInData);

    // チェックイン完了画面（今回はトップに戻る）
    // チェックイン完了のフラグを付けてトップページに遷移
    router.push("/?checkinComplete=true");
  };

  const handleBack = () => {
    // 前の画面に戻る（アンケート画面）
    router.push(`/checkin/survey?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}&purpose=${purpose}`);
  };

  // ★ 新しいハンドラを追加
  const handleReset = () => {
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">入力内容の確認</h1>
      
      <Card className="w-full max-w-2xl mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">チェックイン情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="font-semibold">利用部屋:</div>
            <div>{roomNames[room] || room}</div>
            
            <div className="font-semibold">利用時間:</div>
            <div>{startTime} 〜 {endTime}</div>
            
            <div className="font-semibold">利用人数:</div>
            <div>{count}人</div>
            
            <div className="font-semibold">利用目的:</div>
            <div>{purposeNames[purpose] || purpose}</div>
            
            <div className="font-semibold">年代:</div>
            <div>{ageGroupNames[ageGroup] || ageGroup}</div>
          </div>
        </CardContent>
      </Card>
      
      {/* 確定ボタン */}
      <Button
        size="lg"
        onClick={handleConfirm}
        className="w-full max-w-xs text-xl h-16 mb-4"
      >
        確定する
      </Button>
      
      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="w-full max-w-xs text-xl h-12"
      >
        戻る
      </Button>

      {/* ★ 最初からやり直すボタンを追加 */}
      <Button
        variant="destructive" // 目立つようにdestructive variantを使うのだ
        size="lg"
        onClick={handleReset}
        className="w-full max-w-xs text-xl h-12 mt-4" // 少しマージンを追加
      >
        最初からやり直す
      </Button>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <Confirm />
    </Suspense>
  );
}