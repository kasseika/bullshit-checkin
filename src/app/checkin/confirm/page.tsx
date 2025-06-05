"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense, useState, useEffect } from "react";
import { saveCheckInData } from "@/lib/firestore";
import { addCheckInEvent, updateReservationEndTime } from "@/lib/googleCalendar";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// 部屋名のマッピング
const roomNames: Record<string, string> = {
  "room1": "1番",
  "private4": "4番個室",
  "large4": "4番大部屋",
  "large6": "6番大部屋",
  "workshop6": "6番工作室",
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
  const reservationId = searchParams.get("reservationId"); // 予約ID（予約ありからの遷移の場合）
  const originalEndTime = searchParams.get("originalEndTime"); // 元の終了時間（予約時間変更の検出用）
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState<'back' | 'reset' | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'offline' | 'error'>('idle');
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionData, setCompletionData] = useState<{
    room: string;
    roomName: string;
    startTime: string;
    endTime: string;
    count: string;
    purpose: string;
    ageGroup: string;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [countdown, setCountdown] = useState(10); // 10秒カウントダウン用（内部処理のみで使用）

  // ネットワーク状態の監視
  useEffect(() => {
    // オンライン/オフラインイベントのリスナーを設定
    const handleOnline = () => {
      setSaveStatus('idle'); // ステータスをリセット
      toast.success('ネットワーク接続が回復しました', {
        description: '保存されたデータを送信しています...',
        duration: 5000,
      });
    };

    const handleOffline = () => {
      toast.warning('オフライン状態です', {
        description: 'データは端末に保存され、接続が回復したときに自動的に送信されます',
        duration: 5000,
      });
    };

    // 初期状態がオフラインの場合は通知
    if (!navigator.onLine) {
      toast.warning('オフライン状態です', {
        description: 'データは端末に保存され、接続が回復したときに自動的に送信されます',
        duration: 5000,
      });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // モーダル表示時の自動遷移タイマー
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showCompletionDialog) {
      // カウントダウンを10秒にリセット
      setCountdown(10);
      
      // 1秒ごとにカウントダウン
      timer = setInterval(() => {
        setCountdown((prev) => {
          // 0になったらトップページに遷移
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/checkin/welcome");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // クリーンアップ関数
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showCompletionDialog, router]);

  // 必要なデータがない場合はトップページにリダイレクト
  if (!room || !startTime || !endTime || !count || !purpose || !ageGroup) {
    console.error("必要な情報が不足しています。", { room, startTime, endTime, count, purpose, ageGroup });
    // クライアントサイドでのリダイレクトを避けるため、useEffectを使用
    if (typeof window !== "undefined") {
      router.push("/checkin/welcome");
    }
    return null;
  }

  const handleConfirm = async () => {
    // 二重送信防止
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    const checkInData = {
      room,
      startTime,
      endTime,
      count: parseInt(count, 10),
      purpose,
      ageGroup,
      checkInTime: new Date().toISOString(),
      reservationId: reservationId || null, // 予約IDがある場合は追加
    };

    try {
      // Firestoreにデータを保存
      const success = await saveCheckInData(checkInData);
      
      if (success) {
        console.log("チェックインデータを保存しました:", checkInData);
        
        // オフライン時はIndexedDBに保存された場合
        if (!navigator.onLine) {
          setSaveStatus('offline');
          setIsSubmitting(false);
          
          toast.success('チェックインデータを端末に保存しました', {
            description: 'インターネット接続が回復したときに自動的に送信されます',
            duration: 8000,
            action: {
              label: 'トップに戻る',
              onClick: () => router.push('/checkin/welcome'),
            },
          });
          
          // オフライン保存の場合はここで処理を終了
          return;
        }
        
        // 予約ありからの遷移で、終了時間が変更された場合、Googleカレンダーの予約を更新
        if (navigator.onLine && reservationId && originalEndTime && originalEndTime !== endTime) {
          try {
            console.log(`予約ID: ${reservationId} の終了時間を ${originalEndTime} から ${endTime} に更新します`);
            const updateSuccess = await updateReservationEndTime(reservationId, endTime);
            if (updateSuccess) {
              console.log(`予約の終了時間を更新しました`);
              toast.success("予約の終了時間を更新しました", {
                duration: 3000,
              });
            } else {
              console.error(`予約の終了時間の更新に失敗しました`);
              toast.warning("予約の終了時間の更新に失敗しましたが、チェックインは続行できます", {
                duration: 5000,
              });
            }
          } catch (error) {
            console.error("予約の更新中にエラーが発生しました:", error);
            toast.error("予約の更新中にエラーが発生しました", {
              description: error instanceof Error ? error.message : "不明なエラー",
              duration: 5000,
            });
          }
        }
        
        // 予約なしで4番個室または6番大部屋または6番工作室を選択した場合、Googleカレンダーに予定を追加
        if (navigator.onLine && !reservationId && (room === "private4" || room === "large6" || room === "workshop6")) {
          try {
            console.log(`${roomNames[room]}のチェックインをカレンダーに追加します。部屋ID: ${room}`);
            const calendarSuccess = await addCheckInEvent(room, startTime, endTime);
            if (calendarSuccess) {
              console.log(`${roomNames[room]}のチェックインをカレンダーに追加しました`);
              toast.success(`${roomNames[room]}のチェックインをカレンダーに追加しました`, {
                duration: 3000,
              });
            } else {
              console.error(`${roomNames[room]}のチェックインをカレンダーに追加できませんでした。部屋ID: ${room}`);
              toast.error(`${roomNames[room]}のチェックインをカレンダーに追加できませんでした`, {
                duration: 5000,
              });
            }
          } catch (error) {
            console.error("カレンダーへの追加中にエラーが発生しました:", error);
            toast.error("カレンダーへの追加中にエラーが発生しました", {
              description: error instanceof Error ? error.message : "不明なエラー",
              duration: 5000,
            });
          }
        }
        
        setSaveStatus('success');
        
        // チェックイン完了モーダルを表示するためのデータをセット
        setCompletionData({
          room,
          roomName: roomNames[room] || room,
          startTime,
          endTime,
          count,
          purpose: purposeNames[purpose] || purpose,
          ageGroup: ageGroupNames[ageGroup] || ageGroup
        });
        
        // モーダルを表示
        setShowCompletionDialog(true);
        
        // 送信中状態を解除
        setIsSubmitting(false);
      } else {
        // 保存に失敗した場合
        setSaveStatus('error');
        toast.error('チェックインデータの保存に失敗しました', {
          description: 'もう一度お試しください',
          duration: 5000,
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("チェックイン処理中にエラーが発生しました:", error);
      alert("エラーが発生しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setIsNavigating('back');
    
    // 前の画面に戻る（アンケート画面）
    let url = `/checkin/survey?room=${room}&startTime=${startTime}&endTime=${endTime}&count=${count}&purpose=${purpose}`;
    
    // 予約IDがある場合は追加
    if (reservationId) {
      url += `&reservationId=${reservationId}`;
    }
    
    router.push(url);
  };

  // ★ 新しいハンドラを追加
  const handleReset = () => {
    setIsNavigating('reset');
    router.push("/checkin/welcome");
  };

  // トップページに戻る処理
  const handleGoToTop = () => {
    router.push("/checkin/welcome");
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
        isLoading={isSubmitting}
        disabled={saveStatus === 'offline' || !navigator.onLine}
      >
        {isSubmitting ? "保存中..." : "確定する"}
      </Button>
      
      {/* 戻るボタン */}
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        className="w-full max-w-xs text-xl h-12"
        isLoading={isNavigating === 'back'}
      >
        戻る
      </Button>

      {/* ★ 最初からやり直すボタンを追加 */}
      <Button
        variant="destructive" // 目立つようにdestructive variantを使うのだ
        size="lg"
        onClick={handleReset}
        className="w-full max-w-xs text-xl h-12 mt-4" // 少しマージンを追加
        isLoading={isNavigating === 'reset'}
      >
        最初からやり直す
      </Button>
      
      {/* チェックイン完了モーダル */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">チェックイン完了</DialogTitle>
            <DialogDescription className="text-lg">
              チェックインが完了しました。以下の内容でご利用ください。
            </DialogDescription>
          </DialogHeader>
          
          {completionData && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="font-semibold">利用部屋:</div>
              <div>{completionData.roomName}</div>
              
              <div className="font-semibold">利用時間:</div>
              <div>{completionData.startTime} 〜 {completionData.endTime}</div>
              
              <div className="font-semibold">利用人数:</div>
              <div>{completionData.count}人</div>
              
              <div className="font-semibold">利用目的:</div>
              <div>{completionData.purpose}</div>
              
              <div className="font-semibold">年代:</div>
              <div>{completionData.ageGroup}</div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-center">
            <Button
              size="lg"
              onClick={handleGoToTop}
              className="w-full text-xl h-14"
            >
              トップページに戻る
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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