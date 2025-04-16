// 予約情報の型定義
export interface Reservation {
  id: string;
  title: string;
  roomIdentifier: string;
  start: string;
  end: string;
  startTime: string; // HH:MM形式
  endTime: string;   // HH:MM形式
}

// 部屋の識別子を抽出する関数
export function extractRoomIdentifier(title: string): string | null {
  // タイトルからアンダースコア前の部分を抽出
  const match = title.match(/^([^_]+)_/);
  return match ? match[1] : null;
}

// 特定の部屋の当日の予約を取得する関数
export async function getTodayReservations(roomId: string): Promise<Reservation[]> {
  try {
    // サーバーサイドAPIを呼び出す
    const response = await fetch(`/api/calendar?room=${roomId}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.reservations || [];
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
}

// 特定の部屋の予約が可能かどうかを確認する関数
export async function isRoomAvailable(roomId: string, startTime: string, endTime: string): Promise<boolean> {
  try {
    const reservations = await getTodayReservations(roomId);
    
    // 文字列の時間をDateオブジェクトに変換
    const parseTime = (timeStr: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    // 予約時間が重複するかどうかをチェック
    const hasOverlap = reservations.some(reservation => {
      const resStart = new Date(reservation.start);
      const resEnd = new Date(reservation.end);
      
      return (
        (start >= resStart && start < resEnd) ||
        (end > resStart && end <= resEnd) ||
        (start <= resStart && end >= resEnd)
      );
    });
    
    return !hasOverlap;
  } catch (error) {
    console.error('Error checking room availability:', error);
    return false;
  }
}