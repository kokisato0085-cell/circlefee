"use client";

import { useState } from "react";
import { createInviteLink } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";

export function InviteLinkSection({ groupId }: { groupId: string }) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await createInviteLink(groupId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.inviteUrl) {
      const fullUrl = `${window.location.origin}${result.inviteUrl}`;
      setInviteUrl(fullUrl);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = inviteUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">招待リンク</h2>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-3">{error}</p>
      )}
      {inviteUrl ? (
        <div className="space-y-2">
          <div className="bg-gray-50 border rounded-lg p-3 text-sm break-all">
            {inviteUrl}
          </div>
          <p className="text-xs text-gray-500">有効期限: 7日間</p>
          <Button onClick={handleCopy} variant="outline" className="w-full">
            {copied ? "コピーしました" : "リンクをコピー"}
          </Button>
        </div>
      ) : (
        <Button onClick={handleGenerate} variant="outline" className="w-full" disabled={pending}>
          {pending ? "生成中..." : "招待リンクを生成"}
        </Button>
      )}
    </div>
  );
}
