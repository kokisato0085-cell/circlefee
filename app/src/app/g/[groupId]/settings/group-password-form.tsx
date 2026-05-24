"use client";

import { useState } from "react";
import { updateGroupPassword } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GroupPasswordForm({ groupId }: { groupId: string }) {
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);
    const result = await updateGroupPassword(groupId, password);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setPassword("");
    setEditing(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-1">グループパスワード</p>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      {success && <p className="text-xs text-green-600 mb-1">パスワードを変更しました</p>}
      {editing ? (
        <div className="flex gap-2">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={20}
            placeholder="新しいパスワード（英数字4〜20文字）"
            className="flex-1"
          />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "..." : "変更"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setPassword(""); setError(null); }}>
            x
          </Button>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
          パスワードを変更
        </Button>
      )}
    </div>
  );
}
