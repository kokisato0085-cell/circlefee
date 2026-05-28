"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Entry = {
  type: "income" | "expense";
  amount: number;
  date: string;
  categoryId: string | null;
  categoryName: string | null;
};

type Props = {
  entries: Entry[];
};

const COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

export function ReportView({ entries }: Props) {
  const currentYear = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
  const [year, setYear] = useState(currentYear);

  const years = useMemo(() => {
    const ySet = new Set(entries.map(e => parseInt(e.date.split("-")[0])));
    ySet.add(currentYear);
    return Array.from(ySet).sort((a, b) => b - a);
  }, [entries, currentYear]);

  const yearEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(String(year))),
    [entries, year]
  );

  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      months[key] = { income: 0, expense: 0 };
    }
    for (const e of yearEntries) {
      const key = e.date.substring(0, 7);
      if (months[key]) {
        if (e.type === "income") months[key].income += e.amount;
        else months[key].expense += e.amount;
      }
    }
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  }, [yearEntries, year]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, { name: string; total: number }> = {};
    for (const e of yearEntries) {
      if (e.type !== "expense") continue;
      const key = e.categoryName ?? "未分類";
      if (!catMap[key]) catMap[key] = { name: key, total: 0 };
      catMap[key].total += e.amount;
    }
    return Object.values(catMap).sort((a, b) => b.total - a.total);
  }, [yearEntries]);

  const totalExpenseForPie = categoryData.reduce((s, c) => s + c.total, 0);

  const yearIncome = yearEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const yearExpense = yearEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setYear(y => y - 1)} disabled={!years.includes(year - 1) && year - 1 < Math.min(...years)}>
          ←
        </Button>
        <span className="text-lg font-bold">{year}年</span>
        <Button variant="ghost" size="sm" onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}>
          →
        </Button>
      </div>

      <Card>
        <CardContent className="py-4 space-y-1">
          <h2 className="font-semibold mb-2">年間サマリー</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">入金合計</span>
            <span className="text-blue-600">+{yearIncome.toLocaleString()}円</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">出金合計</span>
            <span className="text-red-600">-{yearExpense.toLocaleString()}円</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
            <span className="text-gray-500">収支</span>
            <span className={yearIncome - yearExpense >= 0 ? "text-green-600" : "text-red-600"}>
              {(yearIncome - yearExpense).toLocaleString()}円
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <h2 className="font-semibold mb-3">月別収支</h2>
          <div className="space-y-1">
            {monthlyData.map(({ month, income, expense }) => {
              const label = `${parseInt(month.split("-")[1])}月`;
              const hasData = income > 0 || expense > 0;
              return (
                <div key={month} className={`flex items-center text-sm ${!hasData ? "text-gray-300" : ""}`}>
                  <span className="w-8 shrink-0">{label}</span>
                  <div className="flex-1 flex justify-end gap-4">
                    <span className={hasData ? "text-blue-600" : ""}>
                      {income > 0 ? `+${income.toLocaleString()}` : "-"}
                    </span>
                    <span className={`w-24 text-right ${hasData ? "text-red-600" : ""}`}>
                      {expense > 0 ? `-${expense.toLocaleString()}` : "-"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {categoryData.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h2 className="font-semibold mb-3">カテゴリ別支出</h2>
            <div className="flex justify-center mb-4">
              <PieChart data={categoryData} total={totalExpenseForPie} />
            </div>
            <div className="space-y-2">
              {categoryData.map((cat, i) => {
                const pct = totalExpenseForPie > 0 ? Math.round((cat.total / totalExpenseForPie) * 100) : 0;
                return (
                  <div key={cat.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className="text-gray-500">{pct}%</span>
                    <span className="font-medium">{cat.total.toLocaleString()}円</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PieChart({ data, total }: { data: { name: string; total: number }[]; total: number }) {
  if (total === 0) return null;

  const size = 160;
  const r = 60;
  const cx = size / 2;
  const cy = size / 2;

  let accumulated = 0;
  const slices = data.map((item, i) => {
    const fraction = item.total / total;
    const startAngle = accumulated * 2 * Math.PI - Math.PI / 2;
    accumulated += fraction;
    const endAngle = accumulated * 2 * Math.PI - Math.PI / 2;

    const largeArc = fraction > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    if (data.length === 1) {
      return (
        <circle key={i} cx={cx} cy={cy} r={r} fill={COLORS[i % COLORS.length]} />
      );
    }

    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={COLORS[i % COLORS.length]}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices}
    </svg>
  );
}
