/**
 * 日付・時刻に関するユーティリティ関数
 * JSTタイムゾーンの処理を提供
 */

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
  const now = new Date();
  const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  jstDate.setHours(0, 0, 0, 0);
  return jstDate;
}

/**
 * JSTの今日の終了時刻（23:59:59）を取得
 * @returns JSTの今日の23:59:59を表すDate
 */
export function getJSTTodayEnd(): Date {
  const todayStart = getJSTTodayStart();
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  return todayEnd;
}

/**
 * JSTの現在時刻を取得
 * @returns JSTの現在時刻
 */
export function getJSTNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
}