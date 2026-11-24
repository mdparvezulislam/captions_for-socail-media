"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginWithKey } from "@/lib/session-actions";
import { cn } from "@/lib/cn";

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginWithKey(key);
      if (result.ok) {
        router.replace("/today");
        router.refresh();
      } else {
        setError(result.message ?? "লগইন ব্যর্থ");
      }
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-ink text-[20px] font-[680] text-[#FFFDF8]">
            ক
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-paper bg-accent" />
          </span>
          <div>
            <h1 className="text-[22px] font-[660]">ক্যাপশন স্টুডিও</h1>
            <p className="mt-1 text-[12.5px] text-ink-soft">সিক্রেট কী দিয়ে লগইন করুন</p>
          </div>
        </div>

        <form onSubmit={submit} className="card-surface flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-[600] text-ink-soft">সিক্রেট কী</span>
            <input
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              autoFocus
              autoComplete="current-password"
              placeholder="আপনার কী লিখুন"
              className="h-11 w-full rounded-[12px] border border-line bg-card px-3.5 text-[14px] tracking-[0.08em] outline-none focus:border-accent"
            />
          </label>

          {error ? (
            <p className="rounded-[10px] border border-berry/25 bg-berry-soft px-3 py-2 text-[12px] text-berry">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending || key.trim().length === 0}
            className={cn(
              "h-11 rounded-[12px] border border-accent-deep/25 bg-accent text-[14px] font-[600] text-white",
              "transition-colors hover:bg-accent-deep disabled:opacity-45",
            )}
          >
            {pending ? "যাচাই হচ্ছে…" : "প্রবেশ করুন"}
          </button>

          <p className="text-center text-[11px] leading-[1.7] text-ink-faint">
            কী হারিয়ে গেলে অ্যাডমিনের সাথে যোগাযোগ করুন
          </p>
        </form>
      </div>
    </main>
  );
}
