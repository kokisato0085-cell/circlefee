"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const roleLabels: Record<string, string> = {
  leader: "部長",
  moderator: "権限者",
  member: "一般員",
};

type Group = {
  id: string;
  name: string;
  role: string;
};

export function GroupList({ groups }: { groups: Group[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-center text-gray-500">
        所属しているグループはありません
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <Link key={group.id} href={`/g/${group.id}`}>
          <Card className="hover:bg-gray-100 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between py-4">
              <span className="font-medium">{group.name}</span>
              <span className="text-sm text-gray-500">
                {roleLabels[group.role] ?? group.role}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
