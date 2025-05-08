import { google } from 'googleapis';

import { getCalendarReservations, addCalendarEvent, updateCalendarEvent } from '../index';

jest.mock('firebase-functions', () => {
  const httpsErrorMock = jest.fn().mockImplementation((code, message, details) => ({
    code,
    message,
    details,
    toJSON: () => ({ code, message, details }),
  }));

  return {
    config: jest.fn().mockReturnValue({
      calendar: {
        email: 'test@example.com',
        key: 'test-key',
        id: 'test-calendar-id',
      },
    }),
    region: jest.fn().mockReturnValue({
      https: {
        onCall: jest.fn(handler => handler),
        onRequest: jest.fn(handler => handler),
      },
    }),
    https: {
      HttpsError: httpsErrorMock,
    },
  };
});

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('googleapis', () => {
  const mockCalendarInstance = {
    events: {
      list: jest.fn(),
      get: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    },
  };
  
  return {
    google: {
      calendar: jest.fn().mockImplementation(() => mockCalendarInstance),
      auth: {
        JWT: jest.fn().mockImplementation(() => ({})),
      },
    },
  };
});

describe('Cloud Functions', () => {
  const mockCalendarInstance = google.calendar({ version: 'v3' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCalendarReservations', () => {
    it('指定された部屋の予約を取得する', async () => {
      const mockEvents = [
        {
          id: 'event1',
          summary: '4番個室_テスト予約',
          start: { dateTime: '2023-05-01T10:00:00+09:00' },
          end: { dateTime: '2023-05-01T12:00:00+09:00' },
        },
        {
          id: 'event2',
          summary: '6番_別の予約',
          start: { dateTime: '2023-05-01T14:00:00+09:00' },
          end: { dateTime: '2023-05-01T16:00:00+09:00' },
        },
      ];
      
      (mockCalendarInstance.events.list as jest.Mock).mockResolvedValue({
        data: {
          items: mockEvents,
        },
      });
      
      const result = await getCalendarReservations(
        { room: 'private4' },
        { auth: { uid: 'test-user' } }
      );
      
      expect(mockCalendarInstance.events.list).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        timeMin: expect.any(String),
        timeMax: expect.any(String),
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      expect((result as any).reservations.length).toBe(1);
      expect((result as any).reservations[0].roomIdentifier).toBe('4番個室');
      expect((result as any).logs).toBeDefined();
    });

    it('部屋IDが指定されていない場合はエラーを返す', async () => {
      await expect(
        getCalendarReservations({ room: '' }, { auth: null })
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'Room ID is required',
      });
    });
  });

  describe('addCalendarEvent', () => {
    it('チェックインイベントをカレンダーに追加する', async () => {
      (mockCalendarInstance.events.insert as jest.Mock).mockResolvedValue({
        data: {
          id: 'new-event-id',
        },
      });
      
      const result = await addCalendarEvent({
        room: 'private4',
        startTime: '10:00',
        endTime: '12:00',
      });
      
      expect(mockCalendarInstance.events.insert).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        requestBody: expect.objectContaining({
          summary: '4番個室_当日チェックイン',
          start: expect.any(Object),
          end: expect.any(Object),
        }),
      });
      
      expect((result as any).success).toBe(true);
      expect((result as any).eventId).toBe('new-event-id');
    });

    it('必須パラメータが不足している場合はエラーを返す', async () => {
      await expect(
        addCalendarEvent({ room: 'private4', startTime: '', endTime: '' })
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'Room ID, start time, and end time are required',
      });
    });
  });

  describe('updateCalendarEvent', () => {
    it('カレンダーイベントの終了時間を更新する', async () => {
      (mockCalendarInstance.events.get as jest.Mock).mockResolvedValue({
        data: {
          id: 'event-id',
          summary: '4番個室_テスト予約',
          start: { dateTime: '2023-05-01T10:00:00+09:00' },
          end: { dateTime: '2023-05-01T12:00:00+09:00' },
        },
      });
      
      (mockCalendarInstance.events.update as jest.Mock).mockResolvedValue({
        data: {
          id: 'event-id',
        },
      });
      
      const result = await updateCalendarEvent({
        eventId: 'event-id',
        endTime: '14:00',
      });
      
      expect(mockCalendarInstance.events.get).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        eventId: 'event-id',
      });
      
      expect(mockCalendarInstance.events.update).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        eventId: 'event-id',
        requestBody: expect.any(Object),
      });
      
      expect((result as any).success).toBe(true);
      expect((result as any).eventId).toBe('event-id');
    });

    it('必須パラメータが不足している場合はエラーを返す', async () => {
      await expect(
        updateCalendarEvent({ eventId: '', endTime: '' })
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'Event ID and end time are required',
      });
    });
  });
});
