/**
 * 手動チェックインデータ入力ページ
 * 管理者が後からチェックインデータを追加するための機能
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { saveManualCheckIn } from "@/lib/manualCheckin";
import type { CheckInData } from "@/lib/firestore";

const rooms = [
  { id: "room1", name: "1番" },
  { id: "private4", name: "4番個室" },
  { id: "large4", name: "4番大部屋" },
  { id: "large6", name: "6番大部屋" },
  { id: "workshop6", name: "6番工作室" },
  { id: "tour", name: "見学" },
];

const purposes = [
  { id: "meeting", name: "会議・打合せ" },
  { id: "remote", name: "仕事・テレワーク利用" },
  { id: "study", name: "学習利用" },
  { id: "event", name: "イベント・講座" },
  { id: "creation", name: "デジタル制作" },
  { id: "tour", name: "視察・見学・取材" },
  { id: "other", name: "その他" },
];

const ageGroups = [
  { id: "under10s", name: "10代以下" },
  { id: "20s", name: "20代" },
  { id: "30s", name: "30代" },
  { id: "40s", name: "40代" },
  { id: "50s", name: "50代" },
  { id: "over60s", name: "60代以上" },
];

import { AuthWrapper } from "./auth";

function ManualCheckinForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    room: "",
    startTime: "",
    endTime: "",
    count: "1",
    purpose: "",
    ageGroup: "",
    reservationId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // チェックインデータの作成
      const checkInData: CheckInData = {
        room: formData.room,
        startTime: formData.startTime,
        endTime: formData.endTime,
        count: parseInt(formData.count),
        purpose: formData.purpose,
        ageGroup: formData.ageGroup,
        checkInTime: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
        reservationId: formData.reservationId || null,
      };

      // Firestoreに保存（手動入力用の関数を使用）
      await saveManualCheckIn(checkInData, date);

      alert("チェックインデータを保存しました");
      router.push("/dashboard");
    } catch (error) {
      console.error("チェックインの保存に失敗しました:", error);
      alert("チェックインの保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 部屋選択時の自動設定
  const handleRoomChange = (value: string) => {
    setFormData({ ...formData, room: value });
    
    // 見学の場合は利用目的を自動設定
    if (value === "tour") {
      setFormData(prev => ({ ...prev, room: value, purpose: "tour" }));
    }
    // 工作室の場合は利用目的を自動設定
    else if (value === "workshop6") {
      setFormData(prev => ({ ...prev, room: value, purpose: "creation" }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>手動チェックイン入力</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 日付選択 */}
              <div className="space-y-2">
                <Label>チェックイン日付</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "yyyy年MM月dd日", { locale: ja }) : "日付を選択"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 部屋選択 */}
              <div className="space-y-2">
                <Label htmlFor="room">部屋 *</Label>
                <Select value={formData.room} onValueChange={handleRoomChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="部屋を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 開始時刻 */}
              <div className="space-y-2">
                <Label htmlFor="startTime">開始時刻 *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>

              {/* 終了時刻 */}
              <div className="space-y-2">
                <Label htmlFor="endTime">終了時刻 *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>

              {/* 利用人数 */}
              <div className="space-y-2">
                <Label htmlFor="count">利用人数 *</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                  required
                />
              </div>

              {/* 利用目的 */}
              <div className="space-y-2">
                <Label htmlFor="purpose">利用目的 *</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => setFormData({ ...formData, purpose: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="利用目的を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {purposes.map((purpose) => (
                      <SelectItem key={purpose.id} value={purpose.id}>
                        {purpose.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 年代 */}
              <div className="space-y-2">
                <Label htmlFor="ageGroup">年代 *</Label>
                <Select
                  value={formData.ageGroup}
                  onValueChange={(value) => setFormData({ ...formData, ageGroup: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="年代を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {ageGroups.map((age) => (
                      <SelectItem key={age.id} value={age.id}>
                        {age.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 予約ID（オプション） */}
              <div className="space-y-2">
                <Label htmlFor="reservationId">予約ID（オプション）</Label>
                <Input
                  id="reservationId"
                  type="text"
                  value={formData.reservationId}
                  onChange={(e) => setFormData({ ...formData, reservationId: e.target.value })}
                  placeholder="予約がある場合は入力"
                />
              </div>

              {/* 送信ボタン */}
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ManualCheckinPage() {
  return (
    <AuthWrapper>
      <ManualCheckinForm />
    </AuthWrapper>
  );
}