"use server";

import { createClient } from "@/lib/supabase/server";
import { createGroupSchema, joinGroupSchema } from "@/lib/validations";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export type ActionResult = {
  error?: string;
};

export async function createGroup(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = createGroupSchema.safeParse({
      name: formData.get("name"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "認証エラー" };

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const { data: groupId, error: rpcError } = await supabase
      .rpc("create_group_with_leader", {
        group_name: parsed.data.name,
        group_password_hash: passwordHash,
        caller_user_id: user.id,
      });

    if (rpcError) return { error: `グループ作成エラー: ${rpcError.message}` };

    redirect(`/g/${groupId}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { error: `予期しないエラー: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function submitJoinRequest(
  token: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = joinGroupSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインしてください" };

  const { data: invite, error: inviteError } = await supabase
    .from("invite_links")
    .select("group_id, expires_at, groups(password_hash)")
    .eq("token", token)
    .single();

  if (inviteError || !invite) {
    return { error: "招待リンクが見つかりません" };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { error: "この招待リンクは期限切れです" };
  }

  const group = invite.groups as unknown as { password_hash: string };
  const passwordValid = await bcrypt.compare(parsed.data.password, group.password_hash);
  if (!passwordValid) {
    return { error: "パスワードが正しくありません" };
  }

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("group_id", invite.group_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return { error: "すでにこのグループに所属しています" };
  }

  const { error: joinError } = await supabase
    .from("join_requests")
    .insert({ group_id: invite.group_id, user_id: user.id });

  if (joinError) {
    if (joinError.code === "23505") {
      return { error: "すでに参加リクエストを送信済みです" };
    }
    return { error: "参加リクエストの送信に失敗しました" };
  }

  return {};
}
