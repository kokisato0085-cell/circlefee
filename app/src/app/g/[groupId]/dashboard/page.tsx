import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonthSelector } from "./month-selector";
import { ExportCsvButton } from "./export-csv-button";

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
    .select("id, title, amount, due_date")
    .eq("group_id", groupId)
    .eq("month", currentMonth)
    .order("created_at", { ascending: false });

  type StatusRow = {
    eventId: string;
    userId: string;
    displayName: string;
    status: string;
    subStatus: string | null;
    adjustedAmount: number | null;
  };

  type EventBlock = {
    id: string;
    title: string;
    amount: number;
    dueDate: string | null;
    statuses: StatusRow[];
    totalMembers: number;
    paidCount: number;
    claimedCount: number;
    collectedAmount: number;
    expectedAmount: number;
  };

  const eventBlocks: EventBlock[] = [];

  let grandTotalExpected = 0;
  let grandTotalCollected = 0;
  let grandPaidUsers = 0;
  let grandTotalUsers = 0;
  const myStatusByEvent: Record<string, { event_id: string; status: string; adjusted_amount: number | null }> = {};

  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id);

    const [{ data: statuses }, { data: myStatuses }] = await Promise.all([
      supabase
        .from("payment_statuses")
        .select("id, event_id, user_id, status, sub_status, adjusted_amount, profiles(display_name)")
        .in("event_id", eventIds),
      supabase
        .from("payment_statuses")
        .select("event_id, status, adjusted_amount")
        .eq("user_id", user.id)
        .in("event_id", eventIds),
    ]);

    for (const s of myStatuses ?? []) {
      myStatusByEvent[s.event_id] = s;
    }

    const statusesByEvent: Record<string, typeof statuses> = {};
    for (const s of statuses ?? []) {
      if (!statusesByEvent[s.event_id]) statusesByEvent[s.event_id] = [];
      statusesByEvent[s.event_id]!.push(s);
    }

    for (const ev of events) {
      const evStatuses = statusesByEvent[ev.id] ?? [];
      let paidCount = 0;
      let claimedCount = 0;
      let collectedAmount = 0;
      let expectedAmount = 0;

      const rows: StatusRow[] = evStatuses.map((s) => {
        const amount = (s.adjusted_amount as number | null) ?? ev.amount;
        expectedAmount += amount;
        if (s.status === "paid") {
          paidCount++;
          collectedAmount += amount;
        }
        if (s.status === "claimed") claimedCount++;

        return {
          eventId: s.event_id,
          userId: s.user_id,
          displayName: (s.profiles as unknown as { display_name: string }).display_name,
          status: s.status as string,
          subStatus: s.sub_status as string | null,
          adjustedAmount: s.adjusted_amount as number | null,
        };
      });

      eventBlocks.push({
        id: ev.id,
        title: ev.title,
        amount: ev.amount,
        dueDate: ev.due_date,
        statuses: rows,
        totalMembers: evStatuses.length,
        paidCount,
        claimedCount,
        collectedAmount,
        expectedAmount,
      });

      grandTotalExpected += expectedAmount;
      grandTotalCollected += collectedAmount;
      grandPaidUsers += paidCount;
      grandTotalUsers += evStatuses.length;
    }
  }

  const grandProgressPercent = grandTotalUsers > 0 ? Math.round((grandPaidUsers / grandTotalUsers) * 100) : 0;

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
              <span className="text-gray-500">月全体の集金進捗</span>
              <span className="font-semibold">{grandPaidUsers}/{grandTotalUsers}件</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${grandProgressPercent}%` }}
              />
            </div>
            {isLeaderOrMod && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">集金額</span>
                  <span>{grandTotalCollected.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">予定総額</span>
                  <span>{grandTotalExpected.toLocaleString()}円</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {(!events || events.length === 0) ? (
          <p className="text-sm text-gray-500">今月のイベントはありません</p>
        ) : (
          eventBlocks.map((block) => {
            const progressPercent = block.totalMembers > 0
              ? Math.round((block.paidCount / block.totalMembers) * 100)
              : 0;
            const myStatus = myStatusByEvent[block.id];
            const myLabel = myStatus ? statusLabels[myStatus.status] ?? statusLabels.unpaid : null;

            return (
              <Card key={block.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">{block.title}</h2>
                      {block.dueDate && (
                        <p className="text-xs text-gray-400">期限: {block.dueDate}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold">{block.amount.toLocaleString()}円</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">進捗</span>
                    <span>{block.paidCount}/{block.totalMembers}人</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {isLeaderOrMod && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">集金額</span>
                        <span>{block.collectedAmount.toLocaleString()}円 / {block.expectedAmount.toLocaleString()}円</span>
                      </div>

                      {block.statuses.length > 0 && (
                        <div className="border-t pt-3 space-y-2">
                          {block.statuses.map((s, i) => {
                            const label = statusLabels[s.status] ?? statusLabels.unpaid;
                            return (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium">{s.displayName}</span>
                                  {s.subStatus && <span className="text-xs text-gray-400 ml-2">({s.subStatus})</span>}
                                  {s.adjustedAmount !== null && s.adjustedAmount !== block.amount && (
                                    <span className="text-xs text-blue-600 ml-2">調整: {s.adjustedAmount.toLocaleString()}円</span>
                                  )}
                                </div>
                                <span className={`font-medium ${label.color}`}>{label.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {!isLeaderOrMod && myLabel && (
                    <div className="border-t pt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500">あなたの状態</span>
                      <span className={`font-medium ${myLabel.color}`}>{myLabel.text}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {isLeaderOrMod && (
          <ExportCsvButton
            currentMonth={currentMonth}
            events={eventBlocks.map((b) => ({
              title: b.title,
              amount: b.amount,
              statuses: b.statuses.map((s) => ({
                displayName: s.displayName,
                status: s.status,
                adjustedAmount: s.adjustedAmount,
              })),
            }))}
          />
        )}
      </div>
    </div>
  );
}
