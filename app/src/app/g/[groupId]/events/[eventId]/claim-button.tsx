"use client";

import { useState, useTransition } from "react";
import { claimPayment } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ClaimButton({ eventId, groupId }: { eventId: string; groupId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [claimDate, setClaimDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [claimPlace, setClaimPlace] = useState("");
  const [claimRecipient, setClaimRecipient] = useState("");
  const [claimMessage, setClaimMessage] = useState("");

  function handleSubmit() {
    if (!claimDate || !claimPlace.trim() || !claimRecipient.trim()) {
      setError("全ての項目を入力してください");
      return;
    }
    setError(null);
    setClaimed(true);
    startTransition(async () => {
      const result = await claimPayment(eventId, groupId, {
        claimDate,
        claimPlace: claimPlace.trim(),
        claimRecipient: claimRecipient.trim(),
        claimMessage: claimMessage.trim() || undefined,
      });
      if (result.error) {
        setClaimed(false);
        setError(result.error);
      }
    });
  }

  if (claimed) {
    return <span className="text-sm text-orange-600 font-medium">申告済み</span>;
  }

  if (!showForm) {
    return (
      <Button size="sm" onClick={() => setShowForm(true)}>
        支払った
      </Button>
    );
  }

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
      <p className="text-sm font-medium">支払い申告</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="claim-date" className="text-xs">支払日</Label>
        <Input
          id="claim-date"
          type="date"
          value={claimDate}
          onChange={(e) => setClaimDate(e.target.value)}
          required
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="claim-place" className="text-xs">場所</Label>
        <Input
          id="claim-place"
          type="text"
          value={claimPlace}
          onChange={(e) => setClaimPlace(e.target.value)}
          placeholder="例: 部室、教室棟2F"
          maxLength={200}
          required
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="claim-recipient" className="text-xs">受取人</Label>
        <Input
          id="claim-recipient"
          type="text"
          value={claimRecipient}
          onChange={(e) => setClaimRecipient(e.target.value)}
          placeholder="例: 田中"
          maxLength={100}
          required
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="claim-message" className="text-xs">メッセージ（任意）</Label>
        <Textarea
          id="claim-message"
          value={claimMessage}
          onChange={(e) => setClaimMessage(e.target.value)}
          placeholder="例: 領収書は次回持参します"
          maxLength={500}
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "送信中..." : "申告する"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
