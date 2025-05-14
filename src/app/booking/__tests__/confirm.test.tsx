import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmPage from '../confirm/page';
import { useRouter, useSearchParams } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

describe('ConfirmPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };
  
  const mockSearchParamsGet = jest.fn();
  const mockSearchParams = {
    get: mockSearchParamsGet,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it('エラー状態が表示される（パラメータなし）', async () => {
    // パラメータがない場合はエラーになる
    mockSearchParamsGet.mockReturnValue(null);
    
    render(<ConfirmPage />);
    
    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('予約情報が不足しています。')).toBeInTheDocument();
    });
    
    // トップページに戻るボタンが表示されることを確認
    const backButton = screen.getByText('トップページに戻る');
    expect(backButton).toBeInTheDocument();
    
    // ボタンをクリックするとrouterのpushが呼ばれることを確認
    fireEvent.click(backButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/booking');
  });

  it('予約情報が表示される', async () => {
    // URLパラメータのモック
    mockSearchParamsGet.mockImplementation((param) => {
      const params: Record<string, string> = {
        room: '4番個室',
        date: '2023-05-01',
        startTime: '10:00',
        endTime: '12:00',
        count: '2',
        purpose: '会議・打合せ',
        name: 'テスト太郎',
        email: 'test@example.com',
        phone: '090-1234-5678',
      };
      return params[param] || null;
    });
    
    render(<ConfirmPage />);
    
    // 予約情報が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('予約が完了しました')).toBeInTheDocument();
    });
    
    // 予約内容の各項目が表示されていることを確認
    expect(screen.getByText('4番個室')).toBeInTheDocument();
    expect(screen.getByText('2023-05-01')).toBeInTheDocument();
    expect(screen.getByText('10:00 〜 12:00')).toBeInTheDocument();
    expect(screen.getByText('2名')).toBeInTheDocument();
    expect(screen.getByText('会議・打合せ')).toBeInTheDocument();
    expect(screen.getByText('テスト太郎')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('090-1234-5678')).toBeInTheDocument();
    
    // トップページに戻るボタンが表示されることを確認
    const backButton = screen.getByText('トップページに戻る');
    expect(backButton).toBeInTheDocument();
    
    // ボタンをクリックするとrouterのpushが呼ばれることを確認
    fireEvent.click(backButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/booking');
  });
});