import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function EventsSection({
  groupId,
  isLeaderOrMod,
}: {
  groupId: string;
  isLeaderOrMod: boolean;
}) {
  const supabase = await createClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, amount, due_date, month, created_at")
    .eq("group_id", groupId)
    .eq("month", currentMonth)
    .order("created_at", { ascending: false });

  let eventStats: Record<string, { total: number; paid: number; claimed: number }> = {};
  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const { data: statuses } = await supabase
      .from("payment_statuses")
      .select("event_id, status")
      .in("event_id", eventIds);

    for (const s of statuses ?? []) {
      if (!eventStats[s.event_id]) {
        eventStats[s.event_id] = { total: 0, paid: 0, claimed: 0 };
      }
      eventStats[s.event_id].total++;
      if (s.status === "paid") eventStats[s.event_id].paid++;
      if (s.status === "claimed") eventStats[s.event_id].claimed++;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">
          {currentMonth} のイベント
        </h2>
        {isLeaderOrMod && (
          <Link href={`/g/${groupId}/events/new`}>
            <Button size="sm">+ 作成</Button>
          </Link>
        )}
      </div>

      {(!events || events.length === 0) ? (
        <p className="text-sm text-gray-500">今月のイベントはありません</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const stats = eventStats[event.id] || { total: 0, paid: 0, claimed: 0 };
            return (
              <Link key={event.id} href={`/g/${groupId}/events/${event.id}`}>
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.title}</span>
                      <span className="text-sm font-semibold">
                        {event.amount.toLocaleString()}円
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                      <span>{stats.paid}/{stats.total}人 支払い済み</span>
                      {stats.claimed > 0 && (
                        <span className="text-orange-500">{stats.claimed}件 申告中</span>
                      )}
                    </div>
                    {event.due_date && (
                      <p className="mt-1 text-xs text-gray-400">
                        期限: {event.due_date}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
