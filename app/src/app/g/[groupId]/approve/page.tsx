import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApproveList } from "./approve-list";

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    redirect(`/g/${groupId}`);
  }

  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentMonth = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, amount")
    .eq("group_id", groupId)
    .eq("month", currentMonth);

  let pendingApprovals: {
    paymentStatusId: string;
    eventTitle: string;
    displayName: string;
    amount: number;
    subStatus: string | null;
  }[] = [];

  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const { data: claimed } = await supabase
      .from("payment_statuses")
      .select("id, event_id, user_id, sub_status, adjusted_amount, profiles(display_name)")
      .in("event_id", eventIds)
      .eq("status", "claimed");

    const eventMap = Object.fromEntries(events.map((e) => [e.id, e]));

    pendingApprovals = (claimed ?? []).map((c) => {
      const ev = eventMap[c.event_id];
      return {
        paymentStatusId: c.id,
        eventTitle: ev?.title ?? "",
        displayName: (c.profiles as unknown as { display_name: string }).display_name,
        amount: c.adjusted_amount ?? ev?.amount ?? 0,
        subStatus: c.sub_status,
      };
    });
  }

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">支払い承認</h1>
        </div>

        <ApproveList approvals={pendingApprovals} groupId={groupId} />
      </div>
    </div>
  );
}
