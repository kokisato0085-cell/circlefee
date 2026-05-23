import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tabs = [
    { label: "ホーム", href: `/g/${groupId}`, icon: "🏠" },
    { label: "通知", href: `/g/${groupId}/notifications`, icon: "🔔" },
    { label: "メンバー", href: `/g/${groupId}/members`, icon: "👥" },
    { label: "設定", href: `/g/${groupId}/settings`, icon: "⚙️" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 pb-16">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center py-2 text-xs text-gray-600 hover:text-blue-600"
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
