"use client";

import { useState } from "react";
import { createPoll, updatePoll, deletePoll } from "@/app/actions/polls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PollData = {
  id: string;
  question: string;
  options: { id: string; label: string }[];
} | null;

export function PollManage({
  poll,
  eventId,
  groupId,
}: {
  poll: PollData;
  eventId: string;
  groupId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(poll?.question ?? "");
  const [options, setOptions] = useState<string[]>(
    poll ? poll.options.map((o) => o.label) : ["", ""]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function addOption() {
    if (options.length < 10) setOptions([...options, ""]);
  }

  function removeOption(index: number) {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  }

  async function handleSave() {
    setError(null);
    setPending(true);
    const validOptions = options.filter((o) => o.trim());

    let result;
    if (poll) {
      if (!confirm("投票を編集すると、既存の全投票がリセットされます。よろしいですか？")) {
        setPending(false);
        return;
      }
      result = await updatePoll(poll.id, groupId, eventId, question, validOptions);
    } else {
      result = await createPoll(eventId, groupId, question, validOptions);
    }

    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!poll) return;
    setPending(true);
    const result = await deletePoll(poll.id, groupId, eventId);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
      setQuestion("");
      setOptions(["", ""]);
    }
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        {poll ? "投票を編集" : "+ 投票を追加"}
      </Button>
    );
  }

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-blue-50">
      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      <div className="space-y-1">
        <Label>質問文</Label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={50}
          placeholder="例: 何曜日がいい？"
        />
      </div>
      <div className="space-y-2">
        <Label>選択肢</Label>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              maxLength={20}
              placeholder={`選択肢 ${i + 1}`}
            />
            {options.length > 2 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i)}>
                ×
              </Button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            + 選択肢を追加
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1" disabled={pending}>
          {pending ? "保存中..." : "保存"}
        </Button>
        <Button variant="outline" onClick={() => setEditing(false)} disabled={pending}>
          キャンセル
        </Button>
        {poll && (
          <Button variant="ghost" className="text-red-600" onClick={handleDelete} disabled={pending}>
            削除
          </Button>
        )}
      </div>
    </div>
  );
}
