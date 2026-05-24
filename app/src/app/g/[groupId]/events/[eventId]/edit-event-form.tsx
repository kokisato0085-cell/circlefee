"use client";

import { useState } from "react";
import { updateEvent } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditEventForm({
  eventId,
  groupId,
  currentTitle,
  currentAmount,
  currentDueDate,
  currentDescription,
}: {
  eventId: string;
  groupId: string;
  currentTitle: string;
  currentAmount: number;
  currentDueDate: string | null;
  currentDescription: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateEvent(eventId, groupId, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        編集
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-4 bg-gray-50">
      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="title">タイトル</Label>
        <Input id="title" name="title" defaultValue={currentTitle} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="amount">金額</Label>
        <Input id="amount" name="amount" type="number" defaultValue={currentAmount} required min={1} max={999999} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dueDate">期限</Label>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={currentDueDate ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">説明</Label>
        <Input id="description" name="description" defaultValue={currentDescription ?? ""} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "保存中..." : "保存"}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
