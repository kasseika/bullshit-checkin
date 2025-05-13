import { NextResponse } from 'next/server';
import ICAL from 'ical.js';

export const dynamic = "force-static";

// ICSファイルのURL
const CALENDAR_URL = 'https://calendar.google.com/calendar/ical/69a71353ba765dc455c6b111dc58a69251cef3cdc37fb7e81f48e4fd255d63c1%40group.calendar.google.com/public/basic.ics';

// 開館日のイベントタイトル
const OPEN_EVENT_TITLE = '開館';

// 開館日の情報を取得する関数
export async function GET() {
  try {
    // ICSファイルを取得
    const response = await fetch(CALENDAR_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icsData = await response.text();
    
    // ICSデータをパース
    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    // 開館日のみをフィルタリング
    const openDays: string[] = [];
    
    vevents.forEach(vevent => {
      const event = new ICAL.Event(vevent);
      const summary = event.summary;
      
      // 「開館」というタイトルのイベントのみを抽出
      if (summary === OPEN_EVENT_TITLE) {
        // 日付のみを取得（YYYY-MM-DD形式）
        const startDate = event.startDate;
        const dateStr = startDate.toJSDate().toISOString().split('T')[0];
        openDays.push(dateStr);
      }
    });
    
    // 重複を削除して日付順にソート
    const uniqueOpenDays = [...new Set(openDays)].sort();
    
    return NextResponse.json({ openDays: uniqueOpenDays });
  } catch (error) {
    console.error('Error fetching open days:', error);
    return NextResponse.json(
      { error: 'Failed to fetch open days' },
      { status: 500 }
    );
  }
}