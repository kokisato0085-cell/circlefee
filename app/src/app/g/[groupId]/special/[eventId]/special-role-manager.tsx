"use client";

import { useState } from "react";
import { addSpecialEventRole, removeSpecialEventRole } from "@/app/actions/special-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RoleMember = { userId: string; displayName: string };

export function SpecialRoleManager({
  specialEventId,
  groupId,
  currentRoles,
  memberOptions,
}: {
  specialEventId: string;
  groupId: string;
  currentRoles: RoleMember[];
  memberOptions: RoleMember[];
}) {
  const [roles, setRoles] = useState(currentRoles);
  const [options, setOptions] = useState(memberOptions);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(member: RoleMember) {
    setError(null);
    const result = await addSpecialEventRole(specialEventId, member.userId, groupId);
    if (result.error) { setError(result.error); return; }
    setRoles([...roles, member]);
    setOptions(options.filter((o) => o.userId !== member.userId));
  }

  async function handleRemove(member: RoleMember) {
    setError(null);
    const result = await removeSpecialEventRole(specialEventId, member.userId, groupId);
    if (result.error) { setError(result.error); return; }
    setRoles(roles.filter((r) => r.userId !== member.userId));
    setOptions([...options, member]);
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <h2 className="font-semibold">フォーム内権限者</h2>
        {error && <p className="text-xs text-red-600">{error}</p>}

        {roles.length === 0 ? (
          <p className="text-sm text-gray-500">権限者なし</p>
        ) : (
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.userId} className="flex items-center justify-between text-sm">
                <span>{r.displayName}</span>
                <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => handleRemove(r)}>
                  解除
                </Button>
              </div>
            ))}
          </div>
        )}

        {options.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-400 mb-2">メンバーを追加:</p>
            <div className="space-y-1">
              {options.map((m) => (
                <div key={m.userId} className="flex items-center justify-between text-sm">
                  <span>{m.displayName}</span>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => handleAdd(m)}>
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
