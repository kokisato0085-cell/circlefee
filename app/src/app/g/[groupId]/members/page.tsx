import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const gradeLabels: Record<number, string> = { 1: "1年", 2: "2年", 3: "3年", 4: "4年" };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: members }, { data: groupRoles }, { data: memberRoles }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, role, grade, profiles(display_name)")
      .eq("group_id", groupId),
    supabase
      .from("group_roles")
      .select("id, name")
      .eq("group_id", groupId)
      .order("created_at"),
    supabase
      .from("member_roles")
      .select("group_role_id, membership_id"),
  ]);

  const roleMap: Record<string, string[]> = {};
  for (const mr of memberRoles ?? []) {
    if (!roleMap[mr.membership_id]) roleMap[mr.membership_id] = [];
    roleMap[mr.membership_id].push(mr.group_role_id);
  }

  const grMap = Object.fromEntries((groupRoles ?? []).map((r) => [r.id, r.name]));

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
            const grade = m.grade as number | null;
            const assignedRoles = (roleMap[m.id as string] ?? [])
              .map((rid) => grMap[rid])
              .filter(Boolean);
            return (
              <div
                key={m.user_id}
                className="flex items-center justify-between bg-white border rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{profile.display_name}</span>
                  {grade && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{gradeLabels[grade]}</span>
                  )}
                  {assignedRoles.map((name) => (
                    <span key={name} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{name}</span>
                  ))}
                </div>
                <span className="text-sm text-gray-500 shrink-0 ml-2">
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
