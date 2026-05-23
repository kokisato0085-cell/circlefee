"use client";

import { useState, useEffect } from "react";
import { subscribePush, unsubscribePush } from "@/app/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }
    setSupported(true);

    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      setLoading(false);
    });
  }, []);

  async function handleToggle() {
    setError(null);
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ).buffer as ArrayBuffer,
        });

        const keys = sub.toJSON().keys!;
        const result = await subscribePush(
          sub.endpoint,
          keys.p256dh!,
          keys.auth!
        );
        if (result.error) {
          setError(result.error);
          await sub.unsubscribe();
        } else {
          setSubscribed(true);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("通知が拒否されています。ブラウザの設定を確認してください");
      } else {
        setError("エラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return <p className="text-sm text-gray-400">この端末はプッシュ通知に対応していません</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-sm">プッシュ通知</span>
        <Button
          size="sm"
          variant={subscribed ? "destructive" : "default"}
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? "..." : subscribed ? "無効にする" : "有効にする"}
        </Button>
      </div>
      {subscribed && (
        <p className="text-xs text-green-600">プッシュ通知は有効です</p>
      )}
    </div>
  );
}
