import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NetworkMonitor } from '../NetworkMonitor';
import { startNetworkMonitoring, resendPendingCheckins } from '../../lib/firestore';
import { toast } from 'sonner';

jest.useFakeTimers();

jest.mock('../../lib/firestore', () => ({
  startNetworkMonitoring: jest.fn(),
  resendPendingCheckins: jest.fn().mockResolvedValue(0),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('NetworkMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    global.indexedDB = {
      open: jest.fn().mockReturnValue({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      }),
    } as any;
    
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
    
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  it('初期化時にネットワーク監視を開始する', () => {
    render(<NetworkMonitor />);
    
    expect(startNetworkMonitoring).toHaveBeenCalled();
    expect(document.addEventListener).toHaveBeenCalledWith('app-online', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('app-offline', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('オフライン時にバナーを表示する', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    render(<NetworkMonitor />);
    
    expect(screen.getByText(/オフラインモード/)).toBeInTheDocument();
  });

  it('オンライン時にバナーを表示しない', () => {
    render(<NetworkMonitor />);
    
    expect(screen.queryByText(/オフラインモード/)).not.toBeInTheDocument();
  });

  it('オンラインになったときに未送信データを再送信する', async () => {
    render(<NetworkMonitor />);
    
    const onlineHandler = (window.addEventListener as jest.Mock).mock.calls.find(
      call => call[0] === 'online'
    )[1];
    
    act(() => {
      onlineHandler();
    });
    
    expect(toast.success).toHaveBeenCalledWith('ネットワーク接続が回復しました', expect.any(Object));
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // resendPendingCheckins が呼ばれたことを確認
    expect(resendPendingCheckins).toHaveBeenCalled();
  }, 10000);

  it('オフラインになったときに通知を表示する', () => {
    render(<NetworkMonitor />);
    
    const offlineHandler = (window.addEventListener as jest.Mock).mock.calls.find(
      call => call[0] === 'offline'
    )[1];
    
    act(() => {
      offlineHandler();
    });
    
    expect(toast.error).toHaveBeenCalledWith('ネットワーク接続が切断されました', expect.any(Object));
  });
});
