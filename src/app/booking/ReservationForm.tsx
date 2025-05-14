"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getReservationsForPeriod, Reservation, addBookingToCalendar } from "../../lib/googleCalendar";
import { format, isBefore, addMonths, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

// 利用目的の選択肢
const purposes = [
  { id: "meeting", name: "会議・打合せ" },
  { id: "remote", name: "仕事・テレワーク" },
  { id: "study", name: "学習" },
  { id: "event", name: "イベント・講座" },
  { id: "creation", name: "制作" },
  { id: "tour", name: "視察・見学・取材" },
  { id: "other", name: "その他" },
];

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

// 時間を分に変換する関数
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 分を時間に変換する関数
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
};

// 時間選択肢を生成する関数（10分単位、9:00〜18:00）
const generateTimeOptions = (
  startTime?: string,
  isEndTime: boolean = false,
  reservations: Reservation[] = [],
  selectedDate?: string
) => {
  const times = [];
  
  // 現在時刻を取得（当日の場合に使用）
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  // 現在時刻を分に変換
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // 選択された日付が当日かどうかをチェック
  const isToday = selectedDate === format(now, 'yyyy-MM-dd');
  
  // 開始時間の最小値を設定
  // 当日の場合は現在時刻の次の10分単位、それ以外は9:00
  let minStart = 9 * 60; // デフォルトは9:00 = 540分
  
  if (isToday && !isEndTime) {
    // 現在時刻の次の10分単位に切り上げ
    minStart = Math.ceil(currentTimeInMinutes / 10) * 10;
    // 9:00より前の場合は9:00に設定
    minStart = Math.max(minStart, 9 * 60);
  }
  
  const start = startTime ?
    timeToMinutes(startTime) :
    minStart;
  const end = 18 * 60; // 18:00 = 1080分
  
  // 開始時間の場合は17:50まで、終了時間の場合は18:00まで
  const maxTime = isEndTime ? end : end - 10;

  // 予約済み時間帯を取得
  const reservedTimeSlots: { start: number; end: number }[] = reservations.map(reservation => ({
    start: timeToMinutes(reservation.startTime),
    end: timeToMinutes(reservation.endTime)
  }));

  // 時間帯が予約済みかどうかをチェックする関数
  const isTimeSlotReserved = (time: number): boolean => {
    return reservedTimeSlots.some(slot => {
      // 開始時間の場合：その時間が予約の開始時間以上、終了時間未満なら予約済み
      if (!isEndTime) {
        return time >= slot.start && time < slot.end;
      }
      // 終了時間の場合：その時間が予約の開始時間より大きく、終了時間以下なら予約済み
      return time > slot.start && time <= slot.end;
    });
  };

  // 終了時間の場合、次の予約開始時間を取得
  let nextReservationStart = end;
  if (isEndTime && reservedTimeSlots.length > 0) {
    // 開始時間より後の予約を探す
    const futureReservations = reservedTimeSlots
      .filter(slot => slot.start > start)
      .sort((a, b) => a.start - b.start);
    
    if (futureReservations.length > 0) {
      nextReservationStart = futureReservations[0].start;
    }
  }

  // 終了時間の場合、ループは次の予約開始時間または最大時間の手前まで実行
  const loopEndTime = isEndTime
    ? Math.min(nextReservationStart - 10, maxTime - 10)
    : maxTime;

  // 開始時間が選択されていない場合は9:00から最大時間まで
  // 開始時間が選択されている場合は、その時間から10分後から最大時間まで
  for (let i = startTime ? start + 10 : start; i <= loopEndTime; i += 10) {
    // 予約済みの時間帯はスキップ
    if (!isEndTime && isTimeSlotReserved(i)) {
      continue;
    }
    
    const timeStr = minutesToTime(i);
    times.push(timeStr);
  }
  
  // 終了時間の場合、次の予約開始時間または18:00を追加
  if (isEndTime) {
    const finalTime = minutesToTime(Math.min(nextReservationStart, end));
    if (!times.includes(finalTime)) {
      times.push(finalTime);
    }
  }
  
  return times;
};

export default function ReservationForm({ openDays }: ReservationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  
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
    purposeDetail: "", // その他の場合の詳細
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  // 日付選択の状態
  const [date, setDate] = useState<Date | undefined>(undefined);
  // Popoverの開閉状態
  const [calendarOpen, setCalendarOpen] = useState(false);
  // 予約情報の状態
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [dateReservations, setDateReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [reservationsLoaded, setReservationsLoaded] = useState(false);

  // コンポーネントがマウントされたときに予約情報を取得
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoadingReservations(true);
        
        // 現在の日付を取得
        const today = new Date();
        const startDate = format(today, 'yyyy-MM-dd');
        
        // 3ヶ月後の日付を取得
        const endDate = format(addMonths(today, 3), 'yyyy-MM-dd');
        
        // すべての部屋の予約を取得
        const reservations = await getReservationsForPeriod(startDate, endDate, 'all');
        setAllReservations(reservations);
        setReservationsLoaded(true);
      } catch (error) {
        console.error('予約情報の取得中にエラーが発生しました:', error);
      } finally {
        setIsLoadingReservations(false);
      }
    };
    
    fetchReservations();
  }, []);
  
  // 日付が選択されたときにフォームデータを更新し、その日の予約を表示
  useEffect(() => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`; // YYYY-MM-DD形式
      
      // 日付が変更されたら開始時間と終了時間をリセット
      setFormData(prev => ({
        ...prev,
        startDate: formattedDate,
        startTime: "",
        endTime: ""
      }));
      
      // 選択された日付の予約を表示
      if (reservationsLoaded) {
        const filteredReservations = allReservations.filter(reservation => {
          // 予約の日付を取得（YYYY-MM-DD形式）
          const reservationDate = reservation.start.split('T')[0];
          // 開始時間と終了時間が同じ予約は除外（現在時刻が使われている可能性がある）
          return reservationDate === formattedDate && reservation.startTime !== reservation.endTime;
        }).map(reservation => {
          // UTCからJSTに変換（+9時間）
          const convertToJST = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const jstHours = (hours + 9) % 24;
            return `${jstHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          };
          
          return {
            ...reservation,
            startTime: convertToJST(reservation.startTime),
            endTime: convertToJST(reservation.endTime)
          };
        });
        
        setDateReservations(filteredReservations);
      }
    }
  }, [date, allReservations, reservationsLoaded]);

  // 日付と部屋が選択されたときに予約情報をフィルタリング
  useEffect(() => {
    if (date && formData.roomId && dateReservations.length > 0) {
      // 選択された部屋に基づいてフィルタリング
      const roomFiltered = dateReservations.filter(reservation => {
        const roomIdentifier = reservation.roomIdentifier;
        
        // 4番個室の場合（4番個室_または4番小部屋_）
        if (formData.roomId === 'private4') {
          return roomIdentifier.startsWith('4番個室') || roomIdentifier.startsWith('4番小部屋');
        }
        
        // 6番大部屋または6番工作室の場合（どちらも同時使用できないため、6番のイベントをすべて表示）
        if (formData.roomId === 'large6' || formData.roomId === 'workshop6') {
          return roomIdentifier.startsWith('6番');
        }
        
        return false;
      });
      
      setFilteredReservations(roomFiltered);
    } else {
      // 部屋が選択されていない場合は空の配列をセット
      setFilteredReservations([]);
    }
  }, [date, formData.roomId, dateReservations]);

  // 入力値の変更を処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "roomId") {
      // 部屋IDが変更された場合、部屋名も更新し、開始時間と終了時間をリセット
      const selectedRoom = rooms.find(room => room.id === value);
      setFormData((prev) => ({
        ...prev,
        roomId: value,
        room: selectedRoom ? selectedRoom.name : "",
        startTime: "", // 開始時間をリセット
        endTime: ""    // 終了時間をリセット
      }));
    } else if (name === "startTime") {
      // 開始時間が変更された場合、終了時間をリセット
      setFormData((prev) => ({
        ...prev,
        startTime: value,
        endTime: "" // 終了時間をリセット
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
      // 利用目的の表示名を取得
      const purposeName = formData.purpose === "other"
        ? `その他(${formData.purposeDetail})`
        : purposes.find(p => p.id === formData.purpose)?.name || formData.purpose;

      // カレンダーに予約イベントを追加
      const success = await addBookingToCalendar({
        room: formData.roomId,
        name: formData.contactName,
        startTime: formData.startTime,
        endTime: formData.endTime,
        startDate: formData.startDate,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        count: formData.count,
        purpose: purposeName,
        purposeDetail: formData.purposeDetail
      });

      if (success) {
        // 予約成功時、確認ページへ遷移
        toast.success('予約が完了しました', {
          description: `${formData.room}を${formData.startTime}〜${formData.endTime}で予約しました`,
          duration: 5000,
        });
        
        // 予約情報をURLパラメータとして渡す
        const params = new URLSearchParams({
          room: formData.room,
          date: formData.startDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          count: formData.count.toString(),
          purpose: purposeName,
          name: formData.contactName,
          email: formData.contactEmail,
          phone: formData.contactPhone
        });
        
        router.push(`/booking/confirm?${params.toString()}`);
      } else {
        // エラー処理
        setIsLoading(false);
        toast.error('予約の登録に失敗しました', {
          description: 'もう一度お試しください',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("予約処理中にエラーが発生しました:", error);
      setIsLoading(false);
      toast.error('予約処理中にエラーが発生しました', {
        description: 'もう一度お試しください',
        duration: 5000,
      });
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
      {/* 日付選択 (Date Picker) */}
      <div className="space-y-2">
        <label htmlFor="startDate" className="block font-medium">
          利用日
        </label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
              onSelect={(selectedDate) => {
                // 日付が選択されたらPopoverを閉じる
                if (selectedDate) {
                  setDate(selectedDate);
                  setCalendarOpen(false);
                }
              }}
              locale={ja}
              disabled={day => {
                const today = startOfDay(new Date());
                // 今日より前の日付または開館日以外は選択不可
                return isBefore(day, today) || !isOpenDay(day);
              }}
              fromMonth={new Date()} // 今月から表示
              toMonth={addMonths(new Date(), 3)} // 3ヶ月後まで表示
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>  

      {/* 部屋選択 */}
      <div className="space-y-2">
        <label className="block font-medium">
          利用する部屋
        </label>
        <div className="grid grid-cols-3 gap-4">
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

      {/* 選択された日付と部屋の予約情報 */}
      {date && formData.roomId && filteredReservations.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-medium text-lg">この部屋の予約状況</h3>
          <div className="space-y-2">
            {filteredReservations.map((reservation) => {
              // 部屋名を取得
              const roomName = (() => {
                if (reservation.roomIdentifier.startsWith('4番個室') || reservation.roomIdentifier.startsWith('4番小部屋')) {
                  return '4番個室';
                } else if (reservation.roomIdentifier.startsWith('6番')) {
                  // 6番の場合、工作室かどうかを表示に含める
                  return reservation.roomIdentifier.includes('工作室') ? '6番工作室' : '6番大部屋';
                } else {
                  return reservation.roomIdentifier;
                }
              })();
              
              return (
                <div
                  key={reservation.id}
                  className="p-3 border rounded-md bg-gray-50"
                >
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      {reservation.startTime} 〜 {reservation.endTime}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {roomName}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            ※予約状況は変更される場合があります
          </p>
        </div>
      )}

      {/* 選択された日付の予約情報（部屋が選択されていない場合） */}
      {date && !formData.roomId && dateReservations.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-medium text-lg">この日の予約状況</h3>
          <div className="space-y-2">
            {dateReservations.map((reservation) => {
              // 部屋名を取得
              const roomName = (() => {
                if (reservation.roomIdentifier.startsWith('4番個室') || reservation.roomIdentifier.startsWith('4番小部屋')) {
                  return '4番個室';
                } else if (reservation.roomIdentifier.startsWith('6番')) {
                  // 6番の場合、工作室かどうかを表示に含める
                  return reservation.roomIdentifier.includes('工作室') ? '6番工作室' : '6番大部屋';
                } else {
                  return reservation.roomIdentifier;
                }
              })();
              
              return (
                <div
                  key={reservation.id}
                  className="p-3 border rounded-md bg-gray-50"
                >
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      {reservation.startTime} 〜 {reservation.endTime}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {roomName}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            ※予約状況は変更される場合があります
          </p>
        </div>
      )}

      {date && formData.roomId && reservationsLoaded && filteredReservations.length === 0 && (
        <div className="mt-4 p-3 border rounded-md bg-gray-50">
          <p className="text-center">この部屋の予約はありません</p>
        </div>
      )}

      {date && !formData.roomId && reservationsLoaded && dateReservations.length === 0 && (
        <div className="mt-4 p-3 border rounded-md bg-gray-50">
          <p className="text-center">この日の予約はありません</p>
        </div>
      )}

      {isLoadingReservations && (
        <div className="mt-4 p-3 border rounded-md bg-gray-50">
          <p className="text-center">予約情報を読み込み中...</p>
        </div>
      )}

      {/* 時間選択 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startTime" className="block font-medium">
            開始時間
          </label>
          <select
            id="startTime"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            required
            disabled={!date || !formData.roomId} // 日付と部屋が選択されていない場合は無効化
            className={`w-full rounded-md border border-input px-3 py-2 ${
              !date || !formData.roomId ? 'bg-gray-100 cursor-not-allowed' : 'bg-background'
            }`}
          >
            <option value="">選択してください</option>
            {date && formData.roomId && generateTimeOptions(undefined, false, filteredReservations, formData.startDate).map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {(!date || !formData.roomId) && (
            <p className="text-sm text-gray-500 mt-1">
              ※利用日と部屋を選択すると選択可能になります
            </p>
          )}
        </div>
        {formData.startTime && (
          <div className="space-y-2">
            <label htmlFor="endTime" className="block font-medium">
              終了時間
            </label>
            <select
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">選択してください</option>
              {generateTimeOptions(formData.startTime, true, filteredReservations, formData.startDate).map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        )}
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
        <select
          id="purpose"
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">選択してください</option>
          {purposes.map((purpose) => (
            <option key={purpose.id} value={purpose.id}>
              {purpose.name}
            </option>
          ))}
        </select>
        
        {/* その他が選択された場合のみ詳細入力欄を表示 */}
        {formData.purpose === "other" && (
          <div className="mt-2">
            <label htmlFor="purposeDetail" className="block font-medium">
              詳細な利用目的
            </label>
            <textarea
              id="purposeDetail"
              name="purposeDetail"
              value={formData.purposeDetail}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              rows={3}
            />
          </div>
        )}
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
            placeholder="山田 太郎"
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
            placeholder="email@example.com"
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
            placeholder="090-1234-5678"
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