/**
 * chartGeneratorのユニットテスト
 */
import { generateStatisticsImage, StatsData } from '../chartGenerator';

describe('chartGenerator', () => {
  const mockStats: StatsData = {
    ageGroupStats: {
      under20: 5,
      twenties: 10,
      thirties: 15,
      forties: 20,
      fifties: 8,
      over60: 3,
      unknown: 0
    },
    purposeStats: {
      meeting: 12,
      telework: 25,
      study: 8,
      event: 5,
      digital: 3,
      inspection: 2,
      other: 6,
      unknown: 0
    },
    dayOfWeekStats: {
      monday: 10,
      tuesday: 12,
      wednesday: 15,
      thursday: 8,
      friday: 14,
      saturday: 2,
      sunday: 0
    },
    timeSlotStats: {
      morning: 20,
      afternoon: 30,
      evening: 11,
      unknown: 0
    },
    roomStats: {
      "1番": 5,
      "4番個室": 10,
      "4番大部屋": 15,
      "6番大部屋": 20,
      "6番工作室": 8,
      "見学": 3
    },
    participantCountStats: {
      "1": 10,
      "2": 15,
      "3": 8,
      "5": 5,
      "10": 2
    },
    dailyUsersData: [
      { date: '1日', users: 5 },
      { date: '2日', users: 8 },
      { date: '3日', users: 12 },
      { date: '4日', users: 6 },
      { date: '5日', users: 10 }
    ]
  };

  const period = { year: 2025, month: 10 };

  test('統計データから画像を生成できる', async () => {
    const imageBuffer = await generateStatisticsImage(mockStats, period);

    // Bufferが返されることを確認
    expect(imageBuffer).toBeInstanceOf(Buffer);
    expect(imageBuffer.length).toBeGreaterThan(0);

    // PNGヘッダーを確認（\x89PNG）
    expect(imageBuffer[0]).toBe(0x89);
    expect(imageBuffer[1]).toBe(0x50);
    expect(imageBuffer[2]).toBe(0x4e);
    expect(imageBuffer[3]).toBe(0x47);
  }, 30000); // タイムアウトを30秒に設定

  test('空のデータでもエラーにならない', async () => {
    const emptyStats: StatsData = {
      ageGroupStats: {},
      purposeStats: {},
      dayOfWeekStats: {},
      timeSlotStats: {},
      roomStats: {},
      participantCountStats: {},
      dailyUsersData: []
    };

    const imageBuffer = await generateStatisticsImage(emptyStats, period);
    expect(imageBuffer).toBeInstanceOf(Buffer);
    expect(imageBuffer.length).toBeGreaterThan(0);
  }, 30000);

  test('一部のデータのみでも画像を生成できる', async () => {
    const partialStats: StatsData = {
      ageGroupStats: {
        twenties: 10,
        thirties: 15
      },
      purposeStats: {
        telework: 25
      },
      dayOfWeekStats: {},
      timeSlotStats: {},
      roomStats: {},
      participantCountStats: {},
      dailyUsersData: [
        { date: '1日', users: 5 }
      ]
    };

    const imageBuffer = await generateStatisticsImage(partialStats, period);
    expect(imageBuffer).toBeInstanceOf(Buffer);
    expect(imageBuffer.length).toBeGreaterThan(0);
  }, 30000);
});
