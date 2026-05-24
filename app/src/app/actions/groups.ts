"use server";

import { createClient } from "@/lib/supabase/server";
import { createGroupSchema, joinGroupSchema } from "@/lib/validations";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export type ActionResult = {
  error?: string;
  inviteUrl?: string;
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

  const { data: inviteInfo, error: rpcError } = await supabase
    .rpc("get_invite_group_info", { invite_token: token });

  if (rpcError || !inviteInfo || inviteInfo.length === 0) {
    return { error: "招待リンクが見つかりません" };
  }

  const invite = inviteInfo[0];

  if (new Date(invite.expires_at) < new Date()) {
    return { error: "この招待リンクは期限切れです" };
  }

  const passwordValid = await bcrypt.compare(parsed.data.password, invite.password_hash);
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

export async function createInviteLink(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const isLeader = await supabase
    .from("memberships")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .eq("role", "leader")
    .single();

  if (!isLeader.data) return { error: "部長のみ招待リンクを生成できます" };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("invite_links")
    .insert({ group_id: groupId, expires_at: expiresAt.toISOString() })
    .select("token")
    .single();

  if (error) return { error: "招待リンクの生成に失敗しました" };

  return { inviteUrl: `/invite/${data.token}` };
}

export async function updateGroupName(
  groupId: string,
  name: string
): Promise<ActionResult> {
  if (!name || name.length < 1 || name.length > 30) {
    return { error: "グループ名は1〜30文字です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "leader") {
    return { error: "部長のみグループ名を変更できます" };
  }

  const { error } = await supabase
    .from("groups")
    .update({ name })
    .eq("id", groupId);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function updateGroupPassword(
  groupId: string,
  newPassword: string
): Promise<ActionResult> {
  if (!newPassword || newPassword.length < 4 || newPassword.length > 20 || !/^[a-zA-Z0-9]+$/.test(newPassword)) {
    return { error: "パスワードは4〜20文字の英数字です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "leader") {
    return { error: "部長のみパスワードを変更できます" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { error } = await supabase
    .from("groups")
    .update({ password_hash: passwordHash })
    .eq("id", groupId);

  if (error) return { error: "更新に失敗しました" };

  return {};
}

export async function handleJoinRequest(
  requestId: string,
  action: "approve" | "reject"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { data: request, error: fetchError } = await supabase
    .from("join_requests")
    .select("id, group_id, user_id, status")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) return { error: "リクエストが見つかりません" };
  if (request.status !== "pending") return { error: "このリクエストは既に処理済みです" };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", request.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "leader") {
    return { error: "部長のみリクエストを処理できます" };
  }

  const { error: updateError } = await supabase
    .from("join_requests")
    .update({ status: action === "approve" ? "approved" : "rejected" })
    .eq("id", requestId);

  if (updateError) return { error: "リクエストの更新に失敗しました" };

  if (action === "approve") {
    const { error: memberError } = await supabase
      .from("memberships")
      .insert({
        group_id: request.group_id,
        user_id: request.user_id,
        role: "member",
      });

    if (memberError) return { error: "メンバー追加に失敗しました" };
  }

  revalidatePath(`/g/${request.group_id}`);
  return {};
}
