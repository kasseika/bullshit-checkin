"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // ルートページにアクセスした場合、チェックインのウェルカムページにリダイレクト
    router.push("/checkin/welcome");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>リダイレクト中...</p>
    </div>
  );
}
