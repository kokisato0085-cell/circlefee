import { createClient } from "@/lib/supabase/server";

let cached: { sendNotification: Function } | null = null;

function getWebPush() {
  if (cached) return cached;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error("[web-push] VAPID keys not configured");
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpush = require("web-push");
    webpush.setVapidDetails("mailto:kokisato0085@gmail.com", publicKey, privateKey);
    cached = webpush;
    return webpush;
  } catch (err) {
    console.error("[web-push] Failed to load module:", err);
    return null;
  }
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const webpush = getWebPush();
  if (!webpush) return;

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
      await webpush.sendNotification({ endpoint: sub.endpoint, keys }, body);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("[web-push] Failed to send:", sub.endpoint, err);
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
