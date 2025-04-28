// 開館日を取得するための関数

/**
 * 開館日の配列を取得する
 * @returns 開館日の配列（YYYY-MM-DD形式の文字列）
 */
export async function getOpeningDays(): Promise<string[]> {
  try {
    // Firebase Hostingのrewriteルールで設定したパスからデータを取得
    const response = await fetch('/opening-days-current.json');
    
    if (!response.ok) {
      console.error('Failed to fetch opening days:', response.status, response.statusText);
      return [];
    }
    
    // JSONデータをパース
    const openingDays = await response.json();
    
    // 配列であることを確認
    if (Array.isArray(openingDays)) {
      return openingDays;
    } else {
      console.error('Invalid opening days data format:', openingDays);
      return [];
    }
  } catch (error) {
    console.error('Error fetching opening days:', error);
    return [];
  }
}

/**
 * 指定された日付が開館日かどうかを判定する
 * @param date 判定する日付
 * @param openingDays 開館日の配列
 * @returns 開館日であればtrue、そうでなければfalse
 */
export function isOpeningDay(date: Date, openingDays: string[]): boolean {
  // 日付をYYYY-MM-DD形式の文字列に変換
  const dateStr = date.toISOString().split('T')[0];
  
  // 開館日の配列に含まれているかどうかを判定
  return openingDays.includes(dateStr);
}