"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Home, Phone, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// 無操作タイムアウトの設定（ミリ秒）
const INACTIVITY_TIMEOUT = 60 * 1000; // 1分
const WARNING_TIMEOUT_1 = 30 * 1000; // 30秒前の警告
const WARNING_TIMEOUT_2 = 10 * 1000; // 10秒前の警告

export default function CheckinLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [warningShown, setWarningShown] = useState({ first: false, second: false });

  // welcomeページでは「最初に戻る」ボタンを表示しない
  const isWelcomePage = pathname === "/checkin/welcome";

  const handleBackToHome = () => {
    router.push("/checkin/welcome");
  };

  // ユーザーの操作をリセットする関数
  const resetInactivityTimer = useCallback(() => {
    setLastActivity(Date.now());
    setWarningShown({ first: false, second: false });
  }, []);

  // welcomeページからの遷移時にタイマーをリセット
  useEffect(() => {
    const fromWelcome = searchParams.get('fromWelcome') === 'true';
    if (fromWelcome) {
      resetInactivityTimer();
    }
  }, [searchParams, resetInactivityTimer]);

  // ユーザーの操作を検知するイベントリスナー
  useEffect(() => {
    // welcomeページでは無操作検知を行わない
    if (isWelcomePage) return;

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // イベントリスナーを登録
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    // クリーンアップ関数
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isWelcomePage, resetInactivityTimer]);

  // 無操作タイマーの設定
  useEffect(() => {
    // welcomeページでは無操作検知を行わない
    if (isWelcomePage) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;

      // 1分経過したら最初のページに戻る
      if (elapsed >= INACTIVITY_TIMEOUT) {
        router.push("/checkin/welcome");
        toast("無操作のため最初のページに戻りました", {
          position: "bottom-left",
          duration: 5000,
        });
        resetInactivityTimer();
        return;
      }

      // 30秒前の警告
      if (elapsed >= INACTIVITY_TIMEOUT - WARNING_TIMEOUT_1 && !warningShown.first) {
        toast("無操作のため30秒後に最初に戻ります", {
          position: "bottom-left",
          duration: 5000,
        });
        setWarningShown(prev => ({ ...prev, first: true }));
      }

      // 10秒前の警告
      if (elapsed >= INACTIVITY_TIMEOUT - WARNING_TIMEOUT_2 && !warningShown.second) {
        toast("無操作のため10秒後に最初に戻ります", {
          position: "bottom-left",
          duration: 5000,
        });
        setWarningShown(prev => ({ ...prev, second: true }));
      }
    }, 1000); // 1秒ごとにチェック

    return () => clearInterval(interval);
  }, [isWelcomePage, lastActivity, router, resetInactivityTimer, warningShown]);

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