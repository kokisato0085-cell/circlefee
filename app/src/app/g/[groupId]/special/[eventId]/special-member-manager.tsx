"use client";

import { useState } from "react";
import { addSpecialEventMember, removeSpecialEventMember } from "@/app/actions/special-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Member = { userId: string; displayName: string };
type Participant = Member & { status: string };

export function SpecialMemberManager({
  specialEventId,
  groupId,
  participants,
  availableMembers,
}: {
  specialEventId: string;
  groupId: string;
  participants: Participant[];
  availableMembers: Member[];
}) {
  const [currentParticipants, setCurrentParticipants] = useState(participants);
  const [available, setAvailable] = useState(availableMembers);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAdd(member: Member) {
    setError(null);
    setLoading(member.userId);
    const result = await addSpecialEventMember(specialEventId, member.userId, groupId);
    setLoading(null);
    if (result.error) { setError(result.error); return; }
    setCurrentParticipants([...currentParticipants, { ...member, status: "unpaid" }]);
    setAvailable(available.filter((m) => m.userId !== member.userId));
  }

  async function handleRemove(participant: Participant) {
    setError(null);
    setLoading(participant.userId);
    const result = await removeSpecialEventMember(specialEventId, participant.userId, groupId);
    setLoading(null);
    if (result.error) { setError(result.error); return; }
    setCurrentParticipants(currentParticipants.filter((p) => p.userId !== participant.userId));
    setAvailable([...available, { userId: participant.userId, displayName: participant.displayName }]);
  }

  const statusLabels: Record<string, string> = {
    unpaid: "未払い",
    claimed: "申告中",
    paid: "済",
  };

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <h2 className="font-semibold">参加メンバー管理</h2>
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="space-y-2">
          {currentParticipants.map((p) => (
            <div key={p.userId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{p.displayName}</span>
                <span className="text-xs text-gray-400">{statusLabels[p.status]}</span>
              </div>
              {p.status === "unpaid" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 h-7"
                  disabled={loading === p.userId}
                  onClick={() => handleRemove(p)}
                >
                  削除
                </Button>
              )}
            </div>
          ))}
        </div>

        {available.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-400 mb-2">メンバーを追加:</p>
            <div className="space-y-1">
              {available.map((m) => (
                <div key={m.userId} className="flex items-center justify-between text-sm">
                  <span>{m.displayName}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={loading === m.userId}
                    onClick={() => handleAdd(m)}
                  >
                    追加
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
