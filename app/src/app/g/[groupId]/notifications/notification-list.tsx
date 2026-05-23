"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/app/actions/notifications";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedEventId: string | null;
  createdAt: string;
};

const typeIcons: Record<string, string> = {
  payment_claimed: "💰",
  payment_approved: "✅",
  payment_rejected: "↩️",
  reminder: "⏰",
  event_created: "📋",
  join_request: "👤",
  leader_transferred: "👑",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}

export function NotificationList({
  notifications,
  groupId,
  hasUnread,
}: {
  notifications: Notification[];
  groupId: string;
  hasUnread: boolean;
}) {
  useEffect(() => {
    if (hasUnread) {
      markNotificationsRead(groupId);
    }
  }, [hasUnread, groupId]);

  if (notifications.length === 0) {
    return <p className="text-sm text-gray-500">通知はありません</p>;
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const icon = typeIcons[n.type] ?? "🔔";
        const content = (
          <div
            className={`flex gap-3 items-start border rounded-lg px-4 py-3 ${
              n.isRead ? "bg-white" : "bg-blue-50 border-blue-200"
            }`}
          >
            <span className="text-lg shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm break-words">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          </div>
        );

        if (n.relatedEventId) {
          return (
            <Link key={n.id} href={`/g/${groupId}/events/${n.relatedEventId}`}>
              {content}
            </Link>
          );
        }
        return <div key={n.id}>{content}</div>;
      })}
    </div>
  );
}
