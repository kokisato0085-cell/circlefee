import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportView } from "./report-view";

export default async function ReportPage({
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

  if (!membership || (membership.role !== "leader" && membership.role !== "moderator")) {
    redirect(`/g/${groupId}`);
  }

  const { data: entries } = await supabase
    .from("account_entries")
    .select("type, amount, date, category_id, expense_categories(name)")
    .eq("group_id", groupId)
    .order("date", { ascending: true });

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("id, name")
    .eq("group_id", groupId);

  const serializedEntries = (entries ?? []).map(e => ({
    type: e.type as "income" | "expense",
    amount: e.amount,
    date: e.date,
    categoryId: e.category_id,
    categoryName: (e.expense_categories as unknown as { name: string } | null)?.name ?? null,
  }));

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}/accounting`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">収支レポート</h1>
        </div>

        {serializedEntries.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-gray-500 text-sm">
              入出金データがありません
            </CardContent>
          </Card>
        ) : (
          <ReportView entries={serializedEntries} />
        )}
      </div>
    </div>
  );
}
