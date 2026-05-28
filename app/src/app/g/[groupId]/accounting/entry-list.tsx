"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteAccountEntry } from "@/app/actions/accounting";

type Entry = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  categoryName: string | null;
  version: number;
};

type Props = {
  entries: Entry[];
  groupId: string;
};

export function AccountingEntryList({ entries, groupId }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (entryId: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    setDeletingId(entryId);
    await deleteAccountEntry(groupId, entryId);
    setDeletingId(null);
    router.refresh();
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-gray-500 text-sm">
          入出金の記録はありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-semibold">入出金明細</h2>
      {entries.map(entry => (
        <Card key={entry.id}>
          <CardContent className="py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    entry.type === "income"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-red-50 text-red-600"
                  }`}>
                    {entry.type === "income" ? "入金" : "出金"}
                  </span>
                  <span className="text-xs text-gray-400">{entry.date}</span>
                  {entry.categoryName && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {entry.categoryName}
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1 truncate">{entry.description}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className={`font-semibold whitespace-nowrap ${
                  entry.type === "income" ? "text-blue-600" : "text-red-600"
                }`}>
                  {entry.type === "income" ? "+" : "-"}{entry.amount.toLocaleString()}円
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 px-2"
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                >
                  {deletingId === entry.id ? "..." : "×"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
