"use client";

import { useState } from "react";
import { approvePayment, updateSubStatus, adjustPaymentAmount } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type MemberStatus = {
  id: string;
  userId: string;
  displayName: string;
  status: string;
  subStatus: string | null;
  adjustedAmount: number | null;
  version: number;
  voteLabel: string | null;
  claimDate: string | null;
  claimPlace: string | null;
  claimRecipient: string | null;
  claimMessage: string | null;
  grade: number | null;
  roleNames: string[];
};

const gradeLabels: Record<number, string> = { 1: "1年", 2: "2年", 3: "3年", 4: "4年" };

const statusLabels: Record<string, { text: string; color: string }> = {
  unpaid: { text: "未払い", color: "text-red-600 bg-red-50" },
  claimed: { text: "申告中", color: "text-orange-600 bg-orange-50" },
  paid: { text: "済", color: "text-green-600 bg-green-50" },
};

export function PaymentManageList({
  statuses,
  eventAmount,
  groupId,
}: {
  statuses: MemberStatus[];
  eventAmount: number;
  groupId: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">メンバー別ステータス</h2>
      <div className="space-y-3">
        {statuses.map((s) => (
          <MemberStatusCard
            key={s.id}
            status={s}
            eventAmount={eventAmount}
            groupId={groupId}
          />
        ))}
      </div>
    </div>
  );
}

function MemberStatusCard({
  status,
  eventAmount,
  groupId,
}: {
  status: MemberStatus;
  eventAmount: number;
  groupId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status.status);
  const [subStatus, setSubStatus] = useState(status.subStatus ?? "");
  const [editingSub, setEditingSub] = useState(false);
  const [adjustedAmount, setAdjustedAmount] = useState(status.adjustedAmount);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState(String(status.adjustedAmount ?? eventAmount));

  const label = statusLabels[currentStatus] ?? statusLabels.unpaid;

  function handleApprove() {
    setError(null);
    const prev = currentStatus;
    setCurrentStatus("paid");
    approvePayment(status.id, groupId, "approve").then((result) => {
      if (result.error) { setCurrentStatus(prev); setError(result.error); }
    });
  }

  function handleReject() {
    setError(null);
    const prev = currentStatus;
    setCurrentStatus("unpaid");
    approvePayment(status.id, groupId, "reject").then((result) => {
      if (result.error) { setCurrentStatus(prev); setError(result.error); }
    });
  }

  async function handleSubStatusSave() {
    setError(null);
    const result = await updateSubStatus(status.id, subStatus, groupId);
    if (result.error) { setError(result.error); return; }
    setEditingSub(false);
  }

  async function handleAmountSave() {
    setError(null);
    const num = parseInt(amountInput, 10);
    if (isNaN(num)) { setError("数値を入力してください"); return; }
    const result = await adjustPaymentAmount(status.id, num, groupId);
    if (result.error) { setError(result.error); return; }
    setAdjustedAmount(num);
    setEditingAmount(false);
  }

  const displayAmount = adjustedAmount ?? eventAmount;

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">{status.displayName}</p>
              {status.grade && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{gradeLabels[status.grade]}</span>
              )}
              {status.roleNames.map((name) => (
                <span key={name} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{name}</span>
              ))}
              {status.voteLabel && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {status.voteLabel}
                </span>
              )}
            </div>
            {adjustedAmount !== null && adjustedAmount !== eventAmount && (
              <p className="text-xs text-blue-600">調整済: {displayAmount.toLocaleString()}円</p>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${label.color}`}>
            {label.text}
          </span>
        </div>

        {(currentStatus === "claimed" || currentStatus === "paid") && status.claimDate && (
          <div className="bg-blue-50 rounded-md p-2 text-xs space-y-0.5">
            <p className="font-medium text-blue-700">申告メモ</p>
            <p><span className="text-gray-500">日付:</span> {status.claimDate}</p>
            <p><span className="text-gray-500">場所:</span> {status.claimPlace}</p>
            <p><span className="text-gray-500">受取人:</span> {status.claimRecipient}</p>
            {status.claimMessage && (
              <p><span className="text-gray-500">メッセージ:</span> {status.claimMessage}</p>
            )}
          </div>
        )}

        {currentStatus === "claimed" && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleApprove}>承認</Button>
            <Button size="sm" variant="ghost" onClick={handleReject}>差戻し</Button>
          </div>
        )}

        <div className="text-sm">
          <span className="text-gray-400">memo:</span>
          {editingSub ? (
            <div className="flex gap-1 mt-1">
              <Input
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value)}
                maxLength={50}
                className="h-7 text-sm"
                placeholder="メモ"
              />
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleSubStatusSave}>
                保存
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingSub(false); setSubStatus(status.subStatus ?? ""); }}>
                x
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingSub(true)}
              className="text-gray-500 hover:text-gray-700 text-left w-full break-words whitespace-pre-wrap mt-1"
            >
              {subStatus || "タップして追加"}
            </button>
          )}
        </div>

        {currentStatus === "unpaid" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 shrink-0">金額:</span>
            {editingAmount ? (
              <div className="flex gap-1 flex-1">
                <Input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  min={0}
                  max={999999}
                  className="h-7 text-sm"
                />
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAmountSave}>
                  保存
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingAmount(false); setAmountInput(String(adjustedAmount ?? eventAmount)); }}>
                  x
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingAmount(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                {displayAmount.toLocaleString()}円 (タップで調整)
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
