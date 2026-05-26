"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signup, type ActionResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-gray-400">読み込み中...</div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => signup(formData, redirectTo),
    null
  );

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">メールを確認してください</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-700">
            入力されたメールアドレスに確認メールを送信しました。
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}>
            <Button variant="outline" className="w-full">
              ログイン画面へ
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">新規登録</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">表示名</Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              required
              maxLength={20}
              placeholder="サークルで表示される名前"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="8文字以上"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "登録中..." : "アカウント作成"}
          </Button>
          <p className="text-center text-sm text-gray-600">
            すでにアカウントをお持ちの方は{" "}
            <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"} className="text-blue-600 hover:underline">
              ログイン
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
