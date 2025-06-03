/**
 * 日付・時刻に関するユーティリティ関数
 * JSTタイムゾーンの処理を提供
 */

// JSTオフセット（UTC+9時間）をミリ秒単位で定義
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 日付をJST形式の文字列に変換
 * @param date 変換する日付
 * @returns JST形式の日付文字列 (YYYY-MM-DD)
 */
export function formatDateToJST(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
}

/**
 * 日付をJST形式のスラッシュ区切り文字列に変換
 * @param date 変換する日付
 * @returns JST形式の日付文字列 (YYYY/MM/DD)
 */
export function formatDateToJSTWithSlash(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 時刻をJST形式の文字列に変換
 * @param date 変換する日時
 * @returns JST形式の時刻文字列 (HH:MM)
 */
export function formatTimeToJST(date: Date): string {
  return date.toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 日時をJST形式の文字列に変換
 * @param date 変換する日時
 * @returns JST形式の日時文字列 (YYYY/MM/DD HH:MM)
 */
export function formatDateTimeToJST(date: Date): string {
  return `${formatDateToJSTWithSlash(date)} ${formatTimeToJST(date)}`;
}

/**
 * JSTの今日の開始時刻（0:00）を取得
 * @returns JSTの今日の0:00を表すDate
 */
export function getJSTTodayStart(): Date {
  // 現在のUTC時刻を取得
  const now = new Date();
  // JSTオフセット（+9時間）を適用
  const jstTime = new Date(now.getTime() + JST_OFFSET_MS);
  
  // JST基準で日付の開始時刻を計算
  const year = jstTime.getUTCFullYear();
  const month = jstTime.getUTCMonth();
  const date = jstTime.getUTCDate();
  
  // UTC時刻でJSTの0:00を表現（UTC時刻では前日の15:00）
  return new Date(Date.UTC(year, month, date) - JST_OFFSET_MS);
}

/**
 * JSTの今日の終了時刻（23:59:59）を取得
 * @returns JSTの今日の23:59:59を表すDate
 */
export function getJSTTodayEnd(): Date {
  const todayStart = getJSTTodayStart();
  // 23時間59分59秒999ミリ秒を追加
  return new Date(todayStart.getTime() + (24 * 60 * 60 * 1000) - 1);
}

/**
 * 現在時刻を取得
 * @returns 現在時刻（Date objects are internally managed in UTC. Use formatters like toLocaleString for JST display）
 */
export function getCurrentTime(): Date {
  // 現在のUTC時刻をそのまま返す（DateオブジェクトはUTCで内部管理される）
  // 表示する際にtoLocaleString等でJSTに変換する
  return new Date();
}