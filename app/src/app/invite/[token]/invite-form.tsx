"use client";

import { useActionState } from "react";
import { submitJoinRequest, type ActionResult } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function InviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => submitJoinRequest(token, formData),
    null
  );

  const success = state && !state.error;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              グループに参加
            </CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center">
                <p className="text-green-700 bg-green-50 p-3 rounded-md">
                  参加リクエストを送信しました。部長の承認をお待ちください。
                </p>
                <Link href="/groups">
                  <Button variant="outline" className="w-full">
                    グループ一覧へ
                  </Button>
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                {state?.error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {state.error}
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">グループパスワード</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="グループのパスワードを入力"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "送信中..." : "参加リクエストを送信"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
