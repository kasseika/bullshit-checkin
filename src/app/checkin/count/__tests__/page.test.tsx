/**
 * 人数選択ページのテスト
 * 工作室選択時に利用目的を「制作」で固定してアンケートページに直接遷移することをテストする
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CountSelectionPage from '../page';

// Next.jsのルーターをモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('CountSelectionPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };
  let mockSearchParams: Map<string, string>;
  let searchParamsObject: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new Map();
    
    // URLSearchParamsライクなオブジェクトを作成
    searchParamsObject = {
      get: (key: string) => mockSearchParams.get(key) || null,
      set: (key: string, value: string) => mockSearchParams.set(key, value),
      clear: () => mockSearchParams.clear(),
    };
    
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(searchParamsObject);
  });

  test('工作室選択時に利用目的を制作で固定してアンケートページに遷移する', async () => {
    // 工作室の予約情報をセットアップ
    mockSearchParams.clear(); // 前のテストのパラメータをクリア
    mockSearchParams.set('room', 'workshop6');
    mockSearchParams.set('startTime', '10:00');
    mockSearchParams.set('endTime', '12:00');
    mockSearchParams.set('reservationId', 'test-reservation-id');

    render(<CountSelectionPage />);

    // 次へボタンをクリック
    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/checkin/survey?room=workshop6&startTime=10:00&endTime=12:00&count=1&purpose=creation&reservationId=test-reservation-id'
      );
    });
  });

  test('工作室以外の部屋選択時は通常通り利用目的ページに遷移する', async () => {
    // 通常の部屋の予約情報をセットアップ（reservationIdなし）
    mockSearchParams.clear(); // 前のテストのパラメータをクリア
    mockSearchParams.set('room', 'room1');
    mockSearchParams.set('startTime', '10:00');
    mockSearchParams.set('endTime', '12:00');

    render(<CountSelectionPage />);

    // 次へボタンをクリック
    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/checkin/purpose?room=room1&startTime=10:00&endTime=12:00&count=1'
      );
    });
  });

  test('人数を変更できる', () => {
    mockSearchParams.clear(); // 前のテストのパラメータをクリア
    mockSearchParams.set('room', 'room1');
    mockSearchParams.set('startTime', '10:00');
    mockSearchParams.set('endTime', '12:00');

    render(<CountSelectionPage />);

    // 初期値は1
    expect(screen.getByText('1')).toBeInTheDocument();

    // +ボタンをクリックして人数を増やす
    const incrementButton = screen.getByLabelText('人数を1増やす');
    fireEvent.click(incrementButton);
    expect(screen.getByText('2')).toBeInTheDocument();

    // -ボタンをクリックして人数を減らす
    const decrementButton = screen.getByLabelText('人数を1減らす');
    fireEvent.click(decrementButton);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});