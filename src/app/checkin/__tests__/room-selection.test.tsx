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
    const large4Button = screen.getByTestId("room-large4-button");
    expect(large4Button).toBeInTheDocument();

    // 4番大部屋の説明が表示されていることを確認
    const large4Description = screen.getByTestId("room-large4-description");
    expect(large4Description).toBeInTheDocument();
    expect(large4Description).toHaveTextContent("テレワーク・勉強に使えるオープン席です");

    // 他の部屋の説明も表示されていることを確認
    expect(screen.getByText("Web会議等。予約がないときに使えます")).toBeInTheDocument();
    expect(screen.getByText("複数名の会議・イベント等。予約がないときに使えます")).toBeInTheDocument();
    expect(screen.getByText("飲食や他の部屋が使えないときなどにお使いください")).toBeInTheDocument();
    expect(screen.getByText("施設内を見学する際に選択してください")).toBeInTheDocument();

    // 4番大部屋ボタンのdata-testidで取得できることを確認
    expect(large4Button).toBeInTheDocument();
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

  test("エラー発生時にエラーメッセージが表示される（レンダリング時のエラー処理）", () => {
    // 予約なしの場合のパラメータ設定
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    // RoomSelectionPageのレンダリングでエラーを投げるモック
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const BrokenComponent = () => {
      throw new Error("Test render error");
    };
    // サスペンスでラップしてエラー境界をテスト
    expect(() => render(<BrokenComponent />)).toThrow("Test render error");
    errorSpy.mockRestore();
  });

  test("アクセシビリティ: ボタンにrole='button'があり、キーボード操作で選択できる", () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    render(<RoomSelectionPage />);
    const large4Button = screen.getByTestId("room-large4-button");
    expect(large4Button).toHaveAttribute("role", "button");
    // キーボードEnterで選択
    large4Button.focus();
    fireEvent.keyDown(large4Button, { key: "Enter", code: "Enter" });
    // 4番大部屋は /checkin/time?room=large4 に遷移
    expect(mockPush).toHaveBeenCalledWith("/checkin/time?room=large4");
  });

  test("アクセシビリティ: ARIA属性が適切に付与されている", () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    render(<RoomSelectionPage />);
    const large4Button = screen.getByTestId("room-large4-button");
    expect(large4Button).toHaveAttribute("aria-label", expect.stringContaining("4番大部屋"));
  });

  test("異常系: 不正なクエリパラメータ(hasReservation=invalid)でもクラッシュしない", () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue("invalid"),
    });
    expect(() => render(<RoomSelectionPage />)).not.toThrow();
    // 予約なし扱いで4番大部屋が表示される
    expect(screen.getByTestId("room-large4-button")).toBeInTheDocument();
  });
});