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

    const checkInDate = new Date('2024-01-15');
    const result = await saveManualCheckIn(checkInData, checkInDate);

    expect(addDoc).toHaveBeenCalledWith(
      'mocked-collection',
      expect.objectContaining({
        ...checkInData,
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        clientCheckInTime: '2024-01-15T09:00:00',
        serverCheckInTime: 'mock-timestamp',
        createdAt: 'mock-timestamp',
        isManualEntry: true,
      })
    );

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