"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveBookingData } from "../../../lib/bookingFirestore";

export default function ReservationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  // URLパラメータから日付と部屋の情報を取得
  const dateParam = searchParams.get("date");
  const roomParam = searchParams.get("room");
  
  // 部屋IDから表示名を取得
  const getRoomName = (roomId: string | null): string => {
    if (!roomId) return "";
    
    const roomMap: Record<string, string> = {
      "private4": "4番個室",
      "large6": "6番大部屋",
      "workshop6": "6番工作室"
    };
    
    return roomMap[roomId] || "";
  };
  
  // フォームの状態
  const [formData, setFormData] = useState({
    room: getRoomName(roomParam),
    startDate: dateParam || "",
    startTime: "",
    endTime: "",
    count: 1,
    purpose: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  
  // パラメータがない場合は部屋選択ページにリダイレクト
  useEffect(() => {
    if (!dateParam || !roomParam) {
      router.push("/booking/welcome");
    }
  }, [dateParam, roomParam, router]);

  // 入力値の変更を処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "count" ? parseInt(value) || 1 : value,
    }));
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 予約データを保存
      const bookingId = await saveBookingData({
        ...formData,
        endDate: formData.startDate, // 同日の予約を想定
      });

      if (bookingId) {
        // 予約成功時、確認ページへ遷移
        router.push(`/booking/confirm?id=${bookingId}`);
      } else {
        // エラー処理
        setIsLoading(false);
        alert("予約の保存に失敗しました。もう一度お試しください。");
      }
    } catch (error) {
      console.error("予約処理中にエラーが発生しました:", error);
      setIsLoading(false);
      alert("予約処理中にエラーが発生しました。もう一度お試しください。");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-center text-3xl font-bold">施設予約</h1>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
        {/* 部屋表示 */}
        <div className="space-y-2">
          <label htmlFor="room" className="block font-medium">
            利用する部屋
          </label>
          <input
            type="text"
            id="room"
            name="room"
            value={formData.room}
            readOnly
            className="w-full rounded-md border border-input bg-background px-3 py-2 bg-gray-100"
          />
        </div>

        {/* 日付表示 */}
        <div className="space-y-2">
          <label htmlFor="startDate" className="block font-medium">
            利用日
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            readOnly
            className="w-full rounded-md border border-input bg-background px-3 py-2 bg-gray-100"
          />
        </div>

        {/* 時間選択 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="startTime" className="block font-medium">
              開始時間
            </label>
            <input
              type="time"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="endTime" className="block font-medium">
              終了時間
            </label>
            <input
              type="time"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
        </div>

        {/* 人数 */}
        <div className="space-y-2">
          <label htmlFor="count" className="block font-medium">
            利用人数
          </label>
          <input
            type="number"
            id="count"
            name="count"
            min="1"
            value={formData.count}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </div>

        {/* 利用目的 */}
        <div className="space-y-2">
          <label htmlFor="purpose" className="block font-medium">
            利用目的
          </label>
          <textarea
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            rows={3}
          />
        </div>

        {/* 連絡先情報 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">連絡先情報</h2>
          
          <div className="space-y-2">
            <label htmlFor="contactName" className="block font-medium">
              お名前
            </label>
            <input
              type="text"
              id="contactName"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="contactEmail" className="block font-medium">
              メールアドレス
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="contactPhone" className="block font-medium">
              電話番号
            </label>
            <input
              type="tel"
              id="contactPhone"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? "送信中..." : "予約を確定する"}
          </button>
        </div>
      </form>
    </div>
  );
}