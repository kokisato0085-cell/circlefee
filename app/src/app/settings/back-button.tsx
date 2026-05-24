"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/groups";

  return (
    <Link href={from}>
      <Button variant="ghost" size="sm">
        ← 戻る
      </Button>
    </Link>
  );
}
