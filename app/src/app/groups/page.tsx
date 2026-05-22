import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GroupList } from "./group-list";
import { CreateGroupForm } from "./create-group-form";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("group_id, role, groups(id, name)")
    .eq("user_id", user.id);

  const groups = (memberships ?? []).map((m) => ({
    id: (m.groups as unknown as { id: string }).id,
    name: (m.groups as unknown as { name: string }).name,
    role: m.role as string,
  }));

  return (
    <div className="flex min-h-full items-start justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">グループ</h1>
        <GroupList groups={groups} />
        <CreateGroupForm />
      </div>
    </div>
  );
}
