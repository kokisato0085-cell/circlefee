import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, keys_json")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "no subscriptions", userId: user.id });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpush = require("web-push");
  webpush.setVapidDetails("mailto:kokisato0085@gmail.com", publicKey, privateKey);

  const results = [];
  for (const sub of subs) {
    const keys = sub.keys_json as { p256dh: string; auth: string };
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys },
        JSON.stringify({
          title: "テストプッシュ",
          body: `サーバーから送信 ${new Date().toLocaleTimeString("ja-JP")}`,
          url: "/",
        })
      );
      results.push({ endpoint: sub.endpoint.slice(-20), status: "sent" });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      results.push({
        endpoint: sub.endpoint.slice(-20),
        status: "error",
        code: e.statusCode,
        msg: e.message?.slice(0, 100),
      });
    }
  }

  return NextResponse.json({ subscriptions: subs.length, results });
}
