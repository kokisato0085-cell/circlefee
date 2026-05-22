import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex min-h-full flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold">{group?.name}</h1>
        <p className="mt-2 text-gray-500">
          ホーム画面（Phase 2で実装予定）
        </p>
      </div>
    </div>
  );
}
