import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteForm } from "./invite-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: inviteInfo } = await supabase
      .rpc("get_invite_group_info", { invite_token: token });

    if (inviteInfo && inviteInfo.length > 0) {
      const groupId = inviteInfo[0].group_id;
      const { data: existing } = await supabase
        .from("memberships")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        redirect(`/g/${groupId}`);
      }
    }
  }

  return <InviteForm token={token} />;
}
