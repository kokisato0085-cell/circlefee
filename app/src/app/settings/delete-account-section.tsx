"use client";

import { useState } from "react";
import { deleteAccount } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function DeleteAccountSection() {
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    const result = await deleteAccount(password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card className="border-red-200">
      <CardContent className="py-4 space-y-3">
        <h2 className="font-semibold text-sm text-red-600">アカウント削除</h2>

        {step === 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              アカウントを削除すると、全グループから脱退し、データは匿名化されます。この操作は取り消せません。
            </p>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setStep(1)}>
              アカウントを削除する
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">本当に削除しますか？パスワードを入力してください。</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={!password || loading}>
                {loading ? "削除中..." : "削除を実行"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setStep(0); setPassword(""); setError(null); }}>
                取消
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
