"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card-surface mx-auto mt-10 max-w-[520px] p-7 text-center">
      <p className="text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">কিছু একটা আটকে গেছে</p>
      <h1 className="mt-2 text-[22px]">পেজটা লোড করতে সমস্যা হচ্ছে</h1>
      <p className="mt-2 text-[13px] leading-[1.8] text-ink-soft">
        সাময়িক সমস্যা হতে পারে। আবার চেষ্টা করুন — আপনার ডেটা নিরাপদ আছে।
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 h-10 rounded-[12px] border border-ink bg-ink px-5 text-[13.5px] font-[560] text-[#FFFDF8]"
      >
        আবার চেষ্টা করুন
      </button>
    </div>
  );
}
