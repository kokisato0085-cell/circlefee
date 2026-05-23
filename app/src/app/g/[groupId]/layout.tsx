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

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("target_user_id", user.id)
    .eq("is_read", false);

  const badge = unreadCount && unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : null;

  const tabs = [
    { label: "ホーム", href: `/g/${groupId}`, icon: "🏠", badge: null },
    { label: "通知", href: `/g/${groupId}/notifications`, icon: "🔔", badge },
    { label: "メンバー", href: `/g/${groupId}/members`, icon: "👥", badge: null },
    { label: "設定", href: `/g/${groupId}/settings`, icon: "⚙️", badge: null },
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
              className="flex flex-1 flex-col items-center py-2 text-xs text-gray-600 hover:text-blue-600 relative"
            >
              <span className="text-lg relative">
                {tab.icon}
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
