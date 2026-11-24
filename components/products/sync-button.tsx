"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconRefresh } from "@/components/ui/icons";
import { syncUniStoreAction } from "@/app/actions";

export function SyncButton({ pageSlug }: { pageSlug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="quiet"
        icon={<IconRefresh size={15} className={pending ? "animate-spin" : ""} />}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await syncUniStoreAction(pageSlug);
            setMessage(result.message);
            router.refresh();
            setTimeout(() => setMessage(null), 6000);
          })
        }
      >
        {pending ? "সিঙ্ক হচ্ছে…" : "স্টোর থেকে সিঙ্ক করুন"}
      </Button>
      {message ? <span className="text-[11.5px] text-ink-soft">{message}</span> : null}
    </div>
  );
}
