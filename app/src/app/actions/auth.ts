"use server";

import { createClient } from "@/lib/supabase/server";
import { signupSchema, loginSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export type ActionResult = {
  error?: string;
  success?: boolean;
};

export async function signup(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function login(formData: FormData, redirectTo?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  const safeRedirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/groups";
  redirect(safeRedirect);
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPasswordEmail(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  if (!email) return { error: "メールアドレスを入力してください" };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/api/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const password = formData.get("password") as string;
  if (!password || password.length < 8) return { error: "パスワードは8文字以上です" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  redirect("/groups");
}
