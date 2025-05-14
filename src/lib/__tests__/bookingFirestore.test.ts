import {
  saveBookingData,
  getBookingsByDate,
  getBookingsByRoomAndDate,
  updateBookingStatus,
  updateBookingCheckedInStatus,
  getBookingById,
  deleteBooking
} from '../bookingFirestore';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { firestoreDb } from '../firebase';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

jest.mock('../firebase', () => ({
  firestoreDb: {},
}));

jest.mock('sonner', () => ({
  toast: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('saveBookingData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  const mockBookingData = {
    room: 'private4',
    startTime: '10:00',
    endTime: '12:00',
    startDate: '2023-05-01',
    endDate: '2023-05-01',
    count: 2,
    purpose: 'meeting',
    contactName: 'テスト太郎',
    contactEmail: 'test@example.com',
    contactPhone: '090-1234-5678',
  };

  it('オンライン時にFirestoreにデータを保存する', async () => {
    (collection as jest.Mock).mockReturnValue('bookingsCollection');
    (addDoc as jest.Mock).mockResolvedValue({ id: 'doc123' });
    (serverTimestamp as jest.Mock).mockReturnValue('serverTime');

    const result = await saveBookingData(mockBookingData);

    expect(collection).toHaveBeenCalledWith(firestoreDb, 'bookings');
    expect(addDoc).toHaveBeenCalled();
    expect(serverTimestamp).toHaveBeenCalled();
    expect(result).toBe('doc123');
  });

  it('オフライン時にnullを返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const result = await saveBookingData(mockBookingData);

    expect(result).toBeNull();
  });

  it('Firestoreの保存に失敗した場合にnullを返す', async () => {
    (collection as jest.Mock).mockReturnValue('bookingsCollection');
    (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

    const result = await saveBookingData(mockBookingData);

    expect(result).toBeNull();
  });
});

describe('getBookingsByDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('オフライン時に空配列を返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await getBookingsByDate('2023-05-01');
    
    expect(result).toEqual([]);
  });

  it('特定の日付の予約を取得する', async () => {
    const mockBookings = [
      {
        id: 'booking1',
        room: 'private4',
        startTime: '10:00',
        endTime: '12:00',
        startDate: '2023-05-01',
        endDate: '2023-05-01',
        count: 2,
        purpose: 'meeting',
        contactName: 'テスト太郎',
        contactEmail: 'test@example.com',
        contactPhone: '090-1234-5678',
        status: 'confirmed',
        checkedIn: false
      }
    ];

    const mockQuerySnapshot = {
      forEach: jest.fn((callback) => {
        callback({
          id: 'booking1',
          data: () => ({
            room: 'private4',
            startTime: '10:00',
            endTime: '12:00',
            startDate: '2023-05-01',
            endDate: '2023-05-01',
            count: 2,
            purpose: 'meeting',
            contactName: 'テスト太郎',
            contactEmail: 'test@example.com',
            contactPhone: '090-1234-5678',
            status: 'confirmed',
            checkedIn: false
          })
        });
      })
    };
    
    (collection as jest.Mock).mockReturnValue('bookingsCollection');
    (query as jest.Mock).mockReturnValue('query');
    (where as jest.Mock).mockReturnValue('whereClause');
    (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
    
    const result = await getBookingsByDate('2023-05-01');
    
    expect(result).toEqual(mockBookings);
    expect(collection).toHaveBeenCalledWith(firestoreDb, 'bookings');
    expect(where).toHaveBeenCalledWith('startDate', '==', '2023-05-01');
    expect(query).toHaveBeenCalledWith('bookingsCollection', 'whereClause');
    expect(getDocs).toHaveBeenCalledWith('query');
  });
});

describe('getBookingsByRoomAndDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('オフライン時に空配列を返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await getBookingsByRoomAndDate('private4', '2023-05-01');
    
    expect(result).toEqual([]);
  });

  it('特定の部屋と日付の予約を取得する', async () => {
    const mockBookings = [
      {
        id: 'booking1',
        room: 'private4',
        startTime: '10:00',
        endTime: '12:00',
        startDate: '2023-05-01',
        endDate: '2023-05-01',
        count: 2,
        purpose: 'meeting',
        contactName: 'テスト太郎',
        contactEmail: 'test@example.com',
        contactPhone: '090-1234-5678',
        status: 'confirmed',
        checkedIn: false
      }
    ];

    const mockQuerySnapshot = {
      forEach: jest.fn((callback) => {
        callback({
          id: 'booking1',
          data: () => ({
            room: 'private4',
            startTime: '10:00',
            endTime: '12:00',
            startDate: '2023-05-01',
            endDate: '2023-05-01',
            count: 2,
            purpose: 'meeting',
            contactName: 'テスト太郎',
            contactEmail: 'test@example.com',
            contactPhone: '090-1234-5678',
            status: 'confirmed',
            checkedIn: false
          })
        });
      })
    };
    
    (collection as jest.Mock).mockReturnValue('bookingsCollection');
    (query as jest.Mock).mockReturnValue('query');
    (where as jest.Mock).mockImplementation((field, op, value) => `whereClause_${field}_${op}_${value}`);
    (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
    
    const result = await getBookingsByRoomAndDate('private4', '2023-05-01');
    
    expect(result).toEqual(mockBookings);
    expect(collection).toHaveBeenCalledWith(firestoreDb, 'bookings');
    expect(where).toHaveBeenCalledWith('room', '==', 'private4');
    expect(where).toHaveBeenCalledWith('startDate', '==', '2023-05-01');
    expect(query).toHaveBeenCalledWith('bookingsCollection', 'whereClause_room_==_private4', 'whereClause_startDate_==_2023-05-01');
    expect(getDocs).toHaveBeenCalledWith('query');
  });
});

describe('updateBookingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('オフライン時にfalseを返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await updateBookingStatus('booking1', 'confirmed');
    
    expect(result).toBe(false);
  });

  it('予約ステータスを更新する', async () => {
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (serverTimestamp as jest.Mock).mockReturnValue('serverTime');
    
    const result = await updateBookingStatus('booking1', 'confirmed');
    
    expect(result).toBe(true);
    expect(doc).toHaveBeenCalledWith(firestoreDb, 'bookings', 'booking1');
    expect(updateDoc).toHaveBeenCalledWith('bookingDoc', {
      status: 'confirmed',
      updatedAt: 'serverTime'
    });
  });

  it('更新に失敗した場合にfalseを返す', async () => {
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (updateDoc as jest.Mock).mockRejectedValue(new Error('Update error'));
    
    const result = await updateBookingStatus('booking1', 'confirmed');
    
    expect(result).toBe(false);
  });
});

describe('updateBookingCheckedInStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('オフライン時にfalseを返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await updateBookingCheckedInStatus('booking1', true);
    
    expect(result).toBe(false);
  });

  it('予約のチェックイン状態を更新する', async () => {
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (serverTimestamp as jest.Mock).mockReturnValue('serverTime');
    
    const result = await updateBookingCheckedInStatus('booking1', true);
    
    expect(result).toBe(true);
    expect(doc).toHaveBeenCalledWith(firestoreDb, 'bookings', 'booking1');
    expect(updateDoc).toHaveBeenCalledWith('bookingDoc', {
      checkedIn: true,
      updatedAt: 'serverTime'
    });
  });

  it('更新に失敗した場合にfalseを返す', async () => {
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (updateDoc as jest.Mock).mockRejectedValue(new Error('Update error'));
    
    const result = await updateBookingCheckedInStatus('booking1', true);
    
    expect(result).toBe(false);
  });
});

describe('getBookingById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('オフライン時にnullを返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await getBookingById('booking1');
    
    expect(result).toBeNull();
  });

  it('予約IDから予約データを取得する', async () => {
    const mockBookingData = {
      room: 'private4',
      startTime: '10:00',
      endTime: '12:00',
      startDate: '2023-05-01',
      endDate: '2023-05-01',
      count: 2,
      purpose: 'meeting',
      contactName: 'テスト太郎',
      contactEmail: 'test@example.com',
      contactPhone: '090-1234-5678',
      status: 'confirmed',
      checkedIn: false
    };

    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(true),
      id: 'booking1',
      data: jest.fn().mockReturnValue(mockBookingData)
    };
    
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
    
    const result = await getBookingById('booking1');
    
    expect(result).toEqual({
      id: 'booking1',
      ...mockBookingData
    });
    expect(doc).toHaveBeenCalledWith(firestoreDb, 'bookings', 'booking1');
    expect(getDoc).toHaveBeenCalledWith('bookingDoc');
  });

  it('予約が存在しない場合にnullを返す', async () => {
    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(false)
    };
    
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
    
    const result = await getBookingById('booking1');
    
    expect(result).toBeNull();
  });
});

describe('deleteBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('オフライン時にfalseを返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await deleteBooking('booking1');
    
    expect(result).toBe(false);
  });

  it('予約を削除する', async () => {
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    
    const result = await deleteBooking('booking1');
    
    expect(result).toBe(true);
    expect(doc).toHaveBeenCalledWith(firestoreDb, 'bookings', 'booking1');
    expect(deleteDoc).toHaveBeenCalledWith('bookingDoc');
  });

  it('削除に失敗した場合にfalseを返す', async () => {
    (doc as jest.Mock).mockReturnValue('bookingDoc');
    (deleteDoc as jest.Mock).mockRejectedValue(new Error('Delete error'));
    
    const result = await deleteBooking('booking1');
    
    expect(result).toBe(false);
  });
});