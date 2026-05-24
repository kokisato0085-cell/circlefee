"use server";

import { createClient } from "@/lib/supabase/server";
import { createEventSchema, pollSchema } from "@/lib/validations";
import { sendPushToUsers, sendPushToUser } from "@/lib/web-push";
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

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
      return { error: "権限者以上のみイベントを作成できます" };
    }

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

      const otherMembers = members.filter((m) => m.user_id !== user.id);
      if (otherMembers.length > 0) {
        const notifications = otherMembers.map((m) => ({
          group_id: groupId,
          target_user_id: m.user_id,
          type: "event_created" as const,
          message: `新しい集金「${parsed.data.title}」が作成されました`,
          related_event_id: event.id,
        }));
        try {
          await supabase.from("notifications").insert(notifications);
          sendPushToUsers(
            otherMembers.map((m) => m.user_id),
            {
              title: "新しい集金",
              body: `「${parsed.data.title}」が作成されました`,
              url: `/g/${groupId}/events/${event.id}`,
            }
          );
        } catch { /* 通知失敗はイベント作成を妨げない */ }
      }
    }

    const pollQuestion = formData.get("pollQuestion") as string | null;
    const pollOptions = formData.getAll("pollOption") as string[];
    if (pollQuestion?.trim()) {
      const validOptions = pollOptions.filter((o) => o.trim());
      const pollParsed = pollSchema.safeParse({ question: pollQuestion, options: validOptions });
      if (pollParsed.success) {
        const { data: poll } = await supabase
          .from("event_polls")
          .insert({ event_id: event.id, question: pollParsed.data.question })
          .select("id")
          .single();

        if (poll) {
          const optionRows = pollParsed.data.options.map((label, i) => ({
            poll_id: poll.id,
            label,
            sort_order: i,
          }));
          await supabase.from("event_poll_options").insert(optionRows);
        }
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
    sendPushToUsers(
      mods.map((m) => m.user_id),
      {
        title: "支払い申告",
        body: `${profile?.display_name ?? "メンバー"}が「${event.title}」の支払いを申告しました`,
        url: `/g/${groupId}/events/${eventId}`,
      }
    );
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

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    return { error: "権限者以上のみ承認できます" };
  }

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
    sendPushToUser(psDetail.user_id, {
      title: action === "approve" ? "支払い承認" : "支払い差戻し",
      body: msg,
      url: `/g/${groupId}/events/${psDetail.event_id}`,
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

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    return { error: "権限者以上のみサブステータスを編集できます" };
  }

  if (subStatus.length > 50) return { error: "サブステータスは50文字以内です" };

  const { error } = await supabase
    .from("payment_statuses")
    .update({ sub_status: subStatus || null })
    .eq("id", paymentStatusId);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function updateEvent(
  eventId: string,
  groupId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    description: formData.get("description"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

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
    return { error: "権限者以上のみ編集できます" };
  }

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.data.title,
      amount: parsed.data.amount,
      due_date: parsed.data.dueDate,
      description: parsed.data.description,
    })
    .eq("id", eventId)
    .eq("group_id", groupId);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/g/${groupId}/events/${eventId}`);
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

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    return { error: "権限者以上のみ金額を調整できます" };
  }

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
