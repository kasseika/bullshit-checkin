import * as functions from 'firebase-functions';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { google, calendar_v3 } from 'googleapis';
import { onSchedule } from "firebase-functions/v2/scheduler";

// Firebase初期化
admin.initializeApp();

// 開館日を取得してCloud Storageに保存するスケジュール関数（v2形式）
export const buildOpeningDays = onSchedule({
  schedule: "0 3 1 * *",
  timeZone: "Asia/Tokyo",
  region: "asia-northeast1" // 既存の関数と同じリージョンを指定
}, async (event) => {
  console.log('Starting buildOpeningDays function', event.jobName);
  try {
    // Google Calendar APIのクライアントを初期化（既存の関数を使用）
    const calendar = getCalendarClient();
    console.log('Calendar client initialized');
    
    // カレンダーIDを取得（v2では環境変数の取得方法が異なる場合がある）
    let calendarId;
    try {
      // まずv1の方法で試す
      const config = functions.config();
      if (config.calendar && config.calendar.opening_id) {
        calendarId = config.calendar.opening_id;
      } else {
        // v2の方法で試す
        calendarId = process.env.CALENDAR_OPENING_ID;
      }
      
      if (!calendarId) {
        throw new Error('Opening calendar ID not configured');
      }
      
      console.log(`Using opening calendar ID: ${calendarId}`);
    } catch (error) {
      console.error('Error getting calendar ID:', error);
      throw new Error('Opening calendar ID not configured. Please set calendar.opening_id using firebase functions:config:set');
    }
    
    // 現在の日付から1年後までの範囲を設定
    const now = new Date();
    const end = new Date(now.getFullYear() + 1, 11, 31);
    console.log(`Date range: ${now.toISOString()} to ${end.toISOString()}`);
    
    // イベントを取得
    console.log('Fetching events from Google Calendar...');
    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
    });
    
    // イベントのタイトルをログに出力（最初の10件）
    const events = response.data.items || [];
    console.log(`Found ${events.length} events in calendar`);
    console.log('Event titles (first 10):');
    events.slice(0, 10).forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.summary || '(no title)'}`);
    });
    
    // 現在の月の初日を取得（前月以前のデータを除外するため）
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const currentMonthStr = currentMonth.toISOString().split('T')[0];
    console.log(`Current month start: ${currentMonthStr}`);
    
    // 「開館」イベントのみをフィルタリング
    const openingDays = events
      .filter(event => {
        const isOpeningEvent = event.summary === '開館';
        if (isOpeningEvent) {
          const eventDate = event.start?.date || (event.start?.dateTime ? new Date(event.start.dateTime).toISOString().split('T')[0] : undefined);
          console.log(`Found opening event: ${event.summary}, date: ${eventDate}, original: date=${event.start?.date}, dateTime=${event.start?.dateTime}`);
        }
        return isOpeningEvent;
      })
      .map(event => {
        // 日付を取得（全日イベントの場合はdate、時間指定イベントの場合はdateTimeから日付部分を抽出）
        if (event.start?.date) {
          return event.start.date;
        } else if (event.start?.dateTime) {
          // dateTimeから日付部分（YYYY-MM-DD）を抽出
          return new Date(event.start.dateTime).toISOString().split('T')[0];
        }
        return undefined;
      })
      .filter(date => date !== undefined) as string[];
    
    // 現在の月以降のデータのみを保持
    const filteredOpeningDays = openingDays.filter(date => date >= currentMonthStr);
    
    console.log(`Filtered ${openingDays.length} opening days, keeping ${filteredOpeningDays.length} days from current month onwards`);
    
    // JSONに変換
    const json = JSON.stringify(filteredOpeningDays);
    
    // デバッグ用に開館日データをログに出力
    console.log('Opening days data:', json);
    
    try {
      // Cloud Storageにアップロード
      const bucket = admin.storage().bucket();
      await bucket.file("opening-days/current.json").save(json, {
        contentType: "application/json",
        metadata: { cacheControl: "public,max-age=31536000,immutable" },
        public: true,
      });
      
      console.log('Successfully uploaded opening days to Cloud Storage');
    } catch (storageError) {
      // Cloud Storageへのアップロードに失敗した場合もエラーをログに出力するだけで続行
      console.error('Failed to upload to Cloud Storage:', storageError);
      console.log('Continuing without uploading to Cloud Storage');
    }
    // 戻り値を返さない（void）
  } catch (error) {
    console.error('Error building opening days:', error);
    throw error;
  }
});

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

    // JWTクライアントの設定を修正
    const auth = new google.auth.JWT({
      email: email,
      key: key,
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/devstorage.full_control'],
      subject: email // サービスアカウントの委任を明示的に指定
    });

    // 明示的に認証を行う
    console.log('Initializing JWT auth client with email:', email);

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