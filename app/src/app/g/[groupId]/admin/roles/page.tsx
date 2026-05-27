import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TransferLeaderList } from "./transfer-leader-list";

export default async function AdminRolesPage({
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
    .select("user_id, role, profiles(display_name)")
    .eq("group_id", groupId)
    .neq("user_id", user.id);

  const candidates = (members ?? []).map((m) => ({
    userId: m.user_id,
    displayName: (m.profiles as unknown as { display_name: string } | null)?.display_name ?? "不明",
    role: m.role as string,
  }));

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}/settings`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">部長委譲</h1>
        </div>

        <p className="text-sm text-gray-500">
          部長の権限を他のメンバーに委譲します。この操作は取り消せません。
        </p>

        <TransferLeaderList candidates={candidates} groupId={groupId} />
      </div>
    </div>
  );
}
