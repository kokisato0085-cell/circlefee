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

  const { error: updateError } = await supabase
    .from("payment_statuses")
    .update({ status: newStatus, version: ps.version + 1, updated_at: new Date().toISOString() })
    .eq("id", ps.id)
    .eq("version", ps.version);

  if (updateError) return { error: "更新に失敗しました。再度お試しください" };

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
