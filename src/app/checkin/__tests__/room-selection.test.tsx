/**
 * 部屋選択画面のテスト
 * - 予約なしの場合、4番大部屋が最初に大きく表示される
 * - 各部屋に用途の説明が表示される
 * - 予約ありの場合は従来通りの表示
 */

import { render, screen, fireEvent } from "@testing-library/react";
import RoomSelectionPage from "../room-selection/page";
import { useRouter, useSearchParams } from "next/navigation";

// モックの設定
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("部屋選択画面", () => {
  // 共通のモック設定
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  test("予約なしの場合、4番大部屋が最初に大きく表示され、各部屋に用途の説明が表示される", () => {
    // 予約なしの場合のパラメータ設定
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null), // hasReservation = false
    });

    render(<RoomSelectionPage />);

    // 4番大部屋が存在することを確認
    const large4Button = screen.getByText("4番大部屋");
    expect(large4Button).toBeInTheDocument();

    // 4番大部屋の説明が表示されていることを確認
    const large4Description = screen.getByText("テレワーク・勉強に使えるオープン席です");
    expect(large4Description).toBeInTheDocument();

    // 他の部屋の説明も表示されていることを確認
    expect(screen.getByText("Web会議等。予約がないときに使えます")).toBeInTheDocument();
    expect(screen.getByText("複数名の会議・イベント等。予約がないときに使えます")).toBeInTheDocument();
    expect(screen.getByText("飲食や他の部屋が使えないときなどにお使いください")).toBeInTheDocument();
    expect(screen.getByText("施設内を見学する際に選択してください")).toBeInTheDocument();

    // 4番大部屋ボタンのスタイルが特別であることを確認（実装依存のため、テスト方法は変わる可能性あり）
    // この例では、親要素のクラス名に "col-span-2" が含まれていることを確認
    const large4ButtonElement = large4Button.closest("button");
    expect(large4ButtonElement).toHaveClass("col-span-2");
  });

  test("予約ありの場合は従来通りの表示", () => {
    // 予約ありの場合のパラメータ設定
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue("true"), // hasReservation = true
    });

    render(<RoomSelectionPage />);

    // 予約ありの場合は4番個室と6番大部屋のみ表示
    expect(screen.getByText("4番個室")).toBeInTheDocument();
    expect(screen.getByText("6番 大部屋・工作室")).toBeInTheDocument();

    // 説明文は表示されない
    expect(screen.queryByText("Web会議等。予約がないときに使えます")).not.toBeInTheDocument();
    expect(screen.queryByText("複数名の会議・イベント等。予約がないときに使えます")).not.toBeInTheDocument();
  });

  test("部屋を選択すると適切なページに遷移する", () => {
    // 予約なしの場合のパラメータ設定
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null), // hasReservation = false
    });

    render(<RoomSelectionPage />);

    // 4番大部屋を選択
    fireEvent.click(screen.getByText("4番大部屋"));
    expect(mockPush).toHaveBeenCalledWith("/checkin/time?room=large4");

    // 4番個室を選択
    fireEvent.click(screen.getByText("4番個室"));
    expect(mockPush).toHaveBeenCalledWith("/checkin/reservation?room=private4&noReservation=true");
  });

  test("戻るボタンを押すと予約選択画面に戻る", () => {
    // 予約なしの場合のパラメータ設定
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null), // hasReservation = false
    });

    render(<RoomSelectionPage />);

    // 戻るボタンをクリック
    fireEvent.click(screen.getByText("戻る"));
    expect(mockPush).toHaveBeenCalledWith("/checkin/reservation-selection");
  });
});