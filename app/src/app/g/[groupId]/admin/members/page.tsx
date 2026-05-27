import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MemberManageList } from "./member-manage-list";

export default async function AdminMembersPage({
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

  if (!membership || membership.role !== "leader") redirect(`/g/${groupId}`);

  const [{ data: members }, { data: groupRoles }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, role, version, grade, profiles(display_name)")
      .eq("group_id", groupId),
    supabase
      .from("group_roles")
      .select("id, name")
      .eq("group_id", groupId)
      .order("created_at"),
  ]);

  const grIds = (groupRoles ?? []).map((r) => r.id);
  const { data: memberRoles } = grIds.length > 0
    ? await supabase.from("member_roles").select("group_role_id, membership_id").in("group_role_id", grIds)
    : { data: [] as { group_role_id: string; membership_id: string }[] };

  const memberRoleMap: Record<string, string[]> = {};
  for (const mr of memberRoles ?? []) {
    if (!memberRoleMap[mr.membership_id]) memberRoleMap[mr.membership_id] = [];
    memberRoleMap[mr.membership_id].push(mr.group_role_id);
  }

  const roleOrder = ["leader", "moderator", "member"];
  const sorted = [...(members ?? [])]
    .sort((a, b) => roleOrder.indexOf(a.role as string) - roleOrder.indexOf(b.role as string))
    .map((m) => ({
      membershipId: m.id as string,
      userId: m.user_id,
      displayName: (m.profiles as unknown as { display_name: string } | null)?.display_name ?? "不明",
      role: m.role as string,
      version: m.version as number,
      grade: m.grade as number | null,
      assignedRoleIds: memberRoleMap[m.id as string] ?? [],
      isMe: m.user_id === user.id,
    }));

  const roles = (groupRoles ?? []).map((r) => ({ id: r.id, name: r.name }));

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}/settings`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">メンバー管理</h1>
        </div>

        <MemberManageList members={sorted} groupId={groupId} groupRoles={roles} />
      </div>
    </div>
  );
}
