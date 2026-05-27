import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryManager } from "./category-manager";

export default async function CategoriesPage({
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

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("id, name, created_at")
    .eq("group_id", groupId)
    .order("name");

  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/g/${groupId}/accounting`}>
            <Button variant="ghost" size="sm">← 戻る</Button>
          </Link>
          <h1 className="text-xl font-bold">カテゴリ管理</h1>
        </div>

        <CategoryManager
          groupId={groupId}
          categories={(categories ?? []).map(c => ({ id: c.id, name: c.name }))}
        />

        {(!categories || categories.length === 0) && (
          <Card>
            <CardContent className="py-4 text-center text-gray-500 text-sm">
              カテゴリはまだ登録されていません
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
