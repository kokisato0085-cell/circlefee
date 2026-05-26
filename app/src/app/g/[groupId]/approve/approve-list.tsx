"use client";

import { useState, useTransition } from "react";
import { approvePayment } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Approval = {
  paymentStatusId: string;
  eventTitle: string;
  displayName: string;
  amount: number;
  subStatus: string | null;
  claimDate: string | null;
  claimPlace: string | null;
  claimRecipient: string | null;
  claimMessage: string | null;
};

export function ApproveList({
  approvals,
  groupId,
}: {
  approvals: Approval[];
  groupId: string;
}) {
  const [processed, setProcessed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAction(paymentStatusId: string, action: "approve" | "reject") {
    setError(null);
    setProcessed((prev) => new Set(prev).add(paymentStatusId));
    startTransition(async () => {
      const result = await approvePayment(paymentStatusId, groupId, action);
      if (result.error) {
        setProcessed((prev) => {
          const next = new Set(prev);
          next.delete(paymentStatusId);
          return next;
        });
        setError(result.error);
      }
    });
  }

  const pending = approvals.filter((a) => !processed.has(a.paymentStatusId));

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-3">{error}</p>
      )}
      {pending.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          承認待ちの申告はありません
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <Card key={a.paymentStatusId}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{a.displayName}</p>
                    <p className="text-sm text-gray-500">{a.eventTitle}</p>
                  </div>
                  <span className="font-semibold">{a.amount.toLocaleString()}円</span>
                </div>
                {a.subStatus && (
                  <p className="text-xs text-gray-400 mb-2">memo: {a.subStatus}</p>
                )}
                {a.claimDate && (
                  <div className="bg-blue-50 rounded-md p-2 text-xs space-y-0.5 mb-2">
                    <p className="font-medium text-blue-700">申告メモ</p>
                    <p><span className="text-gray-500">日付:</span> {a.claimDate}</p>
                    <p><span className="text-gray-500">場所:</span> {a.claimPlace}</p>
                    <p><span className="text-gray-500">受取人:</span> {a.claimRecipient}</p>
                    {a.claimMessage && (
                      <p><span className="text-gray-500">メッセージ:</span> {a.claimMessage}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAction(a.paymentStatusId, "approve")}
                  >
                    承認
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(a.paymentStatusId, "reject")}
                  >
                    差戻し
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
