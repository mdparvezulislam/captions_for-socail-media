"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconSpark } from "@/components/ui/icons";
import { generateBatchAction } from "@/app/actions";
import { bn } from "@/lib/format";

export function GenerateMore({
  pageSlug,
  count,
  label,
  size = "md",
  variant = "accent",
}: {
  pageSlug: string;
  count: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "accent" | "quiet";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await generateBatchAction(pageSlug);
      if (result.message) setMessage(result.message);
      else if (result.ok) setMessage(`${bn(result.created)}টি ক্যাপশন তৈরি হয়েছে`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant={variant}
        size={size}
        onClick={run}
        disabled={pending}
        icon={<IconSpark size={16} className={pending ? "animate-pulse" : ""} />}
      >
        {pending ? "লিখছে…" : (label ?? `আরও ${bn(count)}টা প্রোডাক্ট`)}
      </Button>
      {message ? <span className="text-[11.5px] text-ink-soft">{message}</span> : null}
    </div>
  );
}
