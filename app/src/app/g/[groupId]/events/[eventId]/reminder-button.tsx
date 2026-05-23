"use client";

import { useState } from "react";
import { sendReminder } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

export function ReminderButton({
  groupId,
  eventId,
  eventTitle,
  unpaidUserIds,
}: {
  groupId: string;
  eventId: string;
  eventTitle: string;
  unpaidUserIds: string[];
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    const result = await sendReminder(groupId, eventId, unpaidUserIds, eventTitle);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (unpaidUserIds.length === 0) return null;

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {sent ? (
        <p className="text-sm text-green-600">催促通知を送信しました（{unpaidUserIds.length}人）</p>
      ) : (
        <Button variant="outline" size="sm" onClick={handleSend}>
          未払い者に催促通知（{unpaidUserIds.length}人）
        </Button>
      )}
    </div>
  );
}
