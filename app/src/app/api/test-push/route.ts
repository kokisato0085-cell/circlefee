import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/web-push";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id);

  await sendPushToUser(user.id, {
    title: "テスト通知",
    body: "Push通知が正常に動作しています！",
    url: "/groups",
  });

  return NextResponse.json({
    subscriptions: subs?.length ?? 0,
    status: "sent",
  });
}
