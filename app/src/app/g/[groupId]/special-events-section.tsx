import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function SpecialEventsSection({
  groupId,
  isLeader,
}: {
  groupId: string;
  isLeader: boolean;
}) {
  const supabase = await createClient();

  const { data: specialEvents } = await supabase
    .from("special_events")
    .select("id, title, amount, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">特別イベント</h2>
        {isLeader && (
          <Link href={`/g/${groupId}/special/new`}>
            <Button size="sm">+ 作成</Button>
          </Link>
        )}
      </div>
      {(!specialEvents || specialEvents.length === 0) ? (
        <p className="text-sm text-gray-500">特別イベントはありません</p>
      ) : (
        <div className="space-y-3">
          {specialEvents.map((se) => (
            <Link key={se.id} href={`/g/${groupId}/special/${se.id}`}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{se.title}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">特別</span>
                    </div>
                    <span className="text-sm font-semibold">{se.amount.toLocaleString()}円</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
