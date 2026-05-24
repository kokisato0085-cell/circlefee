"use client";

import { useState, useTransition } from "react";
import { claimPayment } from "@/app/actions/events";
import { Button } from "@/components/ui/button";

export function ClaimButton({ eventId, groupId }: { eventId: string; groupId: string }) {
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClaim() {
    setError(null);
    setClaimed(true);
    startTransition(async () => {
      const result = await claimPayment(eventId, groupId);
      if (result.error) {
        setClaimed(false);
        setError(result.error);
      }
    });
  }

  if (claimed) {
    return (
      <span className="text-sm text-orange-600 font-medium">申告済み</span>
    );
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <Button size="sm" onClick={handleClaim} disabled={isPending}>
        支払った
      </Button>
    </div>
  );
}
