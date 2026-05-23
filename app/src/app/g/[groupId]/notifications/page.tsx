import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, message, is_read, related_event_id, created_at")
    .eq("group_id", groupId)
    .eq("target_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (notifications ?? []).map((n) => ({
    id: n.id,
    type: n.type as string,
    message: n.message,
    isRead: n.is_read,
    relatedEventId: n.related_event_id as string | null,
    createdAt: n.created_at,
  }));

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">通知</h1>
        <NotificationList
          notifications={items}
          groupId={groupId}
          hasUnread={hasUnread}
        />
      </div>
    </div>
  );
}
