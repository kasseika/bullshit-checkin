/**
 * 手動チェックイン保存関数のテスト
 */
import { saveManualCheckIn } from '../manualCheckin';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import type { CheckInData } from '../firestore';

// Firebaseのモック
jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mocked-collection'),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('../../utils/dateUtils', () => ({
  formatDateToJST: jest.fn((date: Date) => {
    // モック実装: シンプルなYYYY-MM-DD形式を返す
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
}));


describe('saveManualCheckIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (serverTimestamp as jest.Mock).mockReturnValue('mock-timestamp');
  });

  it('手動チェックインデータをFirestoreに保存する', async () => {
    const mockDocRef = { id: 'test-doc-id' };
    (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

    const checkInData: CheckInData = {
      room: 'room1',
      startTime: '09:00',
      endTime: '12:00',
      count: 3,
      purpose: 'meeting',
      ageGroup: '30s',
      checkInTime: '2024-01-15T09:00:00',
      reservationId: null,
    };

    const checkInDate = new Date('2024-01-15T00:00:00');
    const result = await saveManualCheckIn(checkInData, checkInDate);

    // addDocが呼ばれたことを確認
    expect(addDoc).toHaveBeenCalled();
    
    // 保存されたデータを取得
    const savedData = (addDoc as jest.Mock).mock.calls[0][1];
    
    // 基本的なデータが含まれていることを確認
    expect(savedData.room).toBe('room1');
    expect(savedData.startTime).toBe('09:00');
    expect(savedData.endTime).toBe('12:00');
    expect(savedData.count).toBe(3);
    expect(savedData.purpose).toBe('meeting');
    expect(savedData.ageGroup).toBe('30s');
    expect(savedData.startDate).toBe('2024-01-15');
    expect(savedData.endDate).toBe('2024-01-15');
    expect(savedData.isManualEntry).toBe(true);
    expect(savedData.reservationId).toBeNull();
    
    // checkInTimeがISO形式であることを確認（正確な値はタイムゾーンに依存）
    expect(savedData.checkInTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(savedData.clientCheckInTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(savedData.checkInTime).toBe(savedData.clientCheckInTime);
    
    expect(result).toEqual({ success: true, id: 'test-doc-id' });
  });




  it('Firestore保存エラーの場合、エラーをスローする', async () => {
    const error = new Error('Firestore error');
    (addDoc as jest.Mock).mockRejectedValue(error);

    const checkInData: CheckInData = {
      room: 'room1',
      startTime: '09:00',
      endTime: '12:00',
      count: 1,
      purpose: 'study',
      ageGroup: '20s',
      checkInTime: '2024-01-15T09:00:00',
      reservationId: null,
    };

    const checkInDate = new Date('2024-01-15');
    
    await expect(saveManualCheckIn(checkInData, checkInDate)).rejects.toThrow('Firestore error');
  });
});