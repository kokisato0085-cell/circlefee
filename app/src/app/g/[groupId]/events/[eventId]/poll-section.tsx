"use client";

import { useState, useTransition } from "react";
import { vote } from "@/app/actions/polls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PollOption = {
  id: string;
  label: string;
  voteCount: number;
};

type PollData = {
  id: string;
  question: string;
  options: PollOption[];
  myVoteOptionId: string | null;
  totalVotes: number;
};

export function PollSection({
  poll,
  groupId,
  eventId,
}: {
  poll: PollData;
  groupId: string;
  eventId: string;
}) {
  const [selectedId, setSelectedId] = useState(poll.myVoteOptionId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleVote(optionId: string) {
    setError(null);
    const prev = selectedId;
    setSelectedId(optionId);
    startTransition(async () => {
      const result = await vote(poll.id, optionId, groupId, eventId);
      if (result.error) {
        setSelectedId(prev);
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <h2 className="font-semibold">{poll.question}</h2>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="space-y-2">
          {poll.options.map((opt) => {
            const isSelected = selectedId === opt.id;
            const percent = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleVote(opt.id)}
                disabled={isPending}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors relative overflow-hidden ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div
                  className="absolute inset-0 bg-blue-100 opacity-30 transition-all"
                  style={{ width: `${percent}%` }}
                />
                <div className="relative flex items-center justify-between">
                  <span className={isSelected ? "font-medium text-blue-700" : ""}>
                    {isSelected && "● "}{opt.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {opt.voteCount}票 ({percent}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 text-right">
          {poll.totalVotes}人が投票済み
        </p>
      </CardContent>
    </Card>
  );
}
