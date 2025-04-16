"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// このページは廃止され、ホーム画面に統合されました
// 既存のリンクのために、ホーム画面にリダイレクトします
export default function RoomSelectionPage() {
  const router = useRouter();

  useEffect(() => {
    // ホーム画面にリダイレクト
    router.replace("/");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <p className="text-xl">リダイレクト中...</p>
    </div>
  );
}