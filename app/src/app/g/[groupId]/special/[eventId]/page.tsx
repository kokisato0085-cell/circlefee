import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SpecialClaimButton } from "./special-claim-button";
import { SpecialManageList } from "./special-manage-list";
import { SpecialDeleteButton } from "./special-delete-button";
import { SpecialRoleManager } from "./special-role-manager";
import { SpecialMemberManager } from "./special-member-manager";

export default async function SpecialEventDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  const { groupId, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: membership }, { data: event }] = await Promise.all([
    supabase.from("memberships").select("role").eq("group_id", groupId).eq("user_id", user.id).single(),
    supabase.from("special_events").select("*").eq("id", eventId).single(),
  ]);

  if (!membership) redirect("/groups");
  if (!event) redirect(`/g/${groupId}`);

  const isLeader = membership.role === "leader";
  const isLeaderOrMod = isLeader || membership.role === "moderator";

  const [{ data: myStatus }, { data: allStatuses }, { data: eventRoles }] = await Promise.all([
    supabase.from("special_payment_statuses").select("id, status, version").eq("special_event_id", eventId).eq("user_id", user.id).single(),
    supabase.from("special_payment_statuses").select("id, user_id, status, version, profiles(display_name)").eq("special_event_id", eventId),
    supabase.from("special_event_roles").select("user_id").eq("special_event_id", eventId),
  ]);

  const eventRoleUserIds = new Set((eventRoles ?? []).map((r) => r.user_id));
  const isEventAuthorized = isLeaderOrMod || eventRoleUserIds.has(user.id);

  const total = allStatuses?.length ?? 0;
  const paid = allStatuses?.filter((s) => s.status === "paid").length ?? 0;

  const statusLabels: Record<string, { text: string; color: string }> = {
    unpaid: { text: "未払い", color: "text-red-600 bg-red-50" },
    claimed: { text: "申告中", color: "text-orange-600 bg-orange-50" },
    paid: { text: "支払い済み", color: "text-green-600 bg-green-50" },
  };

  const myStatusInfo = myStatus ? statusLabels[myStatus.status] : null;

  const memberStatuses = (allStatuses ?? []).map((s) => ({
    id: s.id,
    userId: s.user_id,
    displayName: (s.profiles as unknown as { display_name: string } | null)?.display_name ?? "退会済みメンバー",
    status: s.status as string,
    version: s.version,
  }));

  const { data: members } = isEventAuthorized
    ? await supabase.from("memberships").select("user_id, profiles(display_name)").eq("group_id", groupId)
    : { data: null };

  const participantUserIds = new Set((allStatuses ?? []).map((s) => s.user_id));

  const availableMembers = (members ?? [])
    .filter((m) => !participantUserIds.has(m.user_id))
    .map((m) => ({
      userId: m.user_id,
      displayName: (m.profiles as unknown as { display_name: string } | null)?.display_name ?? "不明",
    }));

  const memberOptions = (members ?? [])
    .filter((m) => !eventRoleUserIds.has(m.user_id))
    .map((m) => ({
      userId: m.user_id,
      displayName: (m.profiles as unknown as { display_name: string } | null)?.display_name ?? "不明",
    }));

  const currentRoles = (eventRoles ?? []).map((r) => {
    const status = (allStatuses ?? []).find((s) => s.user_id === r.user_id);
    return {
      userId: r.user_id,
      displayName: status ? (status.profiles as unknown as { display_name: string } | null)?.display_name ?? "不明" : "不明",
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
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">特別</span>
        </div>

        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-semibold text-lg">{event.amount.toLocaleString()}円</span>
            </div>
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
          </CardContent>
        </Card>

        {myStatus && (
          <Card>
            <CardContent className="py-4">
              <h2 className="font-semibold mb-3">あなたのステータス</h2>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${myStatusInfo?.color}`}>
                  {myStatusInfo?.text}
                </span>
                {myStatus.status === "unpaid" && (
                  <SpecialClaimButton specialEventId={eventId} groupId={groupId} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isEventAuthorized && (
          <SpecialManageList
            statuses={memberStatuses}
            groupId={groupId}
            specialEventId={eventId}
          />
        )}

        {isEventAuthorized && (
          <SpecialMemberManager
            specialEventId={eventId}
            groupId={groupId}
            participants={memberStatuses.map((s) => ({
              userId: s.userId,
              displayName: s.displayName,
              status: s.status,
            }))}
            availableMembers={availableMembers}
          />
        )}

        {isLeader && (
          <SpecialRoleManager
            specialEventId={eventId}
            groupId={groupId}
            currentRoles={currentRoles}
            memberOptions={memberOptions}
          />
        )}

        {isLeader && (
          <div className="pt-2 border-t">
            <SpecialDeleteButton specialEventId={eventId} groupId={groupId} />
          </div>
        )}
      </div>
    </div>
  );
}
