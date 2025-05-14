import { redirect } from "next/navigation";

// 予約ページに直接リダイレクト
export default function RoomSelectionPage() {
  redirect("/booking/reservation");
}