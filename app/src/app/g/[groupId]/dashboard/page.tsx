import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonthSelector } from "./month-selector";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { groupId } = await params;
  const { month: queryMonth } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/groups");

  const isLeaderOrMod = membership.role === "leader" || membership.role === "moderator";

  const now = new Date();
  const currentMonth = queryMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, amount")
    .eq("group_id", groupId)
    .eq("month", currentMonth);

  let allStatuses: {
    eventId: string;
    eventTitle: string;
    eventAmount: number;
    userId: string;
    displayName: string;
    status: string;
    subStatus: string | null;
    adjustedAmount: number | null;
  }[] = [];

  let totalExpected = 0;
  let totalCollected = 0;
  let totalPaid = 0;
  let totalMembers = 0;

  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const eventMap = Object.fromEntries(events.map((e) => [e.id, e]));

    const { data: statuses } = await supabase
      .from("payment_statuses")
      .select("id, event_id, user_id, status, sub_status, adjusted_amount, profiles(display_name)")
      .in("event_id", eventIds);

    for (const s of statuses ?? []) {
      const ev = eventMap[s.event_id];
      const amount = (s.adjusted_amount as number | null) ?? ev.amount;
      totalExpected += amount;
      if (s.status === "paid") totalCollected += amount;

      allStatuses.push({
        eventId: s.event_id,
        eventTitle: ev.title,
        eventAmount: ev.amount,
        userId: s.user_id,
        displayName: (s.profiles as unknown as { display_name: string }).display_name,
        status: s.status as string,
        subStatus: s.sub_status as string | null,
        adjustedAmount: s.adjusted_amount as number | null,
      });
    }

    const paidUsers = new Set(
      (statuses ?? []).filter((s) => s.status === "paid").map((s) => s.user_id)
    );
    const allUsers = new Set((statuses ?? []).map((s) => s.user_id));
    totalPaid = paidUsers.size;
    totalMembers = allUsers.size;
  }

  const { data: myStatuses } = await supabase
    .from("payment_statuses")
    .select("event_id, status, events(title, amount)")
    .eq("user_id", user.id)
    .in("event_id", (events ?? []).map((e) => e.id));

  const progressPercent = totalMembers > 0 ? Math.round((totalPaid / totalMembers) * 100) : 0;

  const statusLabels: Record<string, { text: string; color: string }> = {
    unpaid: { text: "未払い", color: "text-red-600" },
    claimed: { text: "申告中", color: "text-orange-600" },
    paid: { text: "済", color: "text-green-600" },
  };

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">会計ダッシュボード</h1>
        </div>

        <MonthSelector currentMonth={currentMonth} groupId={groupId} />

        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">集金進捗</span>
              <span className="font-semibold">{totalPaid}/{totalMembers}人</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isLeaderOrMod && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">集金額</span>
                  <span>{totalCollected.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">予定総額</span>
                  <span>{totalExpected.toLocaleString()}円</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {isLeaderOrMod ? (
          <div>
            <h2 className="text-lg font-semibold mb-3">個別状況</h2>
            {allStatuses.length === 0 ? (
              <p className="text-sm text-gray-500">データがありません</p>
            ) : (
              <div className="space-y-2">
                {allStatuses.map((s, i) => {
                  const label = statusLabels[s.status] ?? statusLabels.unpaid;
                  return (
                    <div key={i} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{s.displayName}</p>
                        <p className="text-xs text-gray-400">{s.eventTitle}</p>
                        {s.subStatus && <p className="text-xs text-gray-400">memo: {s.subStatus}</p>}
                        {s.adjustedAmount !== null && s.adjustedAmount !== s.eventAmount && (
                          <p className="text-xs text-blue-600">調整: {s.adjustedAmount.toLocaleString()}円</p>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-3">あなたの状況</h2>
            {(!myStatuses || myStatuses.length === 0) ? (
              <p className="text-sm text-gray-500">該当するイベントはありません</p>
            ) : (
              <div className="space-y-2">
                {myStatuses.map((s) => {
                  const ev = s.events as unknown as { title: string; amount: number };
                  const label = statusLabels[s.status] ?? statusLabels.unpaid;
                  return (
                    <div key={s.event_id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{ev.title}</p>
                        <p className="text-xs text-gray-400">{ev.amount.toLocaleString()}円</p>
                      </div>
                      <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
