"use client";

import { useState } from "react";
import { claimPayment } from "@/app/actions/events";
import { Button } from "@/components/ui/button";

export function ClaimButton({ eventId, groupId }: { eventId: string; groupId: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setPending(true);
    setError(null);
    const result = await claimPayment(eventId, groupId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <span className="text-sm text-orange-600 font-medium">申告済み</span>
    );
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <Button size="sm" onClick={handleClaim} disabled={pending}>
        {pending ? "送信中..." : "支払った"}
      </Button>
    </div>
  );
}
