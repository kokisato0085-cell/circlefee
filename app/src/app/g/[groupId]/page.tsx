import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/groups");

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .single();

  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, role, profiles(display_name)")
    .eq("group_id", groupId);

  const isLeader = membership.role === "leader";

  let joinRequests: { id: string; display_name: string; created_at: string }[] = [];
  if (isLeader) {
    const { data } = await supabase
      .from("join_requests")
      .select("id, user_id, created_at, profiles(display_name)")
      .eq("group_id", groupId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    joinRequests = (data ?? []).map((r) => ({
      id: r.id,
      display_name: (r.profiles as unknown as { display_name: string }).display_name,
      created_at: r.created_at,
    }));
  }

  const roleLabels: Record<string, string> = {
    leader: "部長",
    moderator: "権限者",
    member: "一般員",
  };

  return (
    <div className="flex min-h-full flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{group?.name}</h1>
          <Link href="/groups">
            <Button variant="ghost" size="sm">戻る</Button>
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">メンバー ({members?.length ?? 0}人)</h2>
          <div className="space-y-2">
            {(members ?? []).map((m) => {
              const profile = m.profiles as unknown as { display_name: string };
              return (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between bg-white border rounded-lg px-4 py-3"
                >
                  <span>{profile.display_name}</span>
                  <span className="text-sm text-gray-500">
                    {roleLabels[m.role as string] ?? m.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

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
