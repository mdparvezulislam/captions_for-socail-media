import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[12px] border border-line bg-card px-3.5 py-2.5 text-[14.5px] text-ink shadow-[0_1px_0_#fff_inset] transition-colors duration-150 placeholder:text-ink-faint hover:border-ink/20 focus:border-accent focus:outline-none";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-[600] tracking-[0.02em] text-ink-soft">{label}</span>
        {hint ? <span className="text-[11.5px] text-ink-faint">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-[110px] resize-y leading-[1.8]", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Switch({ checked, name }: { checked: boolean; name: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5">
      <input type="checkbox" name={name} defaultChecked={checked} className="peer sr-only" />
      <span className="relative h-6 w-11 rounded-full border border-line bg-paper-deep transition-colors duration-200 peer-checked:border-moss peer-checked:bg-moss peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
        <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-card shadow-sm transition-transform duration-200 peer-checked:translate-x-[18px]" />
      </span>
    </label>
  );
}
