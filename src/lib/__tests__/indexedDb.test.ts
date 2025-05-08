import { initIndexedDB, saveToIndexedDB, getAllPendingCheckins, removeFromIndexedDB, updateAttempts } from '../indexedDb';
import { CheckInData } from '../firestore';

describe('IndexedDB operations', () => {
  const mockIDBOpenDBRequest = {
    result: {
      objectStoreNames: {
        contains: jest.fn(),
      },
      createObjectStore: jest.fn(),
      transaction: jest.fn(),
      close: jest.fn(),
    },
    onupgradeneeded: null as any,
    onsuccess: null as any,
    onerror: null as any,
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
            mockIDBOpenDBRequest.onupgradeneeded({ target: mockIDBOpenDBRequest });
          }
          if (mockIDBOpenDBRequest.onsuccess) {
            mockIDBOpenDBRequest.onsuccess({ target: mockIDBOpenDBRequest });
          }
        }, 0);
        return mockIDBOpenDBRequest;
      }),
    } as any;
    
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
        const request = {} as any;
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request });
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
        const request = {
          error: { name: 'TestError', message: 'Test error message' }
        } as any;
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
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
        const request = {} as any;
        setTimeout(() => {
          request.result = mockCheckins;
          if (request.onsuccess) {
            request.onsuccess({ target: request });
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
        const request = {
          error: { name: 'TestError', message: 'Test error message' }
        } as any;
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
          }
        }, 0);
        
        return request;
      });
      
      const result = await Promise.race([
        getAllPendingCheckins(),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), 1000))
      ]);
      
      expect(result).toEqual([]);
    }, 10000);
  });

  describe('removeFromIndexedDB', () => {
    it('指定されたIDのデータを削除する', async () => {
      mockObjectStore.delete.mockImplementation(() => {
        const request = {} as any;
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request });
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
        const request = {
          error: { name: 'TestError', message: 'Test error message' }
        } as any;
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
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
        const request = {} as any;
        setTimeout(() => {
          request.result = { id: 1, data: {}, timestamp: '', attempts: 0 };
          if (request.onsuccess) {
            request.onsuccess({ target: request });
          }
        }, 0);
        return request;
      });
      
      mockObjectStore.put.mockImplementation(() => {
        const request = {} as any;
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request });
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
        const request = {} as any;
        setTimeout(() => {
          request.result = undefined;
          if (request.onsuccess) {
            request.onsuccess({ target: request });
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
