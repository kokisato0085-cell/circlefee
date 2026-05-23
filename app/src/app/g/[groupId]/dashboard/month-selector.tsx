"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MonthSelector({
  currentMonth,
  groupId,
}: {
  currentMonth: string;
  groupId: string;
}) {
  const router = useRouter();

  function navigate(offset: number) {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/g/${groupId}/dashboard?month=${next}`);
  }

  const [year, month] = currentMonth.split("-");

  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        ← 前月
      </Button>
      <span className="font-semibold text-lg">{year}年{parseInt(month)}月</span>
      <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
        翌月 →
      </Button>
    </div>
  );
}
