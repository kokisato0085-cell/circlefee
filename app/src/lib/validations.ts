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

export const createEventSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(50, "タイトルは50文字以内です"),
  amount: z.coerce
    .number()
    .int("金額は整数で入力してください")
    .min(1, "金額は1円以上です")
    .max(999999, "金額は999,999円以下です"),
  dueDate: z
    .string()
    .optional()
    .transform((v) => v || null),
  description: z
    .string()
    .max(200, "説明は200文字以内です")
    .optional()
    .transform((v) => v || null),
});

export const pollSchema = z.object({
  question: z
    .string()
    .min(1, "質問文を入力してください")
    .max(50, "質問文は50文字以内です"),
  options: z
    .array(
      z.string().min(1, "選択肢を入力してください").max(20, "選択肢は20文字以内です")
    )
    .min(2, "選択肢は2つ以上必要です")
    .max(10, "選択肢は10個以内です"),
});

export const accountEntrySchema = z.object({
  type: z.enum(["income", "expense"], { message: "種別を選択してください" }),
  amount: z.coerce
    .number()
    .int("金額は整数で入力してください")
    .min(1, "金額は1円以上です")
    .max(99999999, "金額は99,999,999円以下です"),
  description: z
    .string()
    .min(1, "説明を入力してください")
    .max(200, "説明は200文字以内です"),
  date: z.string().min(1, "日付を入力してください"),
  eventId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v || null),
  categoryId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v || null),
});

export const expenseCategorySchema = z.object({
  name: z
    .string()
    .min(1, "カテゴリ名を入力してください")
    .max(30, "カテゴリ名は30文字以内です"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type PollInput = z.infer<typeof pollSchema>;
export type AccountEntryInput = z.infer<typeof accountEntrySchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
