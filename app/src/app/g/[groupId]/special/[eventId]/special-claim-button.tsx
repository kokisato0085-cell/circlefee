"use client";

import { useState } from "react";
import { claimSpecialPayment } from "@/app/actions/special-events";
import { Button } from "@/components/ui/button";

export function SpecialClaimButton({ specialEventId, groupId }: { specialEventId: string; groupId: string }) {
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setError(null);
    const result = await claimSpecialPayment(specialEventId, groupId);
    if (result.error) { setError(result.error); return; }
    setClaimed(true);
  }

  if (claimed) return <span className="text-sm text-orange-600">申告済み</span>;

  return (
    <div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button size="sm" onClick={handleClaim}>支払った</Button>
    </div>
  );
}
