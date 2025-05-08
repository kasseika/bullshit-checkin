import '@testing-library/jest-dom';

// コンソール出力を抑制
global.console = {
  ...console,
  // エラーのみ表示し、他のログは抑制
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  // エラーは表示したいので、元の実装を使用
  error: console.error,
};

class MockIDBFactory {
  open() {
    return {
      result: {
        objectStoreNames: {
          contains: jest.fn().mockReturnValue(true),
        },
        createObjectStore: jest.fn(),
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            add: jest.fn(),
            put: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          }),
        }),
        close: jest.fn(),
      },
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    };
  }
}

Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(global, 'indexedDB', {
  writable: true,
  value: new MockIDBFactory(),
});

global.fetch = jest.fn();
