"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmEventIncome } from "@/app/actions/accounting";

type Props = {
  groupId: string;
  eventId: string;
  eventTitle: string;
  paidCount: number;
  eventAmount: number;
};

export function ConfirmIncomeButton({ groupId, eventId, eventTitle, paidCount, eventAmount }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(paidCount * eventAmount));
  const [description, setDescription] = useState(`${eventTitle} 集金`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => {
        setAmount(String(paidCount * eventAmount));
        setDescription(`${eventTitle} 集金`);
        setOpen(true);
      }}>
        入金確定（会計帳簿に記録）
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await confirmEventIncome(groupId, eventId, Number(amount), description);
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
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">入金確定</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>×</Button>
        </div>
        <p className="text-xs text-gray-500">
          支払い済み: {paidCount}人 × {eventAmount.toLocaleString()}円 = {(paidCount * eventAmount).toLocaleString()}円
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="income-amount">入金額（円）</Label>
            <Input
              id="income-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="income-desc">説明</Label>
            <Input
              id="income-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "記録中..." : "会計帳簿に入金を記録"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
