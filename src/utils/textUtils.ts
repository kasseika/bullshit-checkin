// 共通の全角数字→半角数字変換ユーティリティ

/**
 * 全角数字（０-９）を半角数字（0-9）に変換する
 * @param text 入力文字列
 * @returns 半角数字に変換された文字列
 */
export function convertFullWidthNumbersToHalfWidth(text: string): string {
  return text.replace(/[０-９]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
  });
}
