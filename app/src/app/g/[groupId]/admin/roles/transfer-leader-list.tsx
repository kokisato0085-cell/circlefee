"use client";

import { useState } from "react";
import { transferLeader } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type Candidate = {
  userId: string;
  displayName: string;
  role: string;
};

const roleLabels: Record<string, string> = {
  moderator: "権限者",
  member: "一般員",
};

export function TransferLeaderList({
  candidates,
  groupId,
}: {
  candidates: Candidate[];
  groupId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  if (done) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-green-600 font-semibold">委譲が完了しました</p>
        <Button variant="outline" onClick={() => router.push(`/g/${groupId}`)}>
          ホームへ戻る
        </Button>
      </div>
    );
  }

  async function handleTransfer(userId: string) {
    if (confirmingId !== userId) {
      setConfirmingId(userId);
      return;
    }
    setError(null);
    const result = await transferLeader(groupId, userId);
    if (result.error) {
      setError(result.error);
      setConfirmingId(null);
      return;
    }
    setDone(true);
  }

  if (candidates.length === 0) {
    return <p className="text-sm text-gray-500">他のメンバーがいません</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {candidates.map((c) => (
        <Card key={c.userId}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{c.displayName}</p>
                <p className="text-xs text-gray-500">{roleLabels[c.role] ?? c.role}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={confirmingId === c.userId ? "destructive" : "outline"}
                  onClick={() => handleTransfer(c.userId)}
                >
                  {confirmingId === c.userId ? "本当に委譲" : "委譲"}
                </Button>
                {confirmingId === c.userId && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                    取消
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
