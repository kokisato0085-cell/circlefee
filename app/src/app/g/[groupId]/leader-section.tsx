import { createClient } from "@/lib/supabase/server";
import { InviteLinkSection } from "./invite-link-section";
import { JoinRequestList } from "./join-request-list";

export async function LeaderSection({ groupId }: { groupId: string }) {
  const supabase = await createClient();

  const { data: joinRequestsData } = await supabase.rpc(
    "get_pending_join_requests",
    { target_group_id: groupId }
  );

  const joinRequests = (joinRequestsData ?? []).map(
    (r: { id: string; display_name: string; created_at: string }) => ({
      id: r.id,
      display_name: r.display_name,
      created_at: r.created_at,
    })
  );

  return (
    <>
      <InviteLinkSection groupId={groupId} />
      <JoinRequestList requests={joinRequests} />
    </>
  );
}
