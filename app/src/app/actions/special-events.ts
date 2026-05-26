"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/web-push";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  error?: string;
};

export async function createSpecialEvent(
  groupId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const title = formData.get("title") as string;
    const amount = parseInt(formData.get("amount") as string, 10);
    const description = formData.get("description") as string;

    if (!title || title.length < 1 || title.length > 50) return { error: "タイトルは1〜50文字です" };
    if (isNaN(amount) || amount < 1 || amount > 999999) return { error: "金額は1〜999,999円です" };
    if (description && description.length > 200) return { error: "説明は200文字以内です" };

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
      return { error: "部長のみ特別イベントを作成できます" };
    }

    const { data: event, error: insertError } = await supabase
      .from("special_events")
      .insert({
        group_id: groupId,
        title,
        amount,
        description: description || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) return { error: `作成エラー: ${insertError.message}` };

    const { data: members } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("group_id", groupId);

    if (members && members.length > 0) {
      const statuses = members.map((m) => ({
        special_event_id: event.id,
        user_id: m.user_id,
      }));
      await supabase.from("special_payment_statuses").insert(statuses);

      const otherMembers = members.filter((m) => m.user_id !== user.id);
      if (otherMembers.length > 0) {
        try {
          const notifications = otherMembers.map((m) => ({
            group_id: groupId,
            target_user_id: m.user_id,
            type: "event_created" as const,
            message: `特別イベント「${title}」が作成されました`,
          }));
          await supabase.from("notifications").insert(notifications);
          await sendPushToUsers(
            otherMembers.map((m) => m.user_id),
            { title: "特別イベント", body: `「${title}」が作成されました`, url: `/g/${groupId}/special/${event.id}` }
          );
        } catch { /* 通知失敗は無視 */ }
      }
    }

    redirect(`/g/${groupId}/special/${event.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { error: `予期しないエラー: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function deleteSpecialEvent(
  specialEventId: string,
  groupId: string
): Promise<ActionResult> {
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
    return { error: "部長のみ特別イベントを削除できます" };
  }

  const { error } = await supabase
    .from("special_events")
    .delete()
    .eq("id", specialEventId)
    .eq("group_id", groupId);

  if (error) return { error: "削除に失敗しました" };

  redirect(`/g/${groupId}`);
}

export async function addSpecialEventRole(
  specialEventId: string,
  targetUserId: string,
  groupId: string
): Promise<ActionResult> {
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
    return { error: "部長のみフォーム内権限者を設定できます" };
  }

  const { error } = await supabase
    .from("special_event_roles")
    .insert({ special_event_id: specialEventId, user_id: targetUserId });

  if (error) {
    if (error.code === "23505") return { error: "既に権限者です" };
    return { error: "追加に失敗しました" };
  }

  revalidatePath(`/g/${groupId}/special/${specialEventId}`);
  return {};
}

export async function removeSpecialEventRole(
  specialEventId: string,
  targetUserId: string,
  groupId: string
): Promise<ActionResult> {
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
    return { error: "部長のみフォーム内権限者を削除できます" };
  }

  const { error } = await supabase
    .from("special_event_roles")
    .delete()
    .eq("special_event_id", specialEventId)
    .eq("user_id", targetUserId);

  if (error) return { error: "削除に失敗しました" };

  revalidatePath(`/g/${groupId}/special/${specialEventId}`);
  return {};
}

export async function claimSpecialPayment(
  specialEventId: string,
  groupId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { data: ps } = await supabase
    .from("special_payment_statuses")
    .select("id, status, version")
    .eq("special_event_id", specialEventId)
    .eq("user_id", user.id)
    .single();

  if (!ps) return { error: "ステータスが見つかりません" };
  if (ps.status !== "unpaid") return { error: "申告済みまたは支払い済みです" };

  const { data: updated, error } = await supabase
    .from("special_payment_statuses")
    .update({ status: "claimed", version: ps.version + 1, updated_at: new Date().toISOString() })
    .eq("id", ps.id)
    .eq("version", ps.version)
    .select("id")
    .maybeSingle();

  if (error) return { error: "更新に失敗しました" };
  if (!updated) return { error: "データが更新されています。ページを再読み込みしてください" };

  revalidatePath(`/g/${groupId}/special/${specialEventId}`);
  return {};
}

export async function approveSpecialPayment(
  paymentStatusId: string,
  groupId: string,
  specialEventId: string,
  action: "approve" | "reject"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const [{ data: membership }, { data: eventRole }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("special_event_roles")
      .select("id")
      .eq("special_event_id", specialEventId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isLeaderOrMod = membership?.role === "leader" || membership?.role === "moderator";
  if (!isLeaderOrMod && !eventRole) {
    return { error: "権限者以上またはフォーム内権限者のみ承認できます" };
  }

  const { data: ps } = await supabase
    .from("special_payment_statuses")
    .select("id, status, version, user_id")
    .eq("id", paymentStatusId)
    .single();

  if (!ps) return { error: "ステータスが見つかりません" };

  const newStatus = action === "approve" ? "paid" : "unpaid";
  if (action === "approve" && ps.status !== "claimed") {
    return { error: "申告中のステータスのみ承認できます" };
  }
  if (action === "reject" && ps.status !== "claimed") {
    return { error: "申告中のステータスのみ差し戻しできます" };
  }

  const { data: updated, error } = await supabase
    .from("special_payment_statuses")
    .update({ status: newStatus, version: ps.version + 1, updated_at: new Date().toISOString() })
    .eq("id", ps.id)
    .eq("version", ps.version)
    .select("id")
    .maybeSingle();

  if (error) return { error: "更新に失敗しました" };
  if (!updated) return { error: "データが更新されています。ページを再読み込みしてください" };

  revalidatePath(`/g/${groupId}/special/${specialEventId}`);
  return {};
}
