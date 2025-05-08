import { saveCheckInData, resendPendingCheckins, getCheckedInReservationIds } from '../firestore';
import { saveToIndexedDB, getAllPendingCheckins, removeFromIndexedDB, updateAttempts } from '../indexedDb';
import { collection, addDoc, serverTimestamp, query, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../firebase';

jest.mock('../indexedDb', () => ({
  saveToIndexedDB: jest.fn(),
  getAllPendingCheckins: jest.fn(),
  removeFromIndexedDB: jest.fn(),
  updateAttempts: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
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

describe('saveCheckInData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  const mockCheckInData = {
    room: 'private4',
    startTime: '10:00',
    endTime: '12:00',
    count: 2,
    purpose: 'meeting',
    ageGroup: 'thirties',
    checkInTime: '2023-05-01T10:00:00',
  };

  it('オンライン時にFirestoreにデータを保存する', async () => {
    (collection as jest.Mock).mockReturnValue('checkinsCollection');
    (addDoc as jest.Mock).mockResolvedValue({ id: 'doc123' });
    (serverTimestamp as jest.Mock).mockReturnValue('serverTime');

    const result = await saveCheckInData(mockCheckInData);

    expect(collection).toHaveBeenCalledWith(firestoreDb, 'checkins');
    expect(addDoc).toHaveBeenCalled();
    expect(serverTimestamp).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('オフライン時にIndexedDBにデータを保存する', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    (saveToIndexedDB as jest.Mock).mockResolvedValue(true);

    const result = await saveCheckInData(mockCheckInData);

    expect(saveToIndexedDB).toHaveBeenCalledWith(mockCheckInData);
    expect(result).toBe(true);
  });

  it('Firestoreの保存に失敗した場合にIndexedDBにフォールバックする', async () => {
    (collection as jest.Mock).mockReturnValue('checkinsCollection');
    (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));
    (saveToIndexedDB as jest.Mock).mockResolvedValue(true);

    const result = await saveCheckInData(mockCheckInData);

    expect(saveToIndexedDB).toHaveBeenCalledWith(mockCheckInData);
    expect(result).toBe(true);
  });
});

describe('resendPendingCheckins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('オフライン時に処理をスキップする', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await resendPendingCheckins();
    
    expect(result).toBe(0);
    expect(getAllPendingCheckins).not.toHaveBeenCalled();
  });

  it('未送信データがない場合は0を返す', async () => {
    (getAllPendingCheckins as jest.Mock).mockResolvedValue([]);
    
    const result = await resendPendingCheckins();
    
    expect(result).toBe(0);
  });

  it('未送信データを正常に再送信する', async () => {
    const mockPendingCheckins = [
      { 
        id: 1, 
        data: { room: 'private4', startTime: '10:00', endTime: '12:00' }, 
        timestamp: '2023-05-01T10:00:00',
        attempts: 0 
      }
    ];
    
    (getAllPendingCheckins as jest.Mock).mockResolvedValue(mockPendingCheckins);
    (collection as jest.Mock).mockReturnValue('checkinsCollection');
    (addDoc as jest.Mock).mockResolvedValue({ id: 'doc123' });
    (removeFromIndexedDB as jest.Mock).mockResolvedValue(true);
    
    const result = await resendPendingCheckins();
    
    expect(result).toBe(1);
    expect(updateAttempts).toHaveBeenCalledWith(1, 1);
    expect(addDoc).toHaveBeenCalled();
    expect(removeFromIndexedDB).toHaveBeenCalledWith(1);
  });
});

describe('getCheckedInReservationIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('オフライン時に空配列を返す', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const result = await getCheckedInReservationIds();
    
    expect(result).toEqual([]);
  });

  it('チェックイン済みの予約IDを取得する', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });
    
    const mockQuerySnapshot = {
      forEach: jest.fn((callback) => {
        callback({ data: () => ({ reservationId: 'res1' }) });
        callback({ data: () => ({ reservationId: 'res2' }) });
      })
    };
    
    (collection as jest.Mock).mockReturnValue('checkinsCollection');
    (query as jest.Mock).mockReturnValue('query');
    (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
    
    const result = await getCheckedInReservationIds();
    
    expect(result).toEqual(['res1', 'res2']);
    expect(collection).toHaveBeenCalledWith(firestoreDb, 'checkins');
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalledWith('query');
  });
});
