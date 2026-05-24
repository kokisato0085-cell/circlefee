"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  error?: string;
};

export async function updateDisplayName(
  displayName: string
): Promise<ActionResult> {
  if (!displayName || displayName.length < 1 || displayName.length > 20) {
    return { error: "表示名は1〜20文字です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath("/settings");
  return {};
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  if (!newPassword || newPassword.length < 8) {
    return { error: "新しいパスワードは8文字以上です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInError) return { error: "現在のパスワードが正しくありません" };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: "パスワードの更新に失敗しました" };

  return {};
}

export async function deleteAccount(
  password: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (signInError) return { error: "パスワードが正しくありません" };

  const { data: leaderGroups } = await supabase
    .from("memberships")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("role", "leader");

  if (leaderGroups && leaderGroups.length > 0) {
    return { error: "部長のグループがあります。先に部長を委譲してください" };
  }

  const { error: rpcError } = await supabase.rpc("anonymize_user", { p_user_id: user.id });
  if (rpcError) return { error: `削除処理エラー: ${rpcError.message}` };

  await supabase.auth.signOut();
  redirect("/login");
}
