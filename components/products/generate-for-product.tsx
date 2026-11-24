"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconSpark } from "@/components/ui/icons";
import { generateForProductAction } from "@/app/actions";

export function GenerateForProduct({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="accent"
        icon={<IconSpark size={16} className={pending ? "animate-pulse" : ""} />}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateForProductAction(productId);
            if (!result.ok) setMessage(result.message ?? "তৈরি করা যায়নি");
            router.refresh();
          })
        }
      >
        {pending ? "লিখছে…" : "এই প্রোডাক্টের ক্যাপশন তৈরি করুন"}
      </Button>
      {message ? <p className="text-[12px] text-berry">{message}</p> : null}
    </div>
  );
}
