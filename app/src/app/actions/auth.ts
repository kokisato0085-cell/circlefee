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

export async function login(formData: FormData): Promise<ActionResult> {
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

  redirect("/groups");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
