import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "quiet" | "ghost" | "danger" | "moss";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[12px] font-[560] transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out select-none whitespace-nowrap disabled:opacity-45 disabled:pointer-events-none active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-[#FFFDF8] border border-ink shadow-[0_10px_22px_-16px_rgba(23,19,15,0.9)] hover:bg-[#2A241D]",
  accent:
    "bg-accent text-white border border-accent-deep/20 shadow-[0_10px_22px_-14px_rgba(207,79,23,0.85)] hover:bg-accent-deep",
  quiet:
    "bg-card text-ink border border-line hover:border-ink/25 hover:bg-card-soft shadow-[0_1px_0_#fff_inset]",
  ghost: "bg-transparent text-ink-soft border border-transparent hover:bg-ink/[0.05] hover:text-ink",
  danger: "bg-berry-soft text-berry border border-berry/20 hover:bg-berry hover:text-white",
  moss: "bg-moss-soft text-moss border border-moss/20 hover:bg-moss hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-5 text-[15px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({ variant = "quiet", size = "md", icon, className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({ variant = "quiet", size = "md", icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <a className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </a>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-card text-ink-soft transition-colors duration-150 hover:border-ink/25 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
