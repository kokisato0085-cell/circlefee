"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createExpenseCategory, deleteExpenseCategory } from "@/app/actions/accounting";

type Props = {
  groupId: string;
  categories: { id: string; name: string }[];
};

export function CategoryManager({ groupId, categories }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set("name", name);
    const result = await createExpenseCategory(groupId, formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setName("");
      router.refresh();
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("このカテゴリを削除しますか？\n※このカテゴリが設定された記録はカテゴリなしになります")) return;
    setDeletingId(categoryId);
    await deleteExpenseCategory(groupId, categoryId);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardContent className="py-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="カテゴリ名（例: 交通費）"
              maxLength={30}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "..." : "追加"}
            </Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map(cat => (
            <Card key={cat.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <span>{cat.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(cat.id)}
                  disabled={deletingId === cat.id}
                >
                  {deletingId === cat.id ? "..." : "削除"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
