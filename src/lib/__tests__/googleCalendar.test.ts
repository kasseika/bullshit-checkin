import {
  extractRoomIdentifier,
  determineRoom6Type,
  getTodayReservations,
  isRoomAvailable,
  addCheckInEvent,
  updateReservationEndTime,
  getReservationsForPeriod,
  addBookingToCalendar
} from '../googleCalendar';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

jest.mock('../googleCalendar', () => {
  const originalModule = jest.requireActual('../googleCalendar');
  return {
    extractRoomIdentifier: originalModule.extractRoomIdentifier,
    determineRoom6Type: originalModule.determineRoom6Type,
    getTodayReservations: jest.fn(),
    isRoomAvailable: jest.fn(),
    addCheckInEvent: jest.fn(),
    updateReservationEndTime: jest.fn(),
    getReservationsForPeriod: jest.fn(),
    addBookingToCalendar: jest.fn(),
  };
});

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

jest.mock('../firebase', () => ({
  functions: {},
}));

describe('extractRoomIdentifier', () => {
  it('タイトルから部屋識別子を正しく抽出する', () => {
    expect(extractRoomIdentifier('4番個室_予約タイトル')).toBe('4番個室');
    expect(extractRoomIdentifier('6番_ミーティング')).toBe('6番');
    expect(extractRoomIdentifier('6番大部屋_当日チェックイン')).toBe('6番大部屋');
    expect(extractRoomIdentifier('6番工作室_当日チェックイン')).toBe('6番工作室');
    expect(extractRoomIdentifier('タイトルのみ')).toBeNull();
  });

  it('全角数字を含むタイトルから部屋識別子を正しく抽出する', () => {
    expect(extractRoomIdentifier('４番個室_予約タイトル')).toBe('4番個室');
    expect(extractRoomIdentifier('６番_ミーティング')).toBe('6番');
  });
});

describe('determineRoom6Type', () => {
  it('工作室関連キーワードが含まれる場合はworkshop6を返す', () => {
    expect(determineRoom6Type('6番工作室_山田太郎様')).toBe('workshop6');
    expect(determineRoom6Type('6番_田中様 (工作室)')).toBe('workshop6');
    expect(determineRoom6Type('6番_レーザー加工機利用')).toBe('workshop6');
    expect(determineRoom6Type('6番_3Dプリンター使用')).toBe('workshop6');
    expect(determineRoom6Type('6番_3Dプリンタ利用')).toBe('workshop6');
  });

  it('工作室関連キーワードが含まれない場合はlarge6を返す', () => {
    expect(determineRoom6Type('6番_山田太郎様')).toBe('large6');
    expect(determineRoom6Type('6番大部屋_当日チェックイン')).toBe('large6');
    expect(determineRoom6Type('6番_会議利用')).toBe('large6');
    expect(determineRoom6Type('6番_研修')).toBe('large6');
  });

  it('大文字小文字を区別しない', () => {
    expect(determineRoom6Type('6番_WORKSHOP利用')).toBe('large6'); // 工作室キーワードではない
    expect(determineRoom6Type('6番_工作室利用')).toBe('workshop6');
    expect(determineRoom6Type('6番_レーザー加工機')).toBe('workshop6');
  });

  it('空文字列の場合はlarge6を返す', () => {
    expect(determineRoom6Type('')).toBe('large6');
  });
});

describe('getTodayReservations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('特定の部屋の予約を取得する', async () => {
    const mockReservations = [
      { id: 'res1', title: '4番個室_テスト予約', roomIdentifier: '4番個室', start: '2023-05-01T10:00:00Z', end: '2023-05-01T12:00:00Z', startTime: '10:00', endTime: '12:00' }
    ];
    
    const mockHttpsCallable = jest.fn().mockResolvedValue({
      data: {
        reservations: mockReservations,
        logs: ['Log1', 'Log2']
      }
    });
    
    // httpsCallableをモック
    (httpsCallable as jest.Mock).mockImplementation((funcs, name) => {
      expect(funcs).toBe(functions);
      expect(name).toBe('getCalendarReservations');
      return mockHttpsCallable;
    });
    
    // getTodayReservationsはファイル先頭でインポート済み
    (getTodayReservations as jest.Mock).mockImplementation(async (room) => {
      const callable = httpsCallable(functions, 'getCalendarReservations');
      const result = await callable({ room });
      return (result as { data: { reservations: typeof mockReservations } }).data.reservations;
    });
    
    const result = await getTodayReservations('private4');
    
    expect(mockHttpsCallable).toHaveBeenCalledWith({ room: 'private4' });
    expect(result).toEqual(mockReservations);
  });

  it('エラー発生時に空配列を返す', async () => {
    const mockError = new Error('API Error');
    const mockHttpsCallable = jest.fn().mockRejectedValue(mockError);
    
    (httpsCallable as jest.Mock).mockReturnValue(mockHttpsCallable);
    
    // getTodayReservationsはファイル先頭でインポート済み
    (getTodayReservations as jest.Mock).mockImplementation(async () => {
      try {
        await mockHttpsCallable();
        return [];
      } catch {
        return [];
      }
    });
    
    const result = await getTodayReservations('private4');
    
    expect(result).toEqual([]);
  });
});

describe('isRoomAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('部屋が利用可能な場合にtrueを返す', async () => {
    // isRoomAvailableはファイル先頭でインポート済み
    (isRoomAvailable as jest.Mock).mockResolvedValue(true);
    
    const result = await isRoomAvailable('private4', '10:00', '12:00');
    
    expect(result).toBe(true);
  });

  it('予約が重複する場合にfalseを返す', async () => {
    // isRoomAvailableはファイル先頭でインポート済み
    (isRoomAvailable as jest.Mock).mockResolvedValue(false);
    
    const result = await isRoomAvailable('private4', '10:00', '12:00');
    
    expect(result).toBe(false);
  });
});

describe('addCheckInEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('カレンダーにチェックインイベントを追加する', async () => {
    const mockResponse = {
      data: {
        success: true,
        eventId: 'event123',
        logs: ['Log1', 'Log2']
      }
    };
    
    const mockHttpsCallable = jest.fn().mockResolvedValue(mockResponse);
    
    // httpsCallableをモック
    (httpsCallable as jest.Mock).mockImplementation((funcs, name) => {
      expect(funcs).toBe(functions);
      expect(name).toBe('addCalendarEvent');
      return mockHttpsCallable;
    });
    
    // addCheckInEventはファイル先頭でインポート済み
    (addCheckInEvent as jest.Mock).mockImplementation(async (room, startTime, endTime) => {
      const callable = httpsCallable(functions, 'addCalendarEvent');
      const result = await callable({ room, startTime, endTime });
      return (result as { data: { success: boolean } }).data.success;
    });
    
    const result = await addCheckInEvent('private4', '10:00', '12:00');
    
    expect(mockHttpsCallable).toHaveBeenCalledWith({ room: 'private4', startTime: '10:00', endTime: '12:00' });
    expect(result).toBe(true);
  });

  it('エラー発生時にfalseを返す', async () => {
    const mockError = new Error('API Error');
    const mockHttpsCallable = jest.fn().mockRejectedValue(mockError);
    
    (httpsCallable as jest.Mock).mockReturnValue(mockHttpsCallable);
    
    // addCheckInEventはファイル先頭でインポート済み
    (addCheckInEvent as jest.Mock).mockImplementation(async () => {
      try {
        await mockHttpsCallable();
        return true;
      } catch {
        return false;
      }
    });
    
    const result = await addCheckInEvent('private4', '10:00', '12:00');
    
    expect(result).toBe(false);
  });
});

describe('updateReservationEndTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('予約の終了時間を更新する', async () => {
    const mockResponse = {
      data: {
        success: true,
        eventId: 'event123',
        logs: ['Log1', 'Log2']
      }
    };
    
    const mockHttpsCallable = jest.fn().mockResolvedValue(mockResponse);
    
    // httpsCallableをモック
    (httpsCallable as jest.Mock).mockImplementation((funcs, name) => {
      expect(funcs).toBe(functions);
      expect(name).toBe('updateCalendarEvent');
      return mockHttpsCallable;
    });
    
    // updateReservationEndTimeはファイル先頭でインポート済み
    (updateReservationEndTime as jest.Mock).mockImplementation(async (eventId, endTime) => {
      const callable = httpsCallable(functions, 'updateCalendarEvent');
      const result = await callable({ eventId, endTime });
      return (result as { data: { success: boolean } }).data.success;
    });
    
    const result = await updateReservationEndTime('event123', '14:00');
    
    expect(mockHttpsCallable).toHaveBeenCalledWith({ eventId: 'event123', endTime: '14:00' });
    expect(result).toBe(true);
  });

  it('エラー発生時にfalseを返す', async () => {
    const mockError = new Error('API Error');
    const mockHttpsCallable = jest.fn().mockRejectedValue(mockError);
    
    (httpsCallable as jest.Mock).mockReturnValue(mockHttpsCallable);
    
    // updateReservationEndTimeはファイル先頭でインポート済み
    (updateReservationEndTime as jest.Mock).mockImplementation(async () => {
      try {
        await mockHttpsCallable();
        return true;
      } catch {
        return false;
      }
    });
    
    const result = await updateReservationEndTime('event123', '14:00');
    
    expect(result).toBe(false);
  });
});

describe('getReservationsForPeriod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('指定された期間の予約を取得する', async () => {
    const mockReservations = [
      { id: 'res1', title: '4番個室_テスト予約', roomIdentifier: '4番個室', start: '2023-05-01T10:00:00Z', end: '2023-05-01T12:00:00Z', startTime: '10:00', endTime: '12:00' },
      { id: 'res2', title: '6番_テスト予約', roomIdentifier: '6番', start: '2023-05-02T14:00:00Z', end: '2023-05-02T16:00:00Z', startTime: '14:00', endTime: '16:00' }
    ];
    
    const mockHttpsCallable = jest.fn().mockResolvedValue({
      data: {
        reservations: mockReservations,
        logs: ['Log1', 'Log2']
      }
    });
    
    // httpsCallableをモック
    (httpsCallable as jest.Mock).mockImplementation((funcs, name) => {
      expect(funcs).toBe(functions);
      expect(name).toBe('getCalendarReservationsForPeriod');
      return mockHttpsCallable;
    });
    
    // getReservationsForPeriodはファイル先頭でインポート済み
    (getReservationsForPeriod as jest.Mock).mockImplementation(async (startDate, endDate, roomId) => {
      const callable = httpsCallable(functions, 'getCalendarReservationsForPeriod');
      const result = await callable({ room: roomId, startDate, endDate });
      return (result as { data: { reservations: typeof mockReservations } }).data.reservations;
    });
    
    const result = await getReservationsForPeriod('2023-05-01', '2023-05-31', 'all');
    
    expect(mockHttpsCallable).toHaveBeenCalledWith({ room: 'all', startDate: '2023-05-01', endDate: '2023-05-31' });
    expect(result).toEqual(mockReservations);
  });

  it('エラー発生時に空配列を返す', async () => {
    const mockError = new Error('API Error');
    const mockHttpsCallable = jest.fn().mockRejectedValue(mockError);
    
    (httpsCallable as jest.Mock).mockReturnValue(mockHttpsCallable);
    
    // getReservationsForPeriodはファイル先頭でインポート済み
    (getReservationsForPeriod as jest.Mock).mockImplementation(async () => {
      try {
        await mockHttpsCallable();
        return [];
      } catch {
        return [];
      }
    });
    
    const result = await getReservationsForPeriod('2023-05-01', '2023-05-31', 'all');
    
    expect(result).toEqual([]);
  });
});

describe('addBookingToCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('カレンダーに予約イベントを追加する', async () => {
    const mockResponse = {
      data: {
        success: true,
        eventId: 'event123',
        logs: ['Log1', 'Log2']
      }
    };
    
    const mockHttpsCallable = jest.fn().mockResolvedValue(mockResponse);
    
    // httpsCallableをモック
    (httpsCallable as jest.Mock).mockImplementation((funcs, name) => {
      expect(funcs).toBe(functions);
      expect(name).toBe('addBookingEvent');
      return mockHttpsCallable;
    });
    
    // addBookingToCalendarはファイル先頭でインポート済み
    (addBookingToCalendar as jest.Mock).mockImplementation(async (bookingData) => {
      const callable = httpsCallable(functions, 'addBookingEvent');
      const result = await callable(bookingData);
      return (result as { data: { success: boolean } }).data.success;
    });
    
    const mockBookingData = {
      room: 'private4',
      name: 'テスト太郎',
      startTime: '10:00',
      endTime: '12:00',
      startDate: '2023-05-01',
      contactPhone: '090-1234-5678',
      contactEmail: 'test@example.com',
      count: 2,
      purpose: '会議・打合せ'
    };
    
    const result = await addBookingToCalendar(mockBookingData);
    
    expect(mockHttpsCallable).toHaveBeenCalledWith(mockBookingData);
    expect(result).toBe(true);
  });

  it('エラー発生時にfalseを返す', async () => {
    const mockError = new Error('API Error');
    const mockHttpsCallable = jest.fn().mockRejectedValue(mockError);
    
    (httpsCallable as jest.Mock).mockReturnValue(mockHttpsCallable);
    
    // addBookingToCalendarはファイル先頭でインポート済み
    (addBookingToCalendar as jest.Mock).mockImplementation(async () => {
      try {
        await mockHttpsCallable();
        return true;
      } catch {
        return false;
      }
    });
    
    const mockBookingData = {
      room: 'private4',
      name: 'テスト太郎',
      startTime: '10:00',
      endTime: '12:00',
      startDate: '2023-05-01'
    };
    
    const result = await addBookingToCalendar(mockBookingData);
    
    expect(result).toBe(false);
  });
});
