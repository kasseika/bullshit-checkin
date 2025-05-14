"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveBookingData } from "../../../lib/bookingFirestore";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardHeader,
} from "@/components/ui/card";

interface ReservationFormProps {
  openDays: Date[];
}

export default function ReservationForm({ openDays }: ReservationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // 選択可能な部屋リスト
  const rooms = [
    { id: "private4", name: "4番個室" },
    { id: "large6", name: "6番大部屋" },
    { id: "workshop6", name: "6番工作室" },
  ];
  
  // フォームの状態
  const [formData, setFormData] = useState({
    roomId: "",
    room: "",
    startDate: "",
    startTime: "",
    endTime: "",
    count: 1,
    purpose: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  // 日付選択の状態
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // 日付が選択されたときにフォームデータを更新
  useEffect(() => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`; // YYYY-MM-DD形式
      
      setFormData(prev => ({
        ...prev,
        startDate: formattedDate
      }));
    }
  }, [date]);

  // 入力値の変更を処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "roomId") {
      // 部屋IDが変更された場合、部屋名も更新
      const selectedRoom = rooms.find(room => room.id === value);
      setFormData((prev) => ({
        ...prev,
        roomId: value,
        room: selectedRoom ? selectedRoom.name : ""
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "count" ? parseInt(value) || 1 : value,
      }));
    }
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

  // 開館日かどうかをチェックする関数
  const isOpenDay = (day: Date): boolean => {
    return openDays.some(openDay => 
      openDay.getFullYear() === day.getFullYear() &&
      openDay.getMonth() === day.getMonth() &&
      openDay.getDate() === day.getDate()
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      {/* 部屋選択 */}
      <div className="space-y-2">
        <label className="block font-medium">
          利用する部屋
        </label>
        <div className="grid grid-cols-1 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => {
                // 部屋選択時に手動でhandleChangeを呼び出す
                const event = {
                  target: {
                    name: "roomId",
                    value: room.id
                  }
                } as React.ChangeEvent<HTMLSelectElement>;
                handleChange(event);
              }}
              className="cursor-pointer transition-all duration-200"
            >
              <Card className={cn(
                formData.roomId === room.id
                  ? "bg-black text-white"
                  : "hover:bg-accent/50"
              )}>
                <CardHeader className="flex justify-center items-center">
                  <p className="text-md font-medium text-center">{room.name}</p>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
        {/* 選択必須のバリデーションのために非表示のinputを追加 */}
        <input
          type="hidden"
          name="roomId"
          value={formData.roomId}
          required
        />
      </div>

      {/* 日付選択 (Date Picker) */}
      <div className="space-y-2">
        <label htmlFor="startDate" className="block font-medium">
          利用日
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "yyyy年MM月dd日", { locale: ja }) : 
                "日付を選択してください"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ja}
              disabled={day => !isOpenDay(day)} // 開館日以外は選択不可
              initialFocus
            />
          </PopoverContent>
        </Popover>
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
        <Button
          type="submit"
          disabled={isLoading || !date || !formData.roomId}
          className="w-full h-14 text-xl"
        >
          {isLoading ? "送信中..." : "予約を確定する"}
        </Button>
      </div>
    </form>
  );
}