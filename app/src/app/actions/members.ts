"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  error?: string;
};

async function verifyLeader(supabase: Awaited<ReturnType<typeof createClient>>, groupId: string, userId: string) {
  const { data } = await supabase
    .from("memberships")
    .select("id, role, version")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  return data?.role === "leader" ? data : null;
}

export async function removeMember(
  groupId: string,
  targetUserId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  if (user.id === targetUserId) return { error: "自分自身は削除できません" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  const { data: groupEvents } = await supabase
    .from("events")
    .select("id")
    .eq("group_id", groupId);

  if (groupEvents && groupEvents.length > 0) {
    const eventIds = groupEvents.map((e) => e.id);
    await supabase
      .from("payment_statuses")
      .delete()
      .in("event_id", eventIds)
      .eq("user_id", targetUserId);
  }

  const { data: groupSpecialEvents } = await supabase
    .from("special_events")
    .select("id")
    .eq("group_id", groupId);

  if (groupSpecialEvents && groupSpecialEvents.length > 0) {
    const specialIds = groupSpecialEvents.map((e) => e.id);
    await supabase
      .from("special_payment_statuses")
      .delete()
      .in("special_event_id", specialIds)
      .eq("user_id", targetUserId);
    await supabase
      .from("special_event_roles")
      .delete()
      .in("special_event_id", specialIds)
      .eq("user_id", targetUserId);
  }

  await supabase
    .from("notifications")
    .delete()
    .eq("group_id", groupId)
    .eq("target_user_id", targetUserId);

  const { error: deleteError } = await supabase
    .from("memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);

  if (deleteError) return { error: "メンバー削除に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function changeRole(
  groupId: string,
  targetUserId: string,
  newRole: "moderator" | "member"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  if (user.id === targetUserId) return { error: "自分のロールは変更できません" };

  const { data: target } = await supabase
    .from("memberships")
    .select("id, version")
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .single();

  if (!target) return { error: "メンバーが見つかりません" };

  const { error } = await supabase
    .from("memberships")
    .update({ role: newRole, version: target.version + 1 })
    .eq("id", target.id)
    .eq("version", target.version);

  if (error) return { error: "更新に失敗しました。再度お試しください" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function transferLeader(
  groupId: string,
  newLeaderUserId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  if (user.id === newLeaderUserId) return { error: "自分に委譲はできません" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  const { data: target } = await supabase
    .from("memberships")
    .select("id, version")
    .eq("group_id", groupId)
    .eq("user_id", newLeaderUserId)
    .single();

  if (!target) return { error: "メンバーが見つかりません" };

  const { data: transferred, error: rpcError } = await supabase
    .rpc("transfer_leader", {
      p_group_id: groupId,
      p_old_leader_id: user.id,
      p_new_leader_id: newLeaderUserId,
      p_old_version: leader.version,
      p_new_version: target.version,
    });

  if (rpcError) return { error: "委譲に失敗しました。再度お試しください" };
  if (!transferred) return { error: "バージョン不一致。ページをリロードしてください" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function setGrade(
  groupId: string,
  targetUserId: string,
  grade: number | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  if (grade !== null && (grade < 1 || grade > 4)) return { error: "学年は1〜4で指定してください" };

  const { error } = await supabase
    .from("memberships")
    .update({ grade })
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);

  if (error) return { error: "学年の設定に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function createGroupRole(
  groupId: string,
  name: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) return { error: "係名は1〜20文字で入力してください" };

  const { error } = await supabase
    .from("group_roles")
    .insert({ group_id: groupId, name: trimmed });

  if (error) {
    if (error.code === "23505") return { error: "同じ名前の係が既に存在します" };
    return { error: "係の作成に失敗しました" };
  }

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function deleteGroupRole(
  groupId: string,
  roleId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  const { error } = await supabase
    .from("group_roles")
    .delete()
    .eq("id", roleId)
    .eq("group_id", groupId);

  if (error) return { error: "係の削除に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function assignMemberRole(
  groupId: string,
  membershipId: string,
  groupRoleId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  const { error } = await supabase
    .from("member_roles")
    .insert({ group_role_id: groupRoleId, membership_id: membershipId });

  if (error) {
    if (error.code === "23505") return { error: "既に割り当て済みです" };
    return { error: "係の割り当てに失敗しました" };
  }

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function removeMemberRole(
  groupId: string,
  membershipId: string,
  groupRoleId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const leader = await verifyLeader(supabase, groupId, user.id);
  if (!leader) return { error: "部長のみ実行できます" };

  const { error } = await supabase
    .from("member_roles")
    .delete()
    .eq("group_role_id", groupRoleId)
    .eq("membership_id", membershipId);

  if (error) return { error: "係の解除に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}
