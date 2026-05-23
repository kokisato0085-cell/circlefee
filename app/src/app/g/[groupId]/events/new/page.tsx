"use client";

import { use, useActionState } from "react";
import { createEvent, type ActionResult } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function CreateEventPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => createEvent(groupId, formData),
    null
  );

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/g/${groupId}`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">イベント作成</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {state.error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  maxLength={50}
                  placeholder="例: 5月会費"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">金額 (円)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  required
                  min={1}
                  max={999999}
                  placeholder="例: 3000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">支払い期限 (任意)</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明 (任意)</Label>
                <Input
                  id="description"
                  name="description"
                  maxLength={200}
                  placeholder="補足説明があれば"
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "作成中..." : "イベントを作成"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
