"use client";

import { use, useActionState, useState } from "react";
import { createEvent, type ActionResult } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function CreateEventPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => createEvent(groupId, formData),
    null
  );

  function addOption() {
    if (pollOptions.length < 10) setPollOptions([...pollOptions, ""]);
  }

  function removeOption(index: number) {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const next = [...pollOptions];
    next[index] = value;
    setPollOptions(next);
  }

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
                <Input id="title" name="title" required maxLength={50} placeholder="例: 5月会費" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">金額 (円)</Label>
                <Input id="amount" name="amount" type="number" required min={1} max={999999} placeholder="例: 3000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">支払い期限 (任意)</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明 (任意)</Label>
                <Input id="description" name="description" maxLength={200} placeholder="補足説明があれば" />
              </div>

              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setPollEnabled(!pollEnabled)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {pollEnabled ? "− 投票を取り消し" : "+ 投票を追加"}
                </button>

                {pollEnabled && (
                  <div className="mt-3 space-y-3 bg-blue-50 rounded-lg p-3">
                    <div className="space-y-1">
                      <Label>質問文</Label>
                      <Input name="pollQuestion" maxLength={50} placeholder="例: 何曜日がいい？" />
                    </div>
                    <div className="space-y-2">
                      <Label>選択肢</Label>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            name="pollOption"
                            value={opt}
                            onChange={(e) => updateOption(i, e.target.value)}
                            maxLength={20}
                            placeholder={`選択肢 ${i + 1}`}
                          />
                          {pollOptions.length > 2 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i)}>
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 10 && (
                        <Button type="button" variant="outline" size="sm" onClick={addOption}>
                          + 選択肢を追加
                        </Button>
                      )}
                    </div>
                  </div>
                )}
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
