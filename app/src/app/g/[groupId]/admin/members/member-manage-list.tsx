"use client";

import { useState } from "react";
import { removeMember, changeRole, setGrade, createGroupRole, deleteGroupRole, assignMemberRole, removeMemberRole } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Member = {
  membershipId: string;
  userId: string;
  displayName: string;
  role: string;
  version: number;
  grade: number | null;
  assignedRoleIds: string[];
  isMe: boolean;
};

type GroupRole = { id: string; name: string };

const roleLabels: Record<string, string> = {
  leader: "部長",
  moderator: "権限者",
  member: "一般員",
};

const gradeLabels: Record<number, string> = { 1: "1年", 2: "2年", 3: "3年", 4: "4年" };

export function MemberManageList({
  members,
  groupId,
  groupRoles: initialGroupRoles,
}: {
  members: Member[];
  groupId: string;
  groupRoles: GroupRole[];
}) {
  const [groupRoles, setGroupRoles] = useState(initialGroupRoles);
  const [newRoleName, setNewRoleName] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);

  async function handleCreateRole() {
    setRoleError(null);
    if (!newRoleName.trim()) return;
    const result = await createGroupRole(groupId, newRoleName);
    if (result.error) { setRoleError(result.error); return; }
    setGroupRoles((prev) => [...prev, { id: crypto.randomUUID(), name: newRoleName.trim() }]);
    setNewRoleName("");
  }

  async function handleDeleteRole(roleId: string) {
    const result = await deleteGroupRole(groupId, roleId);
    if (result.error) { setRoleError(result.error); return; }
    setGroupRoles((prev) => prev.filter((r) => r.id !== roleId));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-4 space-y-3">
          <h2 className="font-semibold">係バッジ管理</h2>
          {roleError && <p className="text-xs text-red-600">{roleError}</p>}
          <div className="flex gap-2">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="新しい係名（例: 会計係）"
              maxLength={20}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleCreateRole} disabled={!newRoleName.trim()}>
              作成
            </Button>
          </div>
          {groupRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groupRoles.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {r.name}
                  <button onClick={() => handleDeleteRole(r.id)} className="text-purple-400 hover:text-purple-700">×</button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {members.map((m) => (
          <MemberCard key={m.userId} member={m} groupId={groupId} groupRoles={groupRoles} />
        ))}
      </div>
    </div>
  );
}

function MemberCard({ member, groupId, groupRoles }: { member: Member; groupId: string; groupRoles: GroupRole[] }) {
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [currentRole, setCurrentRole] = useState(member.role);
  const [confirming, setConfirming] = useState(false);
  const [grade, setGradeState] = useState(member.grade);
  const [assignedIds, setAssignedIds] = useState<string[]>(member.assignedRoleIds);

  if (removed) return null;

  async function handleRemove() {
    if (!confirming) { setConfirming(true); return; }
    setError(null);
    const result = await removeMember(groupId, member.userId);
    if (result.error) { setError(result.error); setConfirming(false); return; }
    setRemoved(true);
  }

  async function handleRoleChange(newRole: "moderator" | "member") {
    setError(null);
    const result = await changeRole(groupId, member.userId, newRole);
    if (result.error) { setError(result.error); return; }
    setCurrentRole(newRole);
  }

  async function handleGradeChange(newGrade: number | null) {
    setError(null);
    const result = await setGrade(groupId, member.userId, newGrade);
    if (result.error) { setError(result.error); return; }
    setGradeState(newGrade);
  }

  async function handleToggleRole(roleId: string) {
    setError(null);
    if (assignedIds.includes(roleId)) {
      const result = await removeMemberRole(groupId, member.membershipId, roleId);
      if (result.error) { setError(result.error); return; }
      setAssignedIds((prev) => prev.filter((id) => id !== roleId));
    } else {
      const result = await assignMemberRole(groupId, member.membershipId, roleId);
      if (result.error) { setError(result.error); return; }
      setAssignedIds((prev) => [...prev, roleId]);
    }
  }

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{member.displayName}</p>
              {grade && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{gradeLabels[grade]}</span>
              )}
              {assignedIds.map((rid) => {
                const r = groupRoles.find((gr) => gr.id === rid);
                return r ? (
                  <span key={rid} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{r.name}</span>
                ) : null;
              })}
            </div>
            <p className="text-xs text-gray-500">{roleLabels[currentRole] ?? currentRole}</p>
          </div>
          {member.isMe && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">自分</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 text-xs shrink-0">学年:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((g) => (
              <button
                key={g}
                onClick={() => handleGradeChange(grade === g ? null : g)}
                className={`text-xs px-2 py-0.5 rounded ${grade === g ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {g}年
              </button>
            ))}
          </div>
        </div>

        {groupRoles.length > 0 && (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-400 text-xs shrink-0">係:</span>
            {groupRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => handleToggleRole(r.id)}
                className={`text-xs px-2 py-0.5 rounded ${assignedIds.includes(r.id) ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

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
