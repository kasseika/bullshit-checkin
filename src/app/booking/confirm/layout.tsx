import { Metadata } from "next";

export const metadata: Metadata = {
  title: "大船渡テレワークセンター施設予約 - 確認",
  description: "大船渡テレワークセンターの施設予約確認ページ",
};

export default function ConfirmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}