"use client";

import { useState } from "react";
import { deleteEvent } from "@/app/actions/events";
import { Button } from "@/components/ui/button";

export function DeleteEventButton({
  eventId,
  groupId,
}: {
  eventId: string;
  groupId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    const result = await deleteEvent(eventId, groupId);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={confirming ? "destructive" : "ghost"}
          onClick={handleDelete}
          className={confirming ? "" : "text-red-500"}
        >
          {confirming ? "本当に削除する" : "イベントを削除"}
        </Button>
        {confirming && (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            取消
          </Button>
        )}
      </div>
    </div>
  );
}
