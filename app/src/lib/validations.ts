import { z } from "zod";

export const signupSchema = z.object({
  displayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(20, "表示名は20文字以内です"),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上です"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(1, "パスワードを入力してください"),
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "グループ名を入力してください")
    .max(30, "グループ名は30文字以内です"),
  password: z
    .string()
    .min(4, "パスワードは4文字以上です")
    .max(20, "パスワードは20文字以内です")
    .regex(/^[a-zA-Z0-9]+$/, "英数字のみ使用できます"),
});

export const joinGroupSchema = z.object({
  password: z
    .string()
    .min(1, "パスワードを入力してください"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
