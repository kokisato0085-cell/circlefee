"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAccountEntry } from "@/app/actions/accounting";

type Props = {
  groupId: string;
  categories: { id: string; name: string }[];
};

export function AddEntryForm({ groupId, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full">
        入出金を追加
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    const result = await createAccountEntry(groupId, formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">入出金を追加</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>×</Button>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === "income" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setType("income")}
          >
            入金
          </Button>
          <Button
            type="button"
            variant={type === "expense" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setType("expense")}
          >
            出金
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="amount">金額（円）</Label>
            <Input id="amount" name="amount" type="number" min={1} required />
          </div>
          <div>
            <Label htmlFor="description">説明</Label>
            <Input id="description" name="description" maxLength={200} required />
          </div>
          <div>
            <Label htmlFor="date">日付</Label>
            <Input id="date" name="date" type="date" required />
          </div>

          {type === "expense" && categories.length > 0 && (
            <div>
              <Label htmlFor="categoryId">カテゴリ</Label>
              <select
                id="categoryId"
                name="categoryId"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">なし</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "登録中..." : "登録"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
