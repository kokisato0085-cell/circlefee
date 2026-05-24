import { createClient } from "@/lib/supabase/server";

let initialized = false;

async function getWebPush() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpush = require("web-push");
  if (!initialized) {
    webpush.setVapidDetails(
      "mailto:kokisato0085@gmail.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    initialized = true;
  }
  return webpush;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const supabase = await createClient();

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys_json")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) return;

    const webpush = await getWebPush();
    const body = JSON.stringify(payload);

    for (const sub of subscriptions) {
      const keys = sub.keys_json as { p256dh: string; auth: string };
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys }, body);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  } catch {
    // Push送信失敗はアプリの動作を妨げない
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  await Promise.allSettled(userIds.map((uid) => sendPushToUser(uid, payload)));
}
