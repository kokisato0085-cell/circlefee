"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createGroup, type ActionResult } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateGroupForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => createGroup(formData),
    null
  );

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        + 新しいグループを作成
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">グループ作成</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">グループ名</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={30}
              placeholder="サークル名など"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">グループパスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={4}
              maxLength={20}
              placeholder="4〜20文字（英数字）"
            />
            <p className="text-xs text-gray-500">
              招待リンクで参加する際に使用します
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "作成中..." : "作成"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
