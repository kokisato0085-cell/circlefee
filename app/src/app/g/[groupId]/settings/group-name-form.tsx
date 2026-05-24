"use client";

import { useState } from "react";
import { updateGroupName } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GroupNameForm({ groupId, currentName }: { groupId: string; currentName: string }) {
  const [name, setName] = useState(currentName);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    setSaving(true);
    const result = await updateGroupName(groupId, name);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-1">グループ名</p>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      {editing ? (
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="flex-1"
          />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "..." : "保存"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(currentName); }}>
            x
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-left w-full px-3 py-2 border rounded-md hover:bg-gray-50"
        >
          {currentName} <span className="text-xs text-gray-400 ml-2">タップで変更</span>
        </button>
      )}
    </div>
  );
}
