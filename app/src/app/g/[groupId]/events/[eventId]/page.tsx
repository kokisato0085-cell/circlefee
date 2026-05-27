import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimButton } from "./claim-button";
import { PaymentManageList } from "./payment-manage-list";
import { EditEventForm } from "./edit-event-form";
import { DeleteEventButton } from "./delete-event-button";
import { ReminderButton } from "./reminder-button";
import { PollSection } from "./poll-section";
import { PollManage } from "./poll-manage";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  const { groupId, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: membership }, { data: event }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single(),
  ]);

  if (!membership) redirect("/groups");
  if (!event) redirect(`/g/${groupId}`);

  const isLeaderOrMod = membership.role === "leader" || membership.role === "moderator";

  const [{ data: myStatus }, { data: allStatuses }, { data: pollData }, { data: groupRoles }, { data: memberRoles }, { data: memberships }] = await Promise.all([
    supabase
      .from("payment_statuses")
      .select("id, status, version, claim_date, claim_place, claim_recipient, claim_message")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("payment_statuses")
      .select("id, user_id, status, sub_status, adjusted_amount, version, claim_date, claim_place, claim_recipient, claim_message, profiles(display_name)")
      .eq("event_id", eventId),
    supabase
      .from("event_polls")
      .select("id, question, event_poll_options(id, label, sort_order)")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("group_roles")
      .select("id, name")
      .eq("group_id", groupId),
    supabase
      .from("member_roles")
      .select("group_role_id, membership_id"),
    supabase
      .from("memberships")
      .select("id, user_id, grade")
      .eq("group_id", groupId),
  ]);

  let pollProps: {
    id: string;
    question: string;
    options: { id: string; label: string; voteCount: number }[];
    myVoteOptionId: string | null;
    totalVotes: number;
  } | null = null;

  let voteByUserId: Record<string, string> = {};

  if (pollData) {
    const sortedOptions = [...(pollData.event_poll_options ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );

    const { data: votes } = await supabase
      .from("event_poll_votes")
      .select("user_id, option_id")
      .eq("poll_id", pollData.id);

    const voteCounts: Record<string, number> = {};
    let myVoteOptionId: string | null = null;

    for (const v of votes ?? []) {
      voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
      if (v.user_id === user.id) myVoteOptionId = v.option_id;
      const opt = sortedOptions.find((o) => o.id === v.option_id);
      if (opt) voteByUserId[v.user_id] = opt.label;
    }

    pollProps = {
      id: pollData.id,
      question: pollData.question,
      options: sortedOptions.map((o) => ({
        id: o.id,
        label: o.label,
        voteCount: voteCounts[o.id] ?? 0,
      })),
      myVoteOptionId,
      totalVotes: (votes ?? []).length,
    };
  }

  const total = allStatuses?.length ?? 0;
  const paid = allStatuses?.filter((s) => s.status === "paid").length ?? 0;
  const claimed = allStatuses?.filter((s) => s.status === "claimed").length ?? 0;

  const statusLabels: Record<string, { text: string; color: string }> = {
    unpaid: { text: "未払い", color: "text-red-600 bg-red-50" },
    claimed: { text: "申告中", color: "text-orange-600 bg-orange-50" },
    paid: { text: "支払い済み", color: "text-green-600 bg-green-50" },
  };

  const myStatusInfo = myStatus ? statusLabels[myStatus.status] : null;

  const grMap = Object.fromEntries((groupRoles ?? []).map((r) => [r.id, r.name]));
  const membershipByUser = Object.fromEntries((memberships ?? []).map((m) => [m.user_id, m]));
  const memberRoleMap: Record<string, string[]> = {};
  for (const mr of memberRoles ?? []) {
    if (!memberRoleMap[mr.membership_id]) memberRoleMap[mr.membership_id] = [];
    memberRoleMap[mr.membership_id].push(mr.group_role_id);
  }

  const memberStatuses = (allStatuses ?? []).map((s) => {
    const ms = membershipByUser[s.user_id];
    const roleNames = (memberRoleMap[ms?.id as string] ?? []).map((rid) => grMap[rid]).filter(Boolean);
    return {
      id: s.id,
      userId: s.user_id,
      displayName: (s.profiles as unknown as { display_name: string }).display_name,
      status: s.status as string,
      subStatus: s.sub_status as string | null,
      adjustedAmount: s.adjusted_amount as number | null,
      version: s.version,
      voteLabel: voteByUserId[s.user_id] ?? null,
      claimDate: s.claim_date as string | null,
      claimPlace: s.claim_place as string | null,
      claimRecipient: s.claim_recipient as string | null,
      claimMessage: s.claim_message as string | null,
      grade: (ms?.grade as number | null) ?? null,
      roleNames,
    };
  });

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">{event.title}</h1>
          {isLeaderOrMod && (
            <EditEventForm
              eventId={eventId}
              groupId={groupId}
              currentTitle={event.title}
              currentAmount={event.amount}
              currentDueDate={event.due_date}
              currentDescription={event.description}
            />
          )}
        </div>

        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-semibold text-lg">{event.amount.toLocaleString()}円</span>
            </div>
            {event.due_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">期限</span>
                <span>{event.due_date}</span>
              </div>
            )}
            {event.description && (
              <div>
                <span className="text-gray-500 text-sm">説明</span>
                <p className="mt-1">{event.description}</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">集金状況</span>
              <span>{paid}/{total}人 支払い済み</span>
            </div>
            {claimed > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">申告中</span>
                <span className="text-orange-500">{claimed}件</span>
              </div>
            )}
          </CardContent>
        </Card>

        {pollProps && (
          <PollSection poll={pollProps} groupId={groupId} eventId={eventId} />
        )}

        {isLeaderOrMod && (
          <PollManage
            poll={pollData ? {
              id: pollData.id,
              question: pollData.question,
              options: [...(pollData.event_poll_options ?? [])]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((o) => ({ id: o.id, label: o.label })),
            } : null}
            eventId={eventId}
            groupId={groupId}
          />
        )}

        {myStatus && (
          <Card>
            <CardContent className="py-4">
              <h2 className="font-semibold mb-3">あなたのステータス</h2>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${myStatusInfo?.color}`}>
                  {myStatusInfo?.text}
                </span>
                {myStatus.status === "unpaid" && (
                  <ClaimButton eventId={eventId} groupId={groupId} />
                )}
              </div>
              {(myStatus.status === "claimed" || myStatus.status === "paid") && myStatus.claim_date && (
                <div className="mt-2 bg-blue-50 rounded-md p-2 text-xs space-y-0.5">
                  <p className="font-medium text-blue-700">申告メモ</p>
                  <p><span className="text-gray-500">日付:</span> {myStatus.claim_date}</p>
                  <p><span className="text-gray-500">場所:</span> {myStatus.claim_place}</p>
                  <p><span className="text-gray-500">受取人:</span> {myStatus.claim_recipient}</p>
                  {myStatus.claim_message && (
                    <p><span className="text-gray-500">メッセージ:</span> {myStatus.claim_message}</p>
                  )}
                </div>
              )}
              {myStatus.status === "claimed" && (
                <p className="mt-2 text-sm text-gray-500">
                  権限者の承認をお待ちください
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isLeaderOrMod && (
          <PaymentManageList
            statuses={memberStatuses}
            eventAmount={event.amount}
            groupId={groupId}
          />
        )}

        {isLeaderOrMod && (
          <ReminderButton
            groupId={groupId}
            eventId={eventId}
            eventTitle={event.title}
            unpaidUserIds={memberStatuses.filter((s) => s.status === "unpaid").map((s) => s.userId)}
          />
        )}

        {isLeaderOrMod && (
          <div className="pt-2 border-t">
            <DeleteEventButton eventId={eventId} groupId={groupId} />
          </div>
        )}
      </div>
    </div>
  );
}
