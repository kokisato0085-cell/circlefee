import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { EventsSection } from "./events-section";
import { SpecialEventsSection } from "./special-events-section";
import { LeaderSection } from "./leader-section";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: membership }, { data: group }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .single(),
  ]);

  if (!membership) redirect("/groups");

  const isLeaderOrMod = membership.role === "leader" || membership.role === "moderator";
  const isLeader = membership.role === "leader";

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{group?.name}</h1>
          <Link href="/groups">
            <Button variant="ghost" size="sm">切替</Button>
          </Link>
        </div>

        <Suspense fallback={<EventsSkeleton />}>
          <EventsSection groupId={groupId} isLeaderOrMod={isLeaderOrMod} />
        </Suspense>

        <Suspense fallback={<SpecialEventsSkeleton />}>
          <SpecialEventsSection groupId={groupId} isLeaderOrMod={isLeaderOrMod} />
        </Suspense>

        <Link href={`/g/${groupId}/dashboard`}>
          <Button variant="outline" className="w-full">
            会計ダッシュボード
          </Button>
        </Link>

        <Link href={`/g/${groupId}/accounting`}>
          <Button variant="outline" className="w-full">
            会計帳簿
          </Button>
        </Link>

        {isLeaderOrMod && (
          <Link href={`/g/${groupId}/approve`}>
            <Button variant="outline" className="w-full">
              支払い承認画面へ
            </Button>
          </Link>
        )}

        {isLeader && (
          <Suspense fallback={<LeaderSkeleton />}>
            <LeaderSection groupId={groupId} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function SpecialEventsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}

function LeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
      <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}
