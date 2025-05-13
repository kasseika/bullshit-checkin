import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";
import ICAL from 'ical.js';
import ClientCalendar from "./ClientCalendar";

// ICSファイルのURL
const CALENDAR_URL = 'https://calendar.google.com/calendar/ical/69a71353ba765dc455c6b111dc58a69251cef3cdc37fb7e81f48e4fd255d63c1%40group.calendar.google.com/public/basic.ics';

// 開館日のイベントタイトル
const OPEN_EVENT_TITLE = '開館';

// 開館日の情報を取得する関数
async function getOpenDays(): Promise<Date[]> {
  try {
    // ICSファイルを取得
    const response = await fetch(CALENDAR_URL, { next: { revalidate: 86400 } }); // 1日ごとに再検証
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icsData = await response.text();
    
    // ICSデータをパース
    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    // 開館日のみをフィルタリング
    const openDays: Date[] = [];
    
    vevents.forEach(vevent => {
      const event = new ICAL.Event(vevent);
      const summary = event.summary;
      
      // 「開館」というタイトルのイベントのみを抽出
      if (summary === OPEN_EVENT_TITLE) {
        // 日付を取得
        const startDate = event.startDate;
        const date = startDate.toJSDate();
        openDays.push(date);
      }
    });
    
    return openDays;
  } catch (error) {
    console.error('Error fetching open days:', error);
    return [];
  }
}

// サーバーコンポーネント
async function WelcomeContent() {
  // 開館日を取得
  const openDays = await getOpenDays();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-2">大船渡テレワークセンター</h1>
      <h2 className="text-2xl font-bold mb-8">予約システム</h2>
      
      <Card className="w-full max-w-md mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <ClientCalendar openDays={openDays} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <WelcomeContent />
    </Suspense>
  );
}