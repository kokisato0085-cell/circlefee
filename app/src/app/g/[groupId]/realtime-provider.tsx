"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeProvider({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

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
        () => router.refresh()
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
  }, [groupId, userId, router]);

  return null;
}
