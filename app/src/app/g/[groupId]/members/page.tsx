import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, role, profiles(display_name)")
    .eq("group_id", groupId)
    .order("role");

  const roleLabels: Record<string, string> = {
    leader: "部長",
    moderator: "権限者",
    member: "一般員",
  };

  const roleOrder = ["leader", "moderator", "member"];
  const sorted = [...(members ?? [])].sort(
    (a, b) => roleOrder.indexOf(a.role as string) - roleOrder.indexOf(b.role as string)
  );

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">メンバー ({sorted.length}人)</h1>
        <div className="space-y-2">
          {sorted.map((m) => {
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
    </div>
  );
}
