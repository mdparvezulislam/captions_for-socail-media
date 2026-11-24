"use client";

import { useActionState, useState } from "react";
import { updatePageAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconCheck } from "@/components/ui/icons";
import { bn, taka } from "@/lib/format";
import type { Page } from "@/lib/types";

type BrandState = {
  name: string;
  brandName: string;
  tagline: string;
  logoMark: string;
  primary: string;
  accent: string;
  surface: string;
  ink: string;
  badgeText: string;
  headline: string;
};

export function BrandEditor({ page }: { page: Page }) {
  const [state, formAction, pending] = useActionState(
    async (_previous: { ok: boolean; message?: string } | null, formData: FormData) => updatePageAction(formData),
    null,
  );
  const [brand, setBrand] = useState<BrandState>({
    name: page.name,
    brandName: page.brandName,
    tagline: page.tagline,
    logoMark: page.brand.logoMark,
    primary: page.brand.primary,
    accent: page.brand.accent,
    surface: page.brand.surface,
    ink: page.brand.ink,
    badgeText: "নতুন কালেকশন",
    headline: page.tagline || "ঘরের প্রয়োজন, এক জায়গায়",
  });

  const set = <K extends keyof BrandState>(key: K, value: BrandState[K]) =>
    setBrand((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start">
      <form action={formAction} className="card-surface flex flex-col gap-4 p-5">
        <input type="hidden" name="pageId" value={page.id} />
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-[640]">ব্র্যান্ড কিট সম্পাদনা</h2>
          <Badge tone="neutral">{page.slug}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="পেজের নাম">
            <Input name="name" value={brand.name} onChange={(event) => set("name", event.target.value)} />
          </Field>
          <Field label="ব্র্যান্ড নাম">
            <Input
              name="brandName"
              value={brand.brandName}
              onChange={(event) => set("brandName", event.target.value)}
            />
          </Field>
        </div>

        <Field label="ট্যাগলাইন" hint="পোস্টারের নিচে ছোট করে দেখাবে">
          <Input name="tagline" value={brand.tagline} onChange={(event) => set("tagline", event.target.value)} />
        </Field>

        <Field label="ব্র্যান্ড ভয়েস" hint="কীভাবে কথা বলবে">
          <Textarea name="voice" defaultValue={page.voice} rows={3} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CTA টেক্সট">
            <Input name="ctaText" defaultValue={page.ctaText} />
          </Field>
          <Field label="লোগো মার্ক" hint="২–৪ অক্ষর">
            <Input
              name="logoMark"
              maxLength={4}
              value={brand.logoMark}
              onChange={(event) => set("logoMark", event.target.value)}
            />
          </Field>
        </div>

        <Field label="হ্যাশট্যাগ" hint="স্পেস বা কমা দিয়ে আলাদা করুন">
          <Input name="hashtags" defaultValue={page.hashtags.join(" ")} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="দৈনিক ক্যাপশন" hint="১–১০">
            <Input name="dailyCount" type="number" min={1} max={10} defaultValue={page.dailyCount} />
          </Field>
          <Field label="রিপিট গ্যাপ (দিন)" hint="এই সময়ের মধ্যে একই প্রোডাক্ট আসবে না">
            <Input name="repeatGapDays" type="number" min={0} max={365} defaultValue={page.repeatGapDays} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["primary", "প্রাইমারি"],
              ["accent", "অ্যাকসেন্ট"],
              ["surface", "সারফেস"],
              ["ink", "টেক্সট"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <span className="flex items-center gap-2 rounded-[12px] border border-line bg-card px-2 py-1.5">
                <input
                  type="color"
                  name={key}
                  value={brand[key]}
                  onChange={(event) => set(key, event.target.value)}
                  aria-label={label}
                  className="h-7 w-7 cursor-pointer rounded-[7px] border-0 bg-transparent p-0"
                />
                <input
                  value={brand[key]}
                  onChange={(event) => set(key, event.target.value)}
                  className="num w-full min-w-0 bg-transparent text-[11.5px] uppercase outline-none"
                />
              </span>
            </Field>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="পোস্টার স্টাইল">
            <Select name="layout" defaultValue={page.brand.layout}>
              <option value="editorial">এডিটোরিয়াল — টেক্সট আগে</option>
              <option value="bold">বোল্ড — ছবি আগে</option>
              <option value="minimal">মিনিমাল — সাদা জায়গা</option>
            </Select>
          </Field>
          <Field label="ওয়াটারমার্ক">
            <Input name="watermark" defaultValue={page.brand.watermark} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line/70 pt-3">
          <Button type="submit" variant="primary" disabled={pending} icon={<IconCheck size={16} />}>
            {pending ? "সেভ হচ্ছে…" : "সেভ করুন"}
          </Button>
          {state?.ok ? <span className="text-[12px] text-moss">সেভ হয়েছে</span> : null}
          {state && !state.ok ? <span className="text-[12px] text-berry">{state.message}</span> : null}
          <span className="ml-auto text-[11px] text-ink-faint">
            শেষ আপডেট {bn(new Date(page.createdAt).getDate())} তারিখে
          </span>
        </div>
      </form>

      <div className="flex flex-col gap-3 lg:sticky lg:top-6">
        <p className="text-[11px] font-[620] uppercase tracking-[0.14em] text-ink-faint">লাইভ প্রিভিউ</p>
        <div
          className="relative overflow-hidden rounded-[22px] border border-line p-5 shadow-[0_24px_60px_-44px_rgba(23,19,15,0.8)]"
          style={{ background: brand.surface, color: brand.ink }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${brand.accent}, transparent 70%)` }}
          />
          <div className="relative flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-[660] text-white"
              style={{ background: brand.ink }}
            >
              {brand.logoMark || "ক"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-[640]">{brand.brandName}</span>
              <span className="block truncate text-[10.5px] opacity-60">{brand.tagline}</span>
            </span>
          </div>

          <div className="relative mt-5">
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-[620] text-white"
              style={{ background: brand.accent }}
            >
              {brand.badgeText}
            </span>
            <p className="mt-3 text-[22px] leading-[1.3] font-[660]" style={{ color: brand.ink }}>
              {brand.headline}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-[1.7] opacity-70">
              {page.name} — প্রতিদিন নতুন অফার, ক্যাশ অন ডেলিভারি।
            </p>
          </div>

          <div
            className="relative mt-5 flex h-28 items-end justify-between rounded-[16px] px-3 pb-3 text-white"
            style={{ background: `linear-gradient(135deg, ${brand.accent}, ${brand.primary} 70%, ${brand.ink})` }}
          >
            <span className="text-[10.5px] opacity-80">পোস্টার আর্ট এরিয়া</span>
            <span className="num text-[20px] font-[680]">{taka(1290)}</span>
          </div>

          <div
            className="relative mt-3 flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[12px] text-white"
            style={{ background: brand.ink }}
          >
            <span>{page.ctaText}</span>
            <span aria-hidden>→</span>
          </div>

          <p className="relative mt-3 text-right text-[9.5px] opacity-40">{page.brand.watermark}</p>
        </div>
        <p className="text-[11px] leading-[1.7] text-ink-faint">
          পোস্টার স্টুডিওতে এই রঙ আর ফন্টই ব্যবহার হবে। ভয়েস বদলালে নতুন ক্যাপশনের টোনও বদলাবে।
        </p>
      </div>
    </div>
  );
}
