/**
 * 手動チェックイン入力ページのテスト
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import ManualCheckinPage from '../page';
import { saveManualCheckIn } from '@/lib/manualCheckin';

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/manualCheckin', () => ({
  saveManualCheckIn: jest.fn(),
}));

// react-day-pickerのモック
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: { onSelect: (date: Date) => void; selected: Date | undefined }) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect(new Date('2024-01-15'))}>
        Select Date
      </button>
      {selected && <div>{selected.toISOString()}</div>}
    </div>
  ),
}));

describe('ManualCheckinPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const originalAlert = window.alert;
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    // alertのモック
    window.alert = jest.fn();
    // hasPointerCaptureのモック
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: jest.fn().mockReturnValue(false),
    });
    // scrollIntoViewのモック
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
  });
  
  afterEach(() => {
    window.alert = originalAlert;
  });

  it('フォームのすべての要素が表示される', () => {
    render(<ManualCheckinPage />);
    
    expect(screen.getByText('手動チェックイン入力')).toBeInTheDocument();
    expect(screen.getByText('チェックイン日付')).toBeInTheDocument();
    expect(screen.getByText('部屋 *')).toBeInTheDocument();
    expect(screen.getByText('開始時刻 *')).toBeInTheDocument();
    expect(screen.getByText('終了時刻 *')).toBeInTheDocument();
    expect(screen.getByText('利用人数 *')).toBeInTheDocument();
    expect(screen.getByText('利用目的 *')).toBeInTheDocument();
    expect(screen.getByText('年代 *')).toBeInTheDocument();
    expect(screen.getByText('予約ID（オプション）')).toBeInTheDocument();
  });

  it('見学を選択した場合、利用目的が自動設定される', async () => {
    render(<ManualCheckinPage />);
    const user = userEvent.setup();
    
    // 部屋選択をクリック
    const roomSelectButtons = screen.getAllByRole('combobox');
    await user.click(roomSelectButtons[0]); // 最初のcomboboxが部屋選択
    
    // 見学を選択
    const tourOption = screen.getByText('見学');
    await user.click(tourOption);
    
    // 利用目的が自動的に「視察・見学・取材」に設定されることを確認
    await waitFor(() => {
      const purposeSelect = screen.getByText('視察・見学・取材');
      expect(purposeSelect).toBeInTheDocument();
    });
  });

  it('工作室を選択した場合、利用目的が自動設定される', async () => {
    render(<ManualCheckinPage />);
    const user = userEvent.setup();
    
    // 部屋選択をクリック
    const roomSelectButtons = screen.getAllByRole('combobox');
    await user.click(roomSelectButtons[0]); // 最初のcomboboxが部屋選択
    
    // 工作室を選択
    const workshopOption = screen.getByText('6番工作室');
    await user.click(workshopOption);
    
    // 利用目的が自動的に「デジタル制作」に設定されることを確認
    await waitFor(() => {
      const purposeSelect = screen.getByText('デジタル制作');
      expect(purposeSelect).toBeInTheDocument();
    });
  });

  it('キャンセルボタンをクリックすると前のページに戻る', async () => {
    render(<ManualCheckinPage />);
    const user = userEvent.setup();
    
    const cancelButton = screen.getByText('キャンセル');
    await user.click(cancelButton);
    
    expect(mockBack).toHaveBeenCalled();
  });

  it('必須フィールドを入力してフォームを送信できる', async () => {
    (saveManualCheckIn as jest.Mock).mockResolvedValue({ success: true, id: 'test-id' });
    
    render(<ManualCheckinPage />);
    const user = userEvent.setup();
    
    // 部屋選択
    const roomSelectButtons = screen.getAllByRole('combobox');
    await user.click(roomSelectButtons[0]); // 最初のcomboboxが部屋選択
    await user.click(screen.getByText('1番'));
    
    // 時間入力
    const startTimeInput = screen.getByLabelText('開始時刻 *');
    const endTimeInput = screen.getByLabelText('終了時刻 *');
    await user.type(startTimeInput, '09:00');
    await user.type(endTimeInput, '12:00');
    
    // 人数入力
    const countInput = screen.getByLabelText('利用人数 *');
    await user.clear(countInput);
    await user.type(countInput, '3');
    
    // 利用目的選択
    const purposeSelectButtons = screen.getAllByRole('combobox');
    await user.click(purposeSelectButtons[1]); // 2番目のcomboboxが利用目的
    await user.click(screen.getByText('会議・打合せ'));
    
    // 年代選択
    const ageSelectButtons = screen.getAllByRole('combobox');
    await user.click(ageSelectButtons[2]); // 3番目のcomboboxが年代
    await user.click(screen.getByText('30代'));
    
    // フォーム送信
    const submitButton = screen.getByText('保存');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(saveManualCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          room: 'room1',
          startTime: '09:00',
          endTime: '12:00',
          count: 3,
          purpose: 'meeting',
          ageGroup: '30s',
          checkInTime: expect.any(String),
          reservationId: null,
        }),
        expect.any(Date)
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('保存エラー時にエラーメッセージが表示される', async () => {
    (saveManualCheckIn as jest.Mock).mockRejectedValue(new Error('保存エラー'));
    
    render(<ManualCheckinPage />);
    const user = userEvent.setup();
    
    // 必須フィールドを入力
    const roomSelectButton = screen.getByRole('combobox', { name: /部屋/i });
    await user.click(roomSelectButton);
    await user.click(screen.getByText('1番'));
    
    const startTimeInput = screen.getByLabelText('開始時刻 *');
    const endTimeInput = screen.getByLabelText('終了時刻 *');
    await user.type(startTimeInput, '09:00');
    await user.type(endTimeInput, '12:00');
    
    const purposeSelectButtons = screen.getAllByRole('combobox');
    await user.click(purposeSelectButtons[1]); // 2番目のcomboboxが利用目的
    await user.click(screen.getByText('会議・打合せ'));
    
    const ageSelectButtons = screen.getAllByRole('combobox');
    await user.click(ageSelectButtons[2]); // 3番目のcomboboxが年代
    await user.click(screen.getByText('30代'));
    
    // フォーム送信
    const submitButton = screen.getByText('保存');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('チェックインの保存に失敗しました');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});