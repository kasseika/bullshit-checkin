import { initIndexedDB, saveToIndexedDB, getAllPendingCheckins, removeFromIndexedDB, updateAttempts } from '../indexedDb';
import { CheckInData } from '../firestore';

// テスト用のモックイベント型
interface MockEvent {
  target: unknown;
  bubbles?: boolean;
  cancelable?: boolean;
  currentTarget?: EventTarget;
  defaultPrevented?: boolean;
  eventPhase?: number;
  isTrusted?: boolean;
  timeStamp?: number;
  type?: string;
}

// モックデータベース型
interface MockIDBDatabase {
  objectStoreNames: {
    contains: jest.Mock;
  };
  createObjectStore: jest.Mock;
  transaction: jest.Mock;
  close: jest.Mock;
}

// テスト用のモックインターフェース
interface MockIDBRequest<T = unknown> {
  result?: T;
  error?: DOMException | null;
  onsuccess?: (event: MockEvent) => void;
  onerror?: (event: MockEvent) => void;
}

// MockIDBOpenDBRequestはresultを必須にする
interface MockIDBOpenDBRequest {
  result: MockIDBDatabase;
  error?: DOMException | null;
  onsuccess?: (event: MockEvent) => void;
  onerror?: (event: MockEvent) => void;
  onupgradeneeded?: (event: MockEvent) => void;
}

// 保存されるチェックインデータの型
type PendingCheckin = {
  id: number;
  data: CheckInData;
  timestamp: string;
  attempts: number;
};

describe('IndexedDB operations', () => {
  const mockIDBOpenDBRequest: MockIDBOpenDBRequest = {
    result: {
      objectStoreNames: {
        contains: jest.fn(),
      },
      createObjectStore: jest.fn(),
      transaction: jest.fn(),
      close: jest.fn(),
    },
    onupgradeneeded: undefined,
    onsuccess: undefined,
    onerror: undefined,
  };

  const mockObjectStore = {
    add: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
  };

  const mockTransaction = {
    objectStore: jest.fn().mockReturnValue(mockObjectStore),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    global.indexedDB = {
      open: jest.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockIDBOpenDBRequest.onupgradeneeded) {
            mockIDBOpenDBRequest.onupgradeneeded?.({ target: mockIDBOpenDBRequest } as MockEvent);
          }
          if (mockIDBOpenDBRequest.onsuccess) {
            mockIDBOpenDBRequest.onsuccess?.({ target: mockIDBOpenDBRequest } as MockEvent);
          }
        }, 0);
        return mockIDBOpenDBRequest;
      }),
    } as unknown as IDBFactory;
    
    mockIDBOpenDBRequest.result.transaction = jest.fn().mockReturnValue(mockTransaction);
  });

  describe('initIndexedDB', () => {
    it('データベース接続に成功する', async () => {
      const openPromise = initIndexedDB();
      
      const db = await openPromise;
      
      expect(db).toBe(mockIDBOpenDBRequest.result);
      expect(global.indexedDB.open).toHaveBeenCalledWith('bullshitCheckinDB', 2);
    });

    it('オブジェクトストアが存在しない場合は作成する', async () => {
      mockIDBOpenDBRequest.result.objectStoreNames.contains.mockReturnValue(false);
      
      const openPromise = initIndexedDB();
      
      await openPromise;
      
      expect(mockIDBOpenDBRequest.result.objectStoreNames.contains).toHaveBeenCalledWith('pendingCheckins');
      expect(mockIDBOpenDBRequest.result.createObjectStore).toHaveBeenCalledWith('pendingCheckins', { keyPath: 'id', autoIncrement: true });
    });
  });

  describe('saveToIndexedDB', () => {
    it('データを正常に保存する', async () => {
      const mockData: CheckInData = {
        room: 'private4',
        startTime: '10:00',
        endTime: '12:00',
        count: 2,
        purpose: 'meeting',
        ageGroup: 'thirties',
        checkInTime: '2023-05-01T10:00:00',
      };
      
      mockObjectStore.add.mockImplementation(() => {
        const request: MockIDBRequest<void> = {};
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess?.({ target: request } as MockEvent);
          }
        }, 0);
        return request;
      });
      
      const result = await saveToIndexedDB(mockData);
      
      expect(result).toBe(true);
      expect(mockIDBOpenDBRequest.result.transaction).toHaveBeenCalledWith(['pendingCheckins'], 'readwrite');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingCheckins');
      expect(mockObjectStore.add).toHaveBeenCalled();
      expect(mockIDBOpenDBRequest.result.close).toHaveBeenCalled();
    });

    it('エラー発生時にfalseを返す', async () => {
      const mockData: CheckInData = {
        room: 'private4',
        startTime: '10:00',
        endTime: '12:00',
        count: 2,
        purpose: 'meeting',
        ageGroup: 'thirties',
        checkInTime: '2023-05-01T10:00:00',
      };
      
      mockObjectStore.add.mockImplementation(() => {
        const request: MockIDBRequest<void> = {
          error: new DOMException('Test error message', 'TestError')
        };
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror?.({ target: request } as MockEvent);
          }
        }, 0);
        
        return request;
      });
      
      const result = await Promise.race([
        saveToIndexedDB(mockData),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000))
      ]);
      
      expect(result).toBe(false);
    }, 10000);
  });

  describe('getAllPendingCheckins', () => {
    it('保存されたチェックインデータを取得する', async () => {
      const mockCheckins = [
        { id: 1, data: { room: 'private4' }, timestamp: '2023-05-01T10:00:00', attempts: 0 },
        { id: 2, data: { room: 'large6' }, timestamp: '2023-05-01T11:00:00', attempts: 1 },
      ];
      
      mockObjectStore.getAll.mockImplementation(() => {
        const request: MockIDBRequest<PendingCheckin[]> = {};
        setTimeout(() => {
          Object.defineProperty(request, 'result', {
            value: mockCheckins,
            writable: true
          });
          if (request.onsuccess) {
            request.onsuccess?.({ target: request } as MockEvent);
          }
        }, 0);
        return request;
      });
      
      const result = await getAllPendingCheckins();
      
      expect(result).toEqual(mockCheckins);
      expect(mockIDBOpenDBRequest.result.transaction).toHaveBeenCalledWith(['pendingCheckins'], 'readonly');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingCheckins');
      expect(mockObjectStore.getAll).toHaveBeenCalled();
    });

    it('エラー発生時に空配列を返す', async () => {
      mockObjectStore.getAll.mockImplementation(() => {
        const request: MockIDBRequest<PendingCheckin[]> = {
          error: new DOMException('Test error message', 'TestError')
        };
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror?.({ target: request } as MockEvent);
          }
        }, 0);
        
        return request;
      });
      
      const result = await Promise.race([
        getAllPendingCheckins(),
        new Promise<PendingCheckin[]>(
          resolve => setTimeout(() => resolve([]), 1000)
        )
      ]);
      
      expect(result).toEqual([]);
    }, 10000);
  });

  describe('removeFromIndexedDB', () => {
    it('指定されたIDのデータを削除する', async () => {
      mockObjectStore.delete.mockImplementation(() => {
        const request: MockIDBRequest<void> = {};
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess?.({ target: request } as MockEvent);
          }
        }, 0);
        return request;
      });
      
      const result = await removeFromIndexedDB(1);
      
      expect(result).toBe(true);
      expect(mockIDBOpenDBRequest.result.transaction).toHaveBeenCalledWith(['pendingCheckins'], 'readwrite');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingCheckins');
      expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
    });

    it('エラー発生時にfalseを返す', async () => {
      mockObjectStore.delete.mockImplementation(() => {
        const request: MockIDBRequest<void> = {
          error: new DOMException('Test error message', 'TestError')
        };
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror?.({ target: request } as MockEvent);
          }
        }, 0);
        
        return request;
      });
      
      const result = await Promise.race([
        removeFromIndexedDB(1),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000))
      ]);
      
      expect(result).toBe(false);
    }, 10000);
  });

  describe('updateAttempts', () => {
    it('リトライ回数を更新する', async () => {
      mockObjectStore.get.mockImplementation(() => {
        const request: MockIDBRequest<PendingCheckin> = {};
        setTimeout(() => {
          Object.defineProperty(request, 'result', {
            value: { id: 1, data: {}, timestamp: '', attempts: 0 },
            writable: true
          });
          if (request.onsuccess) {
            request.onsuccess?.({ target: request } as MockEvent);
          }
        }, 0);
        return request;
      });
      
      mockObjectStore.put.mockImplementation(() => {
        const request: MockIDBRequest<PendingCheckin | undefined> = {};
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess?.({ target: request } as MockEvent);
          }
        }, 0);
        return request;
      });
      
      const result = await updateAttempts(1, 1);
      
      expect(result).toBe(true);
      expect(mockObjectStore.get).toHaveBeenCalledWith(1);
      expect(mockObjectStore.put).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }));
    });

    it('データが存在しない場合はfalseを返す', async () => {
      mockObjectStore.get.mockImplementation(() => {
        const request: MockIDBRequest<void> = {};
        setTimeout(() => {
          Object.defineProperty(request, 'result', {
            value: undefined,
            writable: true
          });
          if (request.onsuccess) {
            request.onsuccess?.({ target: request } as MockEvent);
          }
        }, 0);
        return request;
      });
      
      const result = await updateAttempts(1, 1);
      
      expect(result).toBe(false);
      expect(mockObjectStore.put).not.toHaveBeenCalled();
    });
  });
});
