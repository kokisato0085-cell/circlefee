"use client";

import { useState } from "react";
import { approveSpecialPayment } from "@/app/actions/special-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type MemberStatus = {
  id: string;
  userId: string;
  displayName: string;
  status: string;
  version: number;
};

const statusLabels: Record<string, { text: string; color: string }> = {
  unpaid: { text: "未払い", color: "text-red-600 bg-red-50" },
  claimed: { text: "申告中", color: "text-orange-600 bg-orange-50" },
  paid: { text: "済", color: "text-green-600 bg-green-50" },
};

export function SpecialManageList({
  statuses,
  groupId,
  specialEventId,
}: {
  statuses: MemberStatus[];
  groupId: string;
  specialEventId: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">メンバー別ステータス</h2>
      <div className="space-y-3">
        {statuses.map((s) => (
          <StatusCard key={s.id} status={s} groupId={groupId} specialEventId={specialEventId} />
        ))}
      </div>
    </div>
  );
}

function StatusCard({ status, groupId, specialEventId }: { status: MemberStatus; groupId: string; specialEventId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status.status);
  const label = statusLabels[currentStatus] ?? statusLabels.unpaid;

  async function handleApprove() {
    setError(null);
    const result = await approveSpecialPayment(status.id, groupId, specialEventId, "approve");
    if (result.error) { setError(result.error); return; }
    setCurrentStatus("paid");
  }

  async function handleReject() {
    setError(null);
    const result = await approveSpecialPayment(status.id, groupId, specialEventId, "reject");
    if (result.error) { setError(result.error); return; }
    setCurrentStatus("unpaid");
  }

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <p className="font-medium">{status.displayName}</p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${label.color}`}>{label.text}</span>
        </div>
        {currentStatus === "claimed" && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleApprove}>承認</Button>
            <Button size="sm" variant="ghost" onClick={handleReject}>差戻し</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
