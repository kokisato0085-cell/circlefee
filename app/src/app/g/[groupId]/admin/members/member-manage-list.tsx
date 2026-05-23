"use client";

import { useState } from "react";
import { removeMember, changeRole } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Member = {
  userId: string;
  displayName: string;
  role: string;
  version: number;
  isMe: boolean;
};

const roleLabels: Record<string, string> = {
  leader: "部長",
  moderator: "権限者",
  member: "一般員",
};

export function MemberManageList({
  members,
  groupId,
}: {
  members: Member[];
  groupId: string;
}) {
  return (
    <div className="space-y-3">
      {members.map((m) => (
        <MemberCard key={m.userId} member={m} groupId={groupId} />
      ))}
    </div>
  );
}

function MemberCard({ member, groupId }: { member: Member; groupId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [currentRole, setCurrentRole] = useState(member.role);
  const [confirming, setConfirming] = useState(false);

  if (removed) return null;

  async function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    const result = await removeMember(groupId, member.userId);
    if (result.error) {
      setError(result.error);
      setConfirming(false);
      return;
    }
    setRemoved(true);
  }

  async function handleRoleChange(newRole: "moderator" | "member") {
    setError(null);
    const result = await changeRole(groupId, member.userId, newRole);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCurrentRole(newRole);
  }

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{member.displayName}</p>
            <p className="text-xs text-gray-500">{roleLabels[currentRole] ?? currentRole}</p>
          </div>
          {member.isMe && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">自分</span>
          )}
        </div>

        {!member.isMe && currentRole !== "leader" && (
          <div className="flex gap-2 pt-1">
            {currentRole === "member" ? (
              <Button size="sm" variant="outline" onClick={() => handleRoleChange("moderator")}>
                権限者に昇格
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleRoleChange("member")}>
                一般員に降格
              </Button>
            )}
            <Button
              size="sm"
              variant={confirming ? "destructive" : "ghost"}
              onClick={handleRemove}
            >
              {confirming ? "本当に削除" : "削除"}
            </Button>
            {confirming && (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                取消
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
