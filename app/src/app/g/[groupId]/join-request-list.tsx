"use client";

import { useState } from "react";
import { handleJoinRequest } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";

type JoinRequest = {
  id: string;
  display_name: string;
  created_at: string;
};

export function JoinRequestList({ requests }: { requests: JoinRequest[] }) {
  const [processed, setProcessed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setError(null);
    const result = await handleJoinRequest(requestId, action);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProcessed((prev) => new Set(prev).add(requestId));
  }

  const pending = requests.filter((r) => !processed.has(r.id));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">
        参加リクエスト {pending.length > 0 && `(${pending.length}件)`}
      </h2>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-3">{error}</p>
      )}
      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">保留中のリクエストはありません</p>
      ) : (
        <div className="space-y-3">
          {pending.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between bg-white border rounded-lg px-4 py-3"
            >
              <span>{req.display_name}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(req.id, "approve")}
                >
                  承認
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(req.id, "reject")}
                >
                  拒否
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
