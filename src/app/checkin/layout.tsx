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
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full shadow-lg text-lg px-6 py-3"
            onClick={handleBackToHome}
            aria-label="最初に戻る"
          >
            <Home className="mr-2 h-6 w-6" />
            最初に戻る
          </Button>
        </div>
      )}

      {/* 電話番号ボタン - 常に表示 */}
      <div className="fixed bottom-8 left-8 z-50">
        <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-lg h-16 w-16"
              aria-label="電話番号を表示"
            >
              <Phone className="h-8 w-8" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl mb-3">お問い合わせ</DialogTitle>
              <DialogDescription className="text-lg">
                <div className="text-center my-6">
                  <p className="text-5xl font-bold mb-4">090-8437-9972</p>
                  <p className="text-base text-gray-500">
                    ※営業時間: 平日 9:00〜18:00
                  </p>
                  <p className="text-base text-gray-500 mt-2">
                    ※土日祝日はお休みです
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setIsPhoneDialogOpen(false)}
                className="px-8 py-3 text-lg"
              >
                <X className="mr-2 h-5 w-5" />
                閉じる
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}