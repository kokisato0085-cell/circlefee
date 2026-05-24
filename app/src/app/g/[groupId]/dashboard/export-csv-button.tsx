"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type EventData = {
  title: string;
  amount: number;
  statuses: {
    displayName: string;
    status: string;
    adjustedAmount: number | null;
  }[];
};

export function ExportCsvButton({
  currentMonth,
  events,
}: {
  currentMonth: string;
  events: EventData[];
}) {
  const [pending, setPending] = useState(false);

  function handleExport() {
    setPending(true);

    const statusLabels: Record<string, string> = {
      unpaid: "未払い",
      claimed: "申告中",
      paid: "支払い済み",
    };

    const rows: string[][] = [["イベント", "メンバー", "金額", "ステータス"]];

    for (const ev of events) {
      for (const s of ev.statuses) {
        rows.push([
          ev.title,
          s.displayName,
          String(s.adjustedAmount ?? ev.amount),
          statusLabels[s.status] ?? s.status,
        ]);
      }
    }

    const bom = "﻿";
    const csv = bom + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `会計データ_${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setPending(false);
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleExport} disabled={pending || events.length === 0}>
      CSVダウンロード
    </Button>
  );
}
