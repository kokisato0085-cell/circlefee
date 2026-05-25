"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeProvider({
  groupId,
  userId,
  eventIds,
}: {
  groupId: string;
  userId: string;
  eventIds: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const eventIdSet = new Set(eventIds);

    const channel = supabase
      .channel(`group_${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `group_id=eq.${groupId}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_statuses" },
        (payload) => {
          const eventId = (payload.new as Record<string, unknown>)?.event_id
            ?? (payload.old as Record<string, unknown>)?.event_id;
          if (eventId && eventIdSet.has(eventId as string)) {
            router.refresh();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `target_user_id=eq.${userId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, userId, eventIds, router]);

  return null;
}
