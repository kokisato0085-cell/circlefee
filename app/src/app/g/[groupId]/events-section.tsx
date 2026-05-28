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
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentMonth = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, amount, due_date, month, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  let eventStats: Record<string, { total: number; paid: number; claimed: number }> = {};
  const eventIds = (events ?? []).map((e) => e.id);

  let confirmedEventIds = new Set<string>();

  if (eventIds.length > 0) {
    const [{ data: statuses }, { data: incomeEntries }] = await Promise.all([
      supabase
        .from("payment_statuses")
        .select("event_id, status")
        .in("event_id", eventIds),
      supabase
        .from("account_entries")
        .select("event_id")
        .eq("group_id", groupId)
        .eq("type", "income")
        .not("event_id", "is", null),
    ]);

    for (const s of statuses ?? []) {
      if (!eventStats[s.event_id]) {
        eventStats[s.event_id] = { total: 0, paid: 0, claimed: 0 };
      }
      eventStats[s.event_id].total++;
      if (s.status === "paid") eventStats[s.event_id].paid++;
      if (s.status === "claimed") eventStats[s.event_id].claimed++;
    }

    confirmedEventIds = new Set((incomeEntries ?? []).map((e) => e.event_id));
  }

  const activeEvents = (events ?? []).filter(
    (e) => e.month === currentMonth && !confirmedEventIds.has(e.id)
  );
  const completedEvents = (events ?? []).filter(
    (e) => confirmedEventIds.has(e.id)
  );

  return (
    <div className="space-y-6">
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

        {activeEvents.length === 0 ? (
          <p className="text-sm text-gray-500">進行中のイベントはありません</p>
        ) : (
          <div className="space-y-3">
            {activeEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                stats={eventStats[event.id]}
                groupId={groupId}
              />
            ))}
          </div>
        )}
      </div>

      {completedEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">終了済みイベント</h2>
          <div className="space-y-3">
            {completedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                stats={eventStats[event.id]}
                groupId={groupId}
                completed
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  stats,
  groupId,
  completed,
}: {
  event: { id: string; title: string; amount: number; due_date: string | null; month: string };
  stats?: { total: number; paid: number; claimed: number };
  groupId: string;
  completed?: boolean;
}) {
  const s = stats || { total: 0, paid: 0, claimed: 0 };
  return (
    <Link href={`/g/${groupId}/events/${event.id}`}>
      <Card className={`hover:bg-gray-50 transition-colors cursor-pointer ${completed ? "opacity-70" : ""}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{event.title}</span>
              {completed && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">完了</span>
              )}
            </div>
            <span className="text-sm font-semibold">
              {event.amount.toLocaleString()}円
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            <span>{s.paid}/{s.total}人 支払い済み</span>
            {s.claimed > 0 && (
              <span className="text-orange-500">{s.claimed}件 申告中</span>
            )}
          </div>
          {event.due_date && (
            <p className="mt-1 text-xs text-gray-400">
              期限: {event.due_date}
            </p>
          )}
          {completed && (
            <p className="mt-1 text-xs text-gray-400">{event.month}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
