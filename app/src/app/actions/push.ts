"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribePush(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        keys_json: { p256dh, auth },
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) return { error: "登録に失敗しました" };
  return {};
}

export async function unsubscribePush(
  endpoint: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return {};
}
