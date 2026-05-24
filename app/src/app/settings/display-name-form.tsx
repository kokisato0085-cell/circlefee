"use client";

import { useState } from "react";
import { updateDisplayName } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DisplayNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaved(false);
    const result = await updateDisplayName(name);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
  }

  return (
    <div className="space-y-2">
      <Label>表示名</Label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && <p className="text-xs text-green-600">保存しました</p>}
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          maxLength={20}
          placeholder="表示名"
        />
        <Button size="sm" onClick={handleSave} disabled={name === currentName}>
          保存
        </Button>
      </div>
    </div>
  );
}
