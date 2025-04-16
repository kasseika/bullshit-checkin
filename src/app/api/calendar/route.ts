import { NextRequest, NextResponse } from 'next/server';
import { google, calendar_v3 } from 'googleapis';

// APIルートの設定
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Google Calendar APIを使用して予約情報を取得

// 部屋の識別子を抽出する関数
function extractRoomIdentifier(title: string): string | null {
  // タイトルからアンダースコア前の部分を抽出
  const match = title.match(/^([^_]+)_/);
  return match ? match[1] : null;
}

// Google Calendar APIのクライアントを初期化
function getCalendarClient(): calendar_v3.Calendar {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  return google.calendar({ version: 'v3', auth });
}

// 日付をHH:MM形式に変換する関数
function formatTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// GET /api/calendar?room=roomId
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータからroomIdを取得
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // 単一のカレンダーIDを使用
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      return NextResponse.json(
        { error: 'Calendar ID not configured' },
        { status: 500 }
      );
    }

    const calendar = getCalendarClient();
    
    // 当日の日付範囲を設定
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // イベントを取得
    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // 予約情報に変換
    const reservations = events
      .filter(event => event.summary) // タイトルがあるイベントのみ
      .map(event => {
        const title = event.summary || '';
        const roomIdentifier = extractRoomIdentifier(title) || '';
        
        // 開始時間と終了時間を取得
        const start = event.start?.dateTime ? new Date(event.start.dateTime) : new Date();
        const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date();
        
        return {
          id: event.id || '',
          title,
          roomIdentifier,
          start: start.toISOString(),
          end: end.toISOString(),
          startTime: formatTimeString(start),
          endTime: formatTimeString(end),
        };
      })
      // 指定された部屋の予約のみをフィルタリング
      .filter(reservation => {
        const identifier = reservation.roomIdentifier;
        
        // 部屋IDに基づいてフィルタリング
        switch (roomId) {
          case 'private4':
            return identifier === '4番個室';
          case 'large4':
            return identifier === '4番大部屋';
          case 'large6':
          case 'studio6':
            // 6番の場合は特殊処理（大部屋と工作室は同時に予約できない）
            return identifier === '6番';
          case 'room1':
            return identifier === '1番';
          case 'tour':
            return identifier === '見学';
          default:
            return false;
        }
      });
    
    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}