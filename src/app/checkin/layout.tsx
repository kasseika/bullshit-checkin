"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Home, Phone, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CheckinLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);

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

      {/* 電話番号ボタン - 常に表示 */}
      <div className="fixed bottom-6 left-6 z-50">
        <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-lg h-12 w-12"
              aria-label="電話番号を表示"
            >
              <Phone />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl mb-2">お問い合わせ</DialogTitle>
              <DialogDescription className="text-base">
                <div className="text-center my-4">
                  <p className="text-4xl font-bold mb-2">090-8437-9972</p>
                  <p className="text-sm text-gray-500">
                    ※営業時間: 平日 9:00〜18:00
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ※土日祝日はお休みです
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setIsPhoneDialogOpen(false)}
                className="px-6"
              >
                <X className="mr-2 h-4 w-4" />
                閉じる
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}