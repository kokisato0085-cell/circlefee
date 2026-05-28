import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountingEntryList } from "./entry-list";
import { AddEntryForm } from "./add-entry-form";

export default async function AccountingPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/groups");

  const isLeaderOrMod = membership.role === "leader" || membership.role === "moderator";

  const [{ data: entries }, { data: categories }] = await Promise.all([
    supabase
      .from("account_entries")
      .select("id, type, amount, description, date, event_id, category_id, version, created_at, expense_categories(name)")
      .eq("group_id", groupId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("group_id", groupId)
      .order("name"),
  ]);

  const allEntries = entries ?? [];
  const totalIncome = allEntries.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = allEntries.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">会計帳簿</h1>
        </div>

        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">残高</span>
              <span className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {balance.toLocaleString()}円
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">入金合計</span>
              <span className="text-blue-600">+{totalIncome.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">出金合計</span>
              <span className="text-red-600">-{totalExpense.toLocaleString()}円</span>
            </div>
          </CardContent>
        </Card>

        {isLeaderOrMod && (
          <div className="flex gap-2">
            <Link href={`/g/${groupId}/accounting/report`} className="flex-1">
              <Button variant="outline" className="w-full" size="sm">収支レポート</Button>
            </Link>
            <Link href={`/g/${groupId}/accounting/categories`} className="flex-1">
              <Button variant="outline" className="w-full" size="sm">カテゴリ管理</Button>
            </Link>
          </div>
        )}

        {isLeaderOrMod && (
          <AddEntryForm
            groupId={groupId}
            categories={(categories ?? []).map(c => ({ id: c.id, name: c.name }))}
          />
        )}

        {isLeaderOrMod ? (
          <AccountingEntryList
            entries={allEntries.map(e => ({
              id: e.id,
              type: e.type as "income" | "expense",
              amount: e.amount,
              description: e.description,
              date: e.date,
              categoryName: (e.expense_categories as unknown as { name: string } | null)?.name ?? null,
              version: e.version,
            }))}
            groupId={groupId}
          />
        ) : (
          <Card>
            <CardContent className="py-4 text-center text-gray-500 text-sm">
              明細の閲覧は権限者以上のみ可能です
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
