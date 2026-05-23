"use server";

import { createClient } from "@/lib/supabase/server";
import { createEventSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  error?: string;
};

export async function createEvent(
  groupId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const parsed = createEventSchema.safeParse({
      title: formData.get("title"),
      amount: formData.get("amount"),
      dueDate: formData.get("dueDate"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "認証エラー" };

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: event, error: insertError } = await supabase
      .from("events")
      .insert({
        group_id: groupId,
        title: parsed.data.title,
        amount: parsed.data.amount,
        due_date: parsed.data.dueDate,
        description: parsed.data.description,
        month,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) return { error: `イベント作成エラー: ${insertError.message}` };

    const { data: members } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("group_id", groupId);

    if (members && members.length > 0) {
      const statuses = members.map((m) => ({
        event_id: event.id,
        user_id: m.user_id,
      }));
      await supabase.from("payment_statuses").insert(statuses);

      const notifications = members
        .filter((m) => m.user_id !== user.id)
        .map((m) => ({
          group_id: groupId,
          target_user_id: m.user_id,
          type: "event_created" as const,
          message: `新しい集金「${parsed.data.title}」が作成されました`,
          related_event_id: event.id,
        }));
      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    }

    redirect(`/g/${groupId}/events/${event.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { error: `予期しないエラー: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function claimPayment(
  eventId: string,
  groupId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { data: ps, error: fetchError } = await supabase
    .from("payment_statuses")
    .select("id, status, version")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !ps) return { error: "支払いステータスが見つかりません" };
  if (ps.status !== "unpaid") return { error: "申告済みまたは支払い済みです" };

  const { error: updateError } = await supabase
    .from("payment_statuses")
    .update({ status: "claimed", version: ps.version + 1, updated_at: new Date().toISOString() })
    .eq("id", ps.id)
    .eq("version", ps.version);

  if (updateError) return { error: "更新に失敗しました。再度お試しください" };

  const [{ data: profile }, { data: event }, { data: mods }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("events").select("group_id, title").eq("id", eventId).single(),
    supabase
      .from("memberships")
      .select("user_id")
      .eq("group_id", groupId)
      .in("role", ["leader", "moderator"]),
  ]);

  if (event && mods && mods.length > 0) {
    const notifications = mods.map((m) => ({
      group_id: groupId,
      target_user_id: m.user_id,
      type: "payment_claimed" as const,
      message: `${profile?.display_name ?? "メンバー"}が「${event.title}」の支払いを申告しました`,
      related_event_id: eventId,
    }));
    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  return {};
}

export async function approvePayment(
  paymentStatusId: string,
  groupId: string,
  action: "approve" | "reject"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { data: ps, error: fetchError } = await supabase
    .from("payment_statuses")
    .select("id, status, version, event_id")
    .eq("id", paymentStatusId)
    .single();

  if (fetchError || !ps) return { error: "ステータスが見つかりません" };

  const newStatus = action === "approve" ? "paid" : "unpaid";

  if (action === "approve" && ps.status !== "claimed") {
    return { error: "申告中のステータスのみ承認できます" };
  }

  const { data: psDetail } = await supabase
    .from("payment_statuses")
    .select("user_id, event_id, events(title)")
    .eq("id", paymentStatusId)
    .single();

  const { error: updateError } = await supabase
    .from("payment_statuses")
    .update({ status: newStatus, version: ps.version + 1, updated_at: new Date().toISOString() })
    .eq("id", ps.id)
    .eq("version", ps.version);

  if (updateError) return { error: "更新に失敗しました。再度お試しください" };

  if (psDetail) {
    const ev = psDetail.events as unknown as { title: string };
    const notifType = action === "approve" ? "payment_approved" : "payment_rejected";
    const msg = action === "approve"
      ? `「${ev.title}」の支払いが承認されました`
      : `「${ev.title}」の支払い申告が差し戻されました`;

    await supabase.from("notifications").insert({
      group_id: groupId,
      target_user_id: psDetail.user_id,
      type: notifType,
      message: msg,
      related_event_id: psDetail.event_id,
    });
  }

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function updateSubStatus(
  paymentStatusId: string,
  subStatus: string,
  groupId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  if (subStatus.length > 50) return { error: "サブステータスは50文字以内です" };

  const { error } = await supabase
    .from("payment_statuses")
    .update({ sub_status: subStatus || null })
    .eq("id", paymentStatusId);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function deleteEvent(
  eventId: string,
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

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    return { error: "権限者以上のみ削除できます" };
  }

  const { error: deleteStatusesError } = await supabase
    .from("payment_statuses")
    .delete()
    .eq("event_id", eventId);

  if (deleteStatusesError) return { error: "支払いデータの削除に失敗しました" };

  const { error: deleteEventError } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("group_id", groupId);

  if (deleteEventError) return { error: "イベント削除に失敗しました" };

  redirect(`/g/${groupId}`);
}

export async function adjustPaymentAmount(
  paymentStatusId: string,
  amount: number,
  groupId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  if (amount < 0 || amount > 999999) return { error: "金額は0〜999,999円です" };

  const { data: ps } = await supabase
    .from("payment_statuses")
    .select("user_id")
    .eq("id", paymentStatusId)
    .single();

  if (!ps) return { error: "ステータスが見つかりません" };

  const { data: eligible } = await supabase
    .rpc("check_consecutive_unpaid", {
      p_group_id: groupId,
      p_user_id: ps.user_id,
    });

  if (!eligible) return { error: "2ヶ月連続未払いのメンバーのみ金額調整できます" };

  const { error } = await supabase
    .from("payment_statuses")
    .update({ adjusted_amount: amount })
    .eq("id", paymentStatusId);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}
