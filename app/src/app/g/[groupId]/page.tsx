import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InviteLinkSection } from "./invite-link-section";
import { JoinRequestList } from "./join-request-list";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: membership }, { data: group }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .single(),
  ]);

  if (!membership) redirect("/groups");

  const isLeaderOrMod = membership.role === "leader" || membership.role === "moderator";
  const isLeader = membership.role === "leader";

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [{ data: events }, joinRequestsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, amount, due_date, month, created_at")
      .eq("group_id", groupId)
      .eq("month", currentMonth)
      .order("created_at", { ascending: false }),
    isLeader
      ? supabase.rpc("get_pending_join_requests", { target_group_id: groupId })
      : Promise.resolve({ data: null }),
  ]);

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

  const joinRequests = (joinRequestsResult.data ?? []).map((r: { id: string; display_name: string; created_at: string }) => ({
    id: r.id,
    display_name: r.display_name,
    created_at: r.created_at,
  }));

  const statusLabel: Record<string, string> = {
    unpaid: "未払い",
    claimed: "申告中",
    paid: "済",
  };

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{group?.name}</h1>
          <Link href="/groups">
            <Button variant="ghost" size="sm">切替</Button>
          </Link>
        </div>

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

        <Link href={`/g/${groupId}/dashboard`}>
          <Button variant="outline" className="w-full">
            会計ダッシュボード
          </Button>
        </Link>

        {isLeaderOrMod && (
          <Link href={`/g/${groupId}/approve`}>
            <Button variant="outline" className="w-full">
              支払い承認画面へ
            </Button>
          </Link>
        )}

        {isLeader && (
          <>
            <InviteLinkSection groupId={groupId} />
            <JoinRequestList requests={joinRequests} />
          </>
        )}
      </div>
    </div>
  );
}
