"use server";

import { createClient } from "@/lib/supabase/server";
import { pollSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  error?: string;
};

export async function createPoll(
  eventId: string,
  groupId: string,
  question: string,
  options: string[]
): Promise<ActionResult> {
  const parsed = pollSchema.safeParse({ question, options });
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
    return { error: "権限者以上のみ投票を作成できます" };
  }

  const { data: existing } = await supabase
    .from("event_polls")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) return { error: "このイベントには既に投票があります" };

  const { data: poll, error: pollError } = await supabase
    .from("event_polls")
    .insert({ event_id: eventId, question: parsed.data.question })
    .select("id")
    .single();

  if (pollError) return { error: "投票作成に失敗しました" };

  const optionRows = parsed.data.options.map((label, i) => ({
    poll_id: poll.id,
    label,
    sort_order: i,
  }));

  const { error: optError } = await supabase
    .from("event_poll_options")
    .insert(optionRows);

  if (optError) return { error: "選択肢の作成に失敗しました" };

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  return {};
}

export async function updatePoll(
  pollId: string,
  groupId: string,
  eventId: string,
  question: string,
  options: string[]
): Promise<ActionResult> {
  const parsed = pollSchema.safeParse({ question, options });
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

  const { error: qError } = await supabase
    .from("event_polls")
    .update({ question: parsed.data.question })
    .eq("id", pollId);

  if (qError) return { error: "質問文の更新に失敗しました" };

  await supabase.from("event_poll_votes").delete().eq("poll_id", pollId);
  await supabase.from("event_poll_options").delete().eq("poll_id", pollId);

  const optionRows = parsed.data.options.map((label, i) => ({
    poll_id: pollId,
    label,
    sort_order: i,
  }));

  const { error: optError } = await supabase
    .from("event_poll_options")
    .insert(optionRows);

  if (optError) return { error: "選択肢の更新に失敗しました" };

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  return {};
}

export async function deletePoll(
  pollId: string,
  groupId: string,
  eventId: string
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

  const { error } = await supabase
    .from("event_polls")
    .delete()
    .eq("id", pollId);

  if (error) return { error: "削除に失敗しました" };

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  return {};
}

export async function vote(
  pollId: string,
  optionId: string,
  groupId: string,
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const { error } = await supabase
    .from("event_poll_votes")
    .upsert(
      { poll_id: pollId, user_id: user.id, option_id: optionId },
      { onConflict: "poll_id,user_id" }
    );

  if (error) return { error: "投票に失敗しました" };

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  return {};
}
