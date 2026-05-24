"use client";

import { useState } from "react";
import { changePassword } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next !== confirm) {
      setError("新しいパスワードが一致しません");
      return;
    }

    setPending(true);
    const result = await changePassword(current, next);
    setPending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="font-semibold text-sm text-gray-500">パスワード変更</h2>
      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">パスワードを変更しました</p>}
      <div className="space-y-1">
        <Label htmlFor="currentPassword">現在のパスワード</Label>
        <Input id="currentPassword" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="newPassword">新しいパスワード</Label>
        <Input id="newPassword" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
        <Input id="confirmPassword" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "変更中..." : "パスワードを変更"}
      </Button>
    </form>
  );
}
