"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { IconRefresh } from "@/components/ui/icons";
import { regenerateWhatsappAction } from "@/app/actions";
import { bn, wordCount } from "@/lib/format";

/**
 * WhatsApp / Messenger রিপ্লাই — গ্রাহক কমেন্ট বা ইনবক্স করলে কপি করে পাঠানো হবে।
 */
export function WhatsappCard({
  productId,
  initialMessage,
  productName,
}: {
  productId: string;
  initialMessage: string | null;
  productName: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function regenerate() {
    startTransition(async () => {
      const result = await regenerateWhatsappAction(productId);
      if (result.ok) {
        setNote("নতুন রিপ্লাই তৈরি হয়েছে");
        router.refresh();
      } else {
        setNote(result.message ?? "তৈরি করা যায়নি");
      }
      setTimeout(() => setNote(null), 2400);
    });
  }

  return (
    <article className="rounded-[16px] border border-moss/25 bg-moss-soft/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-[620] text-ink">💬 WhatsApp / ইনবক্স রিপ্লাই</span>
          <Badge tone="moss">গ্রাহককে পাঠান</Badge>
        </div>
        <span className="num text-[10.5px] text-ink-faint">
          {message ? `${bn(wordCount(message))} শব্দ` : "তৈরি হচ্ছে…"}
        </span>
      </div>

      {message ? (
        <p className="caption-text mt-2.5 rounded-[12px] border border-moss/20 bg-card/80 px-3.5 py-3">{message}</p>
      ) : (
        <p className="mt-2.5 rounded-[12px] border border-dashed border-moss/25 bg-card/50 px-3.5 py-3 text-[12px] text-ink-soft">
          এই প্রোডাক্টের WhatsApp রিপ্লাই এখনো তৈরি হয়নি। নিচের বাটনে চাপ দিলে তৈরি হবে।
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {message ? (
          <CopyButton
            text={message}
            label="রিপ্লাই কপি"
            copiedLabel="কপি হয়েছে"
            className="h-10 border-moss bg-moss text-white hover:bg-moss/90"
          />
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          icon={<IconRefresh size={14} className={pending ? "animate-spin" : ""} />}
          onClick={regenerate}
          disabled={pending}
        >
          {pending ? "লিখছে…" : "নতুন রিপ্লাই"}
        </Button>
        {note ? <span className="text-[11.5px] text-moss">{note}</span> : null}
      </div>

      <p className="mt-2 text-[11px] leading-[1.7] text-ink-faint">
        {productName}-এর দাম, ডেলিভারি, ওয়ারেন্টি আর অর্ডার লিংক সহ — গ্রাহকের মেসেজের উত্তরে পেস্ট করুন।
      </p>
    </article>
  );
}
