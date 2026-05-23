import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  "mailto:kokisato0085@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, keys_json")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  for (const sub of subscriptions) {
    const keys = sub.keys_json as { p256dh: string; auth: string };
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys },
        body
      );
    } catch (err: unknown) {
      if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  await Promise.allSettled(userIds.map((uid) => sendPushToUser(uid, payload)));
}
