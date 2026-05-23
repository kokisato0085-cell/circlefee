import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimButton } from "./claim-button";
import { PaymentManageList } from "./payment-manage-list";
import { DeleteEventButton } from "./delete-event-button";

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

  const [{ data: myStatus }, { data: allStatuses }] = await Promise.all([
    supabase
      .from("payment_statuses")
      .select("id, status, version")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("payment_statuses")
      .select("id, user_id, status, sub_status, adjusted_amount, version, profiles(display_name)")
      .eq("event_id", eventId),
  ]);

  const total = allStatuses?.length ?? 0;
  const paid = allStatuses?.filter((s) => s.status === "paid").length ?? 0;
  const claimed = allStatuses?.filter((s) => s.status === "claimed").length ?? 0;

  const statusLabels: Record<string, { text: string; color: string }> = {
    unpaid: { text: "未払い", color: "text-red-600 bg-red-50" },
    claimed: { text: "申告中", color: "text-orange-600 bg-orange-50" },
    paid: { text: "支払い済み", color: "text-green-600 bg-green-50" },
  };

  const myStatusInfo = myStatus ? statusLabels[myStatus.status] : null;

  const memberStatuses = (allStatuses ?? []).map((s) => ({
    id: s.id,
    userId: s.user_id,
    displayName: (s.profiles as unknown as { display_name: string }).display_name,
    status: s.status as string,
    subStatus: s.sub_status as string | null,
    adjustedAmount: s.adjusted_amount as number | null,
    version: s.version,
  }));

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">{event.title}</h1>
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
          <div className="pt-2 border-t">
            <DeleteEventButton eventId={eventId} groupId={groupId} />
          </div>
        )}
      </div>
    </div>
  );
}
