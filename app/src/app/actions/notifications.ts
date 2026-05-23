"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  error?: string;
};

export async function markNotificationsRead(
  groupId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("target_user_id", user.id)
    .eq("group_id", groupId)
    .eq("is_read", false);

  if (error) return { error: "既読更新に失敗しました" };

  revalidatePath(`/g/${groupId}/notifications`);
  return {};
}

export async function sendReminder(
  groupId: string,
  eventId: string,
  targetUserIds: string[],
  eventTitle: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    return { error: "権限者以上のみ催促できます" };
  }

  if (targetUserIds.length === 0) return { error: "催促対象がいません" };

  const notifications = targetUserIds.map((uid) => ({
    group_id: groupId,
    target_user_id: uid,
    type: "reminder" as const,
    message: `「${eventTitle}」の支払いが未完了です`,
    related_event_id: eventId,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) return { error: "催促通知の送信に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}
