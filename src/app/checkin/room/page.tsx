import { Button } from "@/components/ui/button";
import Link from "next/link";

const rooms = [
  { id: "room1", name: "1番" },
  { id: "private4", name: "4番個室" },
  { id: "large4", name: "4番大部屋" },
  { id: "large6", name: "6番大部屋" },
  { id: "studio6", name: "6番工作室" },
  { id: "tour", name: "見学" },
];

export default function RoomSelectionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-12">使用する部屋を選択してください</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-2xl">
        {rooms.map((room) => (
          <Link key={room.id} href={`/checkin/time?room=${room.id}`} passHref>
            {/* TODO: 選択した部屋情報を次の画面に渡す */}
            <Button variant="outline" size="lg" className="w-full h-24 text-xl">
              {room.name}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}