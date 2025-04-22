"use client";

import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export default function CheckinLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  // welcomeページでは「最初に戻る」ボタンを表示しない
  const isWelcomePage = pathname === "/checkin/welcome";

  const handleBackToHome = () => {
    router.push("/checkin/welcome");
  };

  return (
    <div className="relative min-h-screen">
      {children}
      
      {/* 「最初に戻る」ボタン - welcomeページ以外で表示 */}
      {!isWelcomePage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full shadow-lg"
            onClick={handleBackToHome}
            aria-label="最初に戻る"
          >
            <Home className="mr-2" />
            最初に戻る
          </Button>
        </div>
      )}
    </div>
  );
}