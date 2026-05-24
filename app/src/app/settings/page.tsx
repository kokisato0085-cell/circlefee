import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayNameForm } from "./display-name-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountSection } from "./delete-account-section";
import { BackButton } from "./back-button";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Suspense fallback={<span />}>
            <BackButton />
          </Suspense>
          <h1 className="text-xl font-bold">アカウント設定</h1>
        </div>

        <Card>
          <CardContent className="py-4 space-y-4">
            <DisplayNameForm currentName={profile?.display_name ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 space-y-2">
            <h2 className="font-semibold text-sm text-gray-500">メールアドレス</h2>
            <p className="text-sm">{user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <DeleteAccountSection />
      </div>
    </div>
  );
}
