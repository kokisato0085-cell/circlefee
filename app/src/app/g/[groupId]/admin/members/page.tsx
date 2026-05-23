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

  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, role, version, profiles(display_name)")
    .eq("group_id", groupId);

  const roleOrder = ["leader", "moderator", "member"];
  const sorted = [...(members ?? [])]
    .sort((a, b) => roleOrder.indexOf(a.role as string) - roleOrder.indexOf(b.role as string))
    .map((m) => ({
      userId: m.user_id,
      displayName: (m.profiles as unknown as { display_name: string }).display_name,
      role: m.role as string,
      version: m.version as number,
      isMe: m.user_id === user.id,
    }));

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}/settings`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">メンバー管理</h1>
        </div>

        <MemberManageList members={sorted} groupId={groupId} />
      </div>
    </div>
  );
}
