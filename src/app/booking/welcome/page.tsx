import { redirect } from "next/navigation";

// 予約ページに直接リダイレクト
export default function WelcomePage() {
  redirect("/booking/reservation");
}