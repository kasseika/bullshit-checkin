/**
 * dateUtils.tsのユニットテスト
 */
import {
  formatDateToJST,
  formatDateToJSTWithSlash,
  formatTimeToJST,
  formatDateTimeToJST,
  getJSTTodayStart,
  getJSTTodayEnd,
  getJSTNow,
} from '../dateUtils';

describe('dateUtils', () => {
  // テスト用の固定日時（JST 2024-03-15 14:30:45）
  const testDate = new Date('2024-03-15T05:30:45Z'); // UTC時刻で設定

  describe('formatDateToJST', () => {
    it('日付をJST形式のYYYY-MM-DD文字列に変換する', () => {
      const result = formatDateToJST(testDate);
      expect(result).toBe('2024-03-15');
    });
  });

  describe('formatDateToJSTWithSlash', () => {
    it('日付をJST形式のYYYY/MM/DD文字列に変換する', () => {
      const result = formatDateToJSTWithSlash(testDate);
      expect(result).toBe('2024/03/15');
    });
  });

  describe('formatTimeToJST', () => {
    it('時刻をJST形式のHH:MM文字列に変換する', () => {
      const result = formatTimeToJST(testDate);
      expect(result).toBe('14:30');
    });
  });

  describe('formatDateTimeToJST', () => {
    it('日時をJST形式のYYYY/MM/DD HH:MM文字列に変換する', () => {
      const result = formatDateTimeToJST(testDate);
      expect(result).toBe('2024/03/15 14:30');
    });
  });

  describe('getJSTTodayStart', () => {
    it('JSTの今日の開始時刻（0:00）を取得する', () => {
      const result = getJSTTodayStart();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getJSTTodayEnd', () => {
    it('JSTの今日の終了時刻（23:59:59）を取得する', () => {
      const result = getJSTTodayEnd();
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('getJSTNow', () => {
    it('JSTの現在時刻を取得する', () => {
      const before = new Date();
      const result = getJSTNow();
      const after = new Date();
      
      // 結果が前後の時刻の間にあることを確認
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000); // 1秒の余裕を持たせる
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime() + 1000); // 1秒の余裕を持たせる
    });
  });
});