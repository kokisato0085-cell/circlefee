"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordEmail, type ActionResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => resetPasswordEmail(formData),
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">パスワードリセット</CardTitle>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
              リセット用のメールを送信しました。メール内のリンクをクリックしてパスワードを再設定してください。
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">ログインに戻る</Button>
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {state.error}
              </p>
            )}
            <p className="text-sm text-gray-600">
              登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
            </p>
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
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "送信中..." : "リセットメールを送信"}
            </Button>
            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 hover:underline">
                ログインに戻る
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
