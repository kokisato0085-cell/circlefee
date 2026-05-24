"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, type ActionResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => login(formData, redirectTo),
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">ログイン</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {state.error}
            </p>
          )}
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
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "ログイン中..." : "ログイン"}
          </Button>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              パスワードを忘れた方
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup" className="text-blue-600 hover:underline">
              新規登録
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
