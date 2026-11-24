import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card-surface mx-auto mt-10 max-w-[520px] p-8 text-center">
      <p className="num text-[13px] tracking-[0.2em] text-ink-faint">৪০৪</p>
      <h1 className="mt-2 text-[22px]">এই পাতাটা খুঁজে পাওয়া গেল না</h1>
      <p className="mt-2 text-[13px] leading-[1.8] text-ink-soft">
        হয়তো লিংকটা পুরনো, অথবা ক্যাপশনটা মুছে ফেলা হয়েছে।
      </p>
      <Link
        href="/today"
        className="mt-5 inline-flex h-10 items-center rounded-[12px] border border-ink bg-ink px-5 text-[13.5px] font-[560] text-[#FFFDF8]"
      >
        আজকের ফিডে ফিরুন
      </Link>
    </div>
  );
}
