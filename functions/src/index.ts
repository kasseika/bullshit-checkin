import * as functions from 'firebase-functions';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { google, calendar_v3 } from 'googleapis';
import axios from 'axios';

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
      scopes: ['https://www.googleapis.com/auth/calendar'],
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
export const getCalendarReservations = functions.region('asia-northeast1').https.onCall(async (data, context) => {
  // ログ情報を格納する配列
  const logs: string[] = [];
  logs.push(`Function called with room: ${data.room}`);
  logs.push(`Auth: ${context.auth ? 'Authenticated' : 'Not authenticated'}`);
  if (context.auth) {
    logs.push(`User ID: ${context.auth.uid}`);
  }
  
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
    logs.push(`Using calendar ID: ${calendarId}`);

    const calendar = getCalendarClient();
    logs.push('Calendar client initialized');
    
    // 当日の日付範囲を設定
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    logs.push(`Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // イベントを取得
    logs.push('Fetching events from Google Calendar...');
    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    logs.push(`Found ${events.length} events in calendar`);
    
    // 予約情報に変換
    logs.push('Processing events...');
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
    
    logs.push(`Filtered ${reservations.length} reservations for room ${roomId}`);
    return { reservations, logs };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Error: ${errorMessage}`);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch reservations',
      { error: errorMessage, logs }
    );
  }
});

// RESTful APIとしても提供（オプション）
export const getCalendarReservationsApi = functions.region('asia-northeast1').https.onRequest(async (req: express.Request, res: express.Response) => {
  // ログ情報を格納する配列
  const logs: string[] = [];
  logs.push(`API called with room: ${req.query.room}`);
  
  try {
    const roomId = req.query.room as string;

    if (!roomId) {
      logs.push('Error: Room ID is required');
      res.status(400).json({ error: 'Room ID is required', logs });
      return;
    }

    // 単一のカレンダーIDを使用
    const config = functions.config();
    if (!config.calendar || !config.calendar.id) {
      logs.push('Error: Calendar ID not configured');
      res.status(500).json({
        error: 'Calendar ID not configured. Please set calendar.id using firebase functions:config:set',
        logs
      });
      return;
    }
    const calendarId = config.calendar.id;
    logs.push(`Using calendar ID: ${calendarId}`);

    const calendar = getCalendarClient();
    logs.push('Calendar client initialized');
    
    // 当日の日付範囲を設定
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    logs.push(`Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // イベントを取得
    logs.push('Fetching events from Google Calendar...');
    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    logs.push(`Found ${events.length} events in calendar`);
    
    // 予約情報に変換
    logs.push('Processing events...');
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
    
    logs.push(`Filtered ${reservations.length} reservations for room ${roomId}`);
    
    // CORS設定
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({ reservations, logs });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Error: ${errorMessage}`);
    res.status(500).json({ error: 'Failed to fetch reservations', errorDetails: errorMessage, logs });
  }
});

// Cloud Function: カレンダーにチェックインイベントを追加
export const addCalendarEvent = functions.region('asia-northeast1').https.onCall(async (data) => {
  // ログ情報を格納する配列
  const logs: string[] = [];
  logs.push(`Function called with room: ${data.room}, startTime: ${data.startTime}, endTime: ${data.endTime}`);
  
  try {
    const { room, startTime, endTime } = data;

    if (!room || !startTime || !endTime) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Room ID, start time, and end time are required'
      );
    }

    // 部屋IDに基づいてイベントタイトルを設定
    let eventTitle = '';
    logs.push(`Setting event title for room: ${room}`);
    
    // getCalendarReservations関数と同じ部屋IDの処理を使用
    switch (room) {
      case 'private4':
        eventTitle = '4番個室_当日チェックイン';
        logs.push(`Event title set to: ${eventTitle}`);
        break;
      case 'large6':
        // 6番大部屋の場合は「6番_当日チェックイン」というタイトルを使用
        // これはgetCalendarReservations関数で「6番」という識別子でフィルタリングされる
        eventTitle = '6番_当日チェックイン';
        logs.push(`Event title set to: ${eventTitle}`);
        break;
      default:
        const errorMsg = `Invalid room ID: ${room}. Only private4 and large6 are supported for automatic check-in.`;
        logs.push(`Error: ${errorMsg}`);
        throw new functions.https.HttpsError(
          'invalid-argument',
          errorMsg
        );
    }

    // カレンダーIDを取得
    const config = functions.config();
    if (!config.calendar || !config.calendar.id) {
      throw new functions.https.HttpsError(
        'internal',
        'Calendar ID not configured. Please set calendar.id using firebase functions:config:set'
      );
    }
    const calendarId = config.calendar.id;
    logs.push(`Using calendar ID: ${calendarId}`);

    // Google Calendar APIクライアントを初期化
    const calendar = getCalendarClient();
    logs.push('Calendar client initialized');
    
    // 当日の日付を取得
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    
    // 開始時刻と終了時刻を解析
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    logs.push(`Input times - Start: ${startHour}:${startMinute}, End: ${endHour}:${endMinute}`);
    
    // タイムゾーンを考慮した日時文字列を作成（JSTとして扱う）
    // 注意: JSTはUTC+9なので、UTCに変換する必要はない
    const startDateTimeStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+09:00`;
    const endDateTimeStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+09:00`;
    
    logs.push(`Event time (JST): ${startDateTimeStr} to ${endDateTimeStr}`);
    
    // イベントを作成
    const event = {
      summary: eventTitle,
      start: {
        dateTime: startDateTimeStr,  // JSTのタイムゾーン情報を含む文字列
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDateTimeStr,    // JSTのタイムゾーン情報を含む文字列
        timeZone: 'Asia/Tokyo',
      },
      description: '端末からのチェックインによる自動予約',
    };
    
    // カレンダーにイベントを追加
    logs.push('Adding event to Google Calendar...');
    logs.push(`Event details: ${JSON.stringify(event)}`);
    
    let eventId = '';
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      
      eventId = response.data.id || '';
      logs.push(`Event created with ID: ${eventId}`);
    } catch (insertError) {
      const errorMessage = insertError instanceof Error ? insertError.message : 'Unknown error';
      logs.push(`Error inserting event: ${errorMessage}`);
      if (insertError instanceof Error && 'response' in insertError) {
        // @ts-expect-error Google API error response structure
        const responseData = insertError.response?.data;
        if (responseData) {
          logs.push(`API Error details: ${JSON.stringify(responseData)}`);
        }
      }
      throw insertError;
    }
    return {
      success: true,
      eventId: eventId,
      logs
    };
  } catch (error) {
    console.error('Error adding calendar event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Error: ${errorMessage}`);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to add calendar event',
      { error: errorMessage, logs }
    );
  }
});

// Cloud Function: 予約イベントをカレンダーに追加
export const addBookingEvent = functions.region('asia-northeast1').https.onCall(async (data) => {
  // ログ情報を格納する配列
  const logs: string[] = [];
  logs.push(`Function called with room: ${data.room}, name: ${data.name}, startTime: ${data.startTime}, endTime: ${data.endTime}`);
  
  try {
    const { room, name, startTime, endTime, startDate, contactPhone, contactEmail, count, purpose } = data;

    if (!room || !name || !startTime || !endTime || !startDate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '部屋、名前、開始時間、終了時間、日付は必須です'
      );
    }

    // 部屋IDに基づいてイベントタイトルを設定
    let roomName = '';
    logs.push(`Setting event title for room: ${room}`);
    
    // 部屋IDから表示名を取得
    switch (room) {
      case 'private4':
        roomName = '4番個室';
        break;
      case 'large6':
        roomName = '6番大部屋';
        break;
      case 'workshop6':
        roomName = '6番工作室';
        break;
      default:
        const errorMsg = `無効な部屋ID: ${room}`;
        logs.push(`Error: ${errorMsg}`);
        throw new functions.https.HttpsError(
          'invalid-argument',
          errorMsg
        );
    }

    // イベントタイトルを設定: {部屋名}_{名前}様
    const eventTitle = `${roomName}_${name}様`;
    logs.push(`Event title set to: ${eventTitle}`);

    // 詳細欄の内容を作成
    let description = '';
    if (contactPhone) description += `tel:${contactPhone}\n`;
    if (contactEmail) description += `email:${contactEmail}\n`;
    if (count) description += `利用人数:${count}\n`;
    if (purpose) description += `利用目的:${purpose}\n`;
    // purposeDetailは利用目的に含まれているので追加しない

    // カレンダーIDを取得
    const config = functions.config();
    if (!config.calendar || !config.calendar.id) {
      throw new functions.https.HttpsError(
        'internal',
        'Calendar ID not configured. Please set calendar.id using firebase functions:config:set'
      );
    }
    const calendarId = config.calendar.id;
    logs.push(`Using calendar ID: ${calendarId}`);

    // Google Calendar APIクライアントを初期化
    const calendar = getCalendarClient();
    logs.push('Calendar client initialized');
    
    // 日付を解析
    const [year, month, day] = startDate.split('-').map(Number);
    
    // 開始時刻と終了時刻を解析
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    logs.push(`Input times - Date: ${year}-${month}-${day}, Start: ${startHour}:${startMinute}, End: ${endHour}:${endMinute}`);
    
    // タイムゾーンを考慮した日時文字列を作成（JSTとして扱う）
    const startDateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+09:00`;
    const endDateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+09:00`;
    
    logs.push(`Event time (JST): ${startDateTimeStr} to ${endDateTimeStr}`);
    
    // イベントを作成
    const event = {
      summary: eventTitle,
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Asia/Tokyo',
      },
      description: description,
    };
    
    // カレンダーにイベントを追加
    logs.push('Adding event to Google Calendar...');
    logs.push(`Event details: ${JSON.stringify(event)}`);
    
    let eventId = '';
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      
      eventId = response.data.id || '';
      logs.push(`Event created with ID: ${eventId}`);
    } catch (insertError) {
      const errorMessage = insertError instanceof Error ? insertError.message : 'Unknown error';
      logs.push(`Error inserting event: ${errorMessage}`);
      if (insertError instanceof Error && 'response' in insertError) {
        // @ts-expect-error Google API error response structure
        const responseData = insertError.response?.data;
        if (responseData) {
          logs.push(`API Error details: ${JSON.stringify(responseData)}`);
        }
      }
      throw insertError;
    }
    return {
      success: true,
      eventId: eventId,
      logs
    };
  } catch (error) {
    console.error('Error adding booking event to calendar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Error: ${errorMessage}`);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to add booking event to calendar',
      { error: errorMessage, logs }
    );
  }
});

// Cloud Function: カレンダーの予約の終了時間を更新
export const updateCalendarEvent = functions.region('asia-northeast1').https.onCall(async (data) => {
  // ログ情報を格納する配列
  const logs: string[] = [];
  logs.push(`Function called with eventId: ${data.eventId}, endTime: ${data.endTime}`);
  
  try {
    const { eventId, endTime } = data;

    if (!eventId || !endTime) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Event ID and end time are required'
      );
    }

    // カレンダーIDを取得
    const config = functions.config();
    if (!config.calendar || !config.calendar.id) {
      throw new functions.https.HttpsError(
        'internal',
        'Calendar ID not configured. Please set calendar.id using firebase functions:config:set'
      );
    }
    const calendarId = config.calendar.id;
    logs.push(`Using calendar ID: ${calendarId}`);

    // Google Calendar APIクライアントを初期化
    const calendar = getCalendarClient();
    logs.push('Calendar client initialized');
    
    // まず、イベントを取得
    logs.push(`Fetching event with ID: ${eventId}`);
    const getResponse = await calendar.events.get({
      calendarId,
      eventId,
    });
    
    const event = getResponse.data;
    if (!event) {
      throw new functions.https.HttpsError(
        'not-found',
        `Event with ID ${eventId} not found`
      );
    }
    
    logs.push(`Event found: ${event.summary}`);
    
    // 当日の日付を取得
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    
    // 終了時刻を解析
    const [endHour, endMinute] = endTime.split(':').map(Number);
    logs.push(`New end time: ${endHour}:${endMinute}`);
    
    // タイムゾーンを考慮した日時文字列を作成（JSTとして扱う）
    const endDateTimeStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+09:00`;
    logs.push(`New end time (JST): ${endDateTimeStr}`);
    
    // イベントの終了時間を更新
    const updatedEvent = {
      ...event,
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Asia/Tokyo',
      },
    };
    
    // カレンダーのイベントを更新
    logs.push('Updating event in Google Calendar...');
    logs.push(`Updated event details: ${JSON.stringify(updatedEvent)}`);
    
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: updatedEvent,
      });
      
      logs.push(`Event updated successfully. Updated ID: ${response.data.id}`);
    } catch (updateError) {
      const errorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';
      logs.push(`Error updating event: ${errorMessage}`);
      if (updateError instanceof Error && 'response' in updateError) {
        // @ts-expect-error Google API error response structure
        const responseData = updateError.response?.data;
        if (responseData) {
          logs.push(`API Error details: ${JSON.stringify(responseData)}`);
        }
      }
      throw updateError;
    }
    
    return {
      success: true,
      eventId: eventId,
      logs
    };
  } catch (error) {
    console.error('Error updating calendar event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Error: ${errorMessage}`);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to update calendar event',
      { error: errorMessage, logs }
    );
  }
});
// Google ChatにWebhookを送信するCloud Function
export const sendCheckinNotification = functions.region('asia-northeast1')
  .firestore.document('checkins/{checkinId}')
  .onCreate(async (snapshot, context) => {
    // ログ情報を格納する配列
    const logs: string[] = [];
    logs.push(`Function called for checkin ID: ${context.params.checkinId}`);
    
    try {
      // 設定からWebhook URLを取得
      const config = functions.config();
      if (!config.chat || !config.chat.webhook_url) {
        throw new Error('Webhook URL not configured. Please set chat.webhook_url using firebase functions:config:set');
      }
      const webhookUrl = config.chat.webhook_url;
      logs.push(`Using webhook URL from config`);
      
      // チェックインデータを取得
      const data = snapshot.data();
      logs.push(`Got checkin data: ${JSON.stringify(data)}`);
      
      // 部屋名のマッピング
      const roomNames: Record<string, string> = {
        "room1": "1番",
        "private4": "4番個室",
        "large4": "4番大部屋",
        "large6": "6番大部屋",
        "studio6": "6番工作室",
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
      
      // チェックイン時刻をフォーマット
      const checkInTime = data.clientCheckInTime ? new Date(data.clientCheckInTime) : new Date();
      const formattedTime = `${checkInTime.getFullYear()}年${checkInTime.getMonth() + 1}月${checkInTime.getDate()}日 ${checkInTime.getHours().toString().padStart(2, '0')}:${checkInTime.getMinutes().toString().padStart(2, '0')}`;
      
      // 通知メッセージを作成
      const message = {
        text: `📣 テレワークセンターに新しいチェックインがありました！\n\n` +
          `📅 チェックイン時刻: ${formattedTime}\n` +
          `🏢 利用部屋: ${roomNames[data.room] || data.room}\n` +
          `⏰ 利用時間: ${data.startTime} 〜 ${data.endTime}\n` +
          `👥 利用人数: ${data.count}人\n` +
          `🎯 利用目的: ${purposeNames[data.purpose] || data.purpose}\n` +
          `👴 年代: ${data.ageGroup}\n` +
          `${data.reservationId ? '🔖 予約ID: ' + data.reservationId : '🆓 予約なし'}`
      };
      
      logs.push(`Sending message to Google Chat: ${JSON.stringify(message)}`);
      
      await axios.post(webhookUrl, message);
      await axios.post(webhookUrl, message);
      
      logs.push('Notification sent successfully');
      return { success: true, logs };
    } catch (error) {
      console.error('Error sending checkin notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Error: ${errorMessage}`);
      return { success: false, error: errorMessage, logs };
    }
  });

// Cloud Function: 指定された期間のカレンダー予約情報を取得
export const getCalendarReservationsForPeriod = functions.region('asia-northeast1').https.onCall(async (data, context) => {
  // ログ情報を格納する配列
  const logs: string[] = [];
  logs.push(`Function called with room: ${data.room}, startDate: ${data.startDate}, endDate: ${data.endDate}`);
  logs.push(`Auth: ${context.auth ? 'Authenticated' : 'Not authenticated'}`);
  if (context.auth) {
    logs.push(`User ID: ${context.auth.uid}`);
  }
  
  try {
    const { room: roomId, startDate, endDate } = data;

    if (!roomId || !startDate || !endDate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Room ID, start date, and end date are required'
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
    logs.push(`Using calendar ID: ${calendarId}`);

    const calendar = getCalendarClient();
    logs.push('Calendar client initialized');
    
    // 指定された日付範囲を設定
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    logs.push(`Date range: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);

    // イベントを取得
    logs.push('Fetching events from Google Calendar...');
    const response = await calendar.events.list({
      calendarId,
      timeMin: startDateTime.toISOString(),
      timeMax: endDateTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    logs.push(`Found ${events.length} events in calendar`);
    
    // 予約情報に変換
    logs.push('Processing events...');
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
          date: start.toISOString().split('T')[0], // YYYY-MM-DD形式の日付
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
          case 'all':
            // すべての部屋の予約を返す
            return true;
          default:
            return false;
        }
      });
    
    logs.push(`Filtered ${reservations.length} reservations for room ${roomId}`);
    return { reservations, logs };
  } catch (error) {
    console.error('Error fetching reservations for period:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Error: ${errorMessage}`);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch reservations for period',
      { error: errorMessage, logs }
    );
  }
});
