"use server";

import { createClient } from "@/lib/supabase/server";
import { accountEntrySchema, expenseCategorySchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  error?: string;
};

async function requireAuthorized(supabase: Awaited<ReturnType<typeof createClient>>, groupId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" as const, user: null, role: null };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    return { error: "権限者以上のみ操作できます" as const, user: null, role: null };
  }

  return { error: null, user, role: membership.role };
}

export async function createAccountEntry(
  groupId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = accountEntrySchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    date: formData.get("date"),
    eventId: formData.get("eventId"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const auth = await requireAuthorized(supabase, groupId);
  if (auth.error) return { error: auth.error };

  const insertData: Record<string, unknown> = {
    group_id: groupId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    description: parsed.data.description,
    date: parsed.data.date,
    created_by: auth.user!.id,
  };

  if (parsed.data.eventId) insertData.event_id = parsed.data.eventId;
  if (parsed.data.categoryId && parsed.data.type === "expense") {
    insertData.category_id = parsed.data.categoryId;
  }

  const { error } = await supabase.from("account_entries").insert(insertData);

  if (error) return { error: "登録に失敗しました" };

  revalidatePath(`/g/${groupId}/accounting`);
  return {};
}

export async function updateAccountEntry(
  groupId: string,
  entryId: string,
  version: number,
  formData: FormData
): Promise<ActionResult> {
  const parsed = accountEntrySchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    date: formData.get("date"),
    eventId: formData.get("eventId"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const auth = await requireAuthorized(supabase, groupId);
  if (auth.error) return { error: auth.error };

  const updateData: Record<string, unknown> = {
    type: parsed.data.type,
    amount: parsed.data.amount,
    description: parsed.data.description,
    date: parsed.data.date,
    event_id: parsed.data.eventId,
    category_id: parsed.data.type === "expense" ? parsed.data.categoryId : null,
    version: version + 1,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("account_entries")
    .update(updateData)
    .eq("id", entryId)
    .eq("group_id", groupId)
    .eq("version", version)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "更新に失敗しました（他のユーザーが先に更新した可能性があります）" };
  }

  revalidatePath(`/g/${groupId}/accounting`);
  return {};
}

export async function deleteAccountEntry(
  groupId: string,
  entryId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthorized(supabase, groupId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabase
    .from("account_entries")
    .delete()
    .eq("id", entryId)
    .eq("group_id", groupId);

  if (error) return { error: "削除に失敗しました" };

  revalidatePath(`/g/${groupId}/accounting`);
  return {};
}

export async function confirmEventIncome(
  groupId: string,
  eventId: string,
  amount: number,
  description: string
): Promise<ActionResult> {
  if (amount < 1) return { error: "金額は1円以上です" };
  if (!description || description.length > 200) return { error: "説明は1〜200文字です" };

  const supabase = await createClient();
  const auth = await requireAuthorized(supabase, groupId);
  if (auth.error) return { error: auth.error };

  const { data: event } = await supabase
    .from("events")
    .select("id, group_id")
    .eq("id", eventId)
    .eq("group_id", groupId)
    .single();

  if (!event) return { error: "イベントが見つかりません" };

  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = jst.toISOString().split("T")[0];

  const { error } = await supabase.from("account_entries").insert({
    group_id: groupId,
    type: "income",
    amount,
    description,
    date: today,
    event_id: eventId,
    created_by: auth.user!.id,
  });

  if (error) return { error: "入金確定に失敗しました" };

  revalidatePath(`/g/${groupId}/accounting`);
  revalidatePath(`/g/${groupId}/events/${eventId}`);
  return {};
}

export async function createExpenseCategory(
  groupId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = expenseCategorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const auth = await requireAuthorized(supabase, groupId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabase.from("expense_categories").insert({
    group_id: groupId,
    name: parsed.data.name,
    created_by: auth.user!.id,
  });

  if (error) return { error: "カテゴリの作成に失敗しました" };

  revalidatePath(`/g/${groupId}/accounting/categories`);
  revalidatePath(`/g/${groupId}/accounting`);
  return {};
}

export async function deleteExpenseCategory(
  groupId: string,
  categoryId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthorized(supabase, groupId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", categoryId)
    .eq("group_id", groupId);

  if (error) return { error: "カテゴリの削除に失敗しました" };

  revalidatePath(`/g/${groupId}/accounting/categories`);
  revalidatePath(`/g/${groupId}/accounting`);
  return {};
}
