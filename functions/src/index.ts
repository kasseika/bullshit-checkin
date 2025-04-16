import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google, calendar_v3 } from 'googleapis';

// Firebase初期化
admin.initializeApp();

// 部屋の識別子を抽出する関数
function extractRoomIdentifier(title: string): string | null {
  const match = title.match(/^([^_]+)_/);
  return match ? match[1] : null;
}

// Google Calendar APIのクライアントを初期化
function getCalendarClient(): calendar_v3.Calendar {
  try {
    // Cloud Functionsの環境変数から取得
    const config = functions.config();
    
    if (!config.calendar || !config.calendar.email || !config.calendar.key) {
      throw new Error('Calendar configuration is missing. Please set calendar.email and calendar.key using firebase functions:config:set');
    }
    
    const email = config.calendar.email;
    const key = config.calendar.key.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: email,
      key: key,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('Error initializing calendar client:', error);
    throw error;
  }
}

// 日付をHH:MM形式に変換する関数
function formatTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// Cloud Function: カレンダー予約情報を取得
export const getCalendarReservations = functions
  .region('asia-northeast1') // 東京リージョンを指定
  .https.onCall(async (data, _context: functions.https.CallableContext) => {
  try {
    const roomId = data.room;

    if (!roomId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Room ID is required'
      );
    }

    // 単一のカレンダーIDを使用
    const config = functions.config();
    if (!config.calendar || !config.calendar.id) {
      throw new functions.https.HttpsError(
        'internal',
        'Calendar ID not configured. Please set calendar.id using firebase functions:config:set'
      );
    }
    const calendarId = config.calendar.id;

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
    
    return { reservations };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch reservations'
    );
  }
});

// RESTful APIとしても提供（オプション）
export const getCalendarReservationsApi = functions
  .region('asia-northeast1') // 東京リージョンを指定
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  try {
    const roomId = req.query.room as string;

    if (!roomId) {
      res.status(400).json({ error: 'Room ID is required' });
      return;
    }

    // 単一のカレンダーIDを使用
    const config = functions.config();
    if (!config.calendar || !config.calendar.id) {
      res.status(500).json({ error: 'Calendar ID not configured. Please set calendar.id using firebase functions:config:set' });
      return;
    }
    const calendarId = config.calendar.id;

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
      .filter(event => event.summary)
      .map(event => {
        const title = event.summary || '';
        const roomIdentifier = extractRoomIdentifier(title) || '';
        
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
      .filter(reservation => {
        const identifier = reservation.roomIdentifier;
        
        switch (roomId) {
          case 'private4':
            return identifier === '4番個室';
          case 'large4':
            return identifier === '4番大部屋';
          case 'large6':
          case 'studio6':
            return identifier === '6番';
          case 'room1':
            return identifier === '1番';
          case 'tour':
            return identifier === '見学';
          default:
            return false;
        }
      });
    
    // CORS設定
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({ reservations });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});