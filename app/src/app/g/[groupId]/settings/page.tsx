import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./logout-button";

export default async function SettingsPage({
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

  const isLeader = membership?.role === "leader";

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold">設定</h1>

        <Link href="/groups">
          <Button variant="outline" className="w-full">グループ切替</Button>
        </Link>

        {isLeader && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm font-semibold text-gray-500">管理 (部長)</p>
            <p className="text-sm text-gray-400">Phase 3 で実装予定</p>
          </div>
        )}

        <div className="pt-4 border-t">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
