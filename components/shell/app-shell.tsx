import Link from "next/link";
import type { ReactNode } from "react";
import type { Page, Session } from "@/lib/types";
import { logoutAction } from "@/lib/session-actions";
import { initials } from "@/lib/format";
import { NavLink } from "@/components/shell/nav-link";
import { QuickSearch } from "@/components/shell/quick-search-modal";
import {
  IconBox,
  IconLayers,
  IconLibrary,
  IconSettings,
  IconToday,
  IconUsers,
} from "@/components/ui/icons";

const NAV = [
  { href: "/today", label: "আজকের ফিড", icon: <IconToday size={18} /> },
  { href: "/library", label: "লাইব্রেরি", icon: <IconLibrary size={18} /> },
  { href: "/products", label: "প্রোডাক্ট", icon: <IconBox size={18} /> },
  { href: "/pages", label: "পেজ ও ব্র্যান্ড", icon: <IconLayers size={18} /> },
  { href: "/team", label: "টিম", icon: <IconUsers size={18} /> },
];

const MOBILE_NAV = [
  { href: "/today", label: "আজ", icon: <IconToday size={19} /> },
  { href: "/library", label: "লাইব্রেরি", icon: <IconLibrary size={19} /> },
  { href: "/products", label: "প্রোডাক্ট", icon: <IconBox size={19} /> },
  { href: "/pages", label: "পেজ", icon: <IconLayers size={19} /> },
  { href: "/team", label: "টিম", icon: <IconUsers size={19} /> },
];

function Brand() {
  return (
    <Link href="/today" className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-ink text-[15px] font-[680] text-[#FFFDF8]">
        ক
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-accent" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[14.5px] font-[660] tracking-[-0.01em]">ক্যাপশন স্টুডিও</span>
        <span className="text-[10.5px] tracking-[0.1em] text-ink-faint">CONTENT DESK</span>
      </span>
    </Link>
  );
}

export function AppShell({
  pages,
  session,
  children,
}: {
  pages: Page[];
  session: Session | null;
  children: ReactNode;
}) {
  if (!session) {
    return <div className="min-h-dvh">{children}</div>;
  }
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line/80 px-4 py-6 lg:flex">
        <Brand />

        <div className="mt-6">
          <QuickSearch />
        </div>

        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-7">
          <p className="px-3 text-[10.5px] font-[620] uppercase tracking-[0.15em] text-ink-faint">আপনার পেজ</p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {pages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/today?page=${page.slug}`}
                  className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: page.brand.accent }} />
                  <span className="truncate font-[520]">{page.name}</span>
                  <span className="num ml-auto text-[10.5px] text-ink-faint">{page.dailyCount}/দিন</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <IconSettings size={17} />
            সেটিংস
          </Link>
          <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-card/70 px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-deep text-[11.5px] font-[650] text-ink">
              {initials(session.name)}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-[580]">{session.name}</span>
              <span className="block text-[10.5px] text-ink-faint">
                {session.role === "owner" ? "অ্যাডমিন" : session.role === "admin" ? "অ্যাডমিন" : "মডারেটর"}
                {session.isDemo ? " · ডেমো" : ""}
              </span>
            </span>
            <form action={logoutAction}>
              <button type="submit" aria-label="লগআউট" title="লগআউট" className="text-[11px] text-ink-faint hover:text-berry">
                বাহির
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/70 bg-paper/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <QuickSearch />
            <Link
              href="/settings"
            aria-label="সেটিংস"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-card text-ink-soft"
            >
              <IconSettings size={17} />
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9">
          <div className="mx-auto w-full max-w-[1120px]">{children}</div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-1.5">
            {MOBILE_NAV.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} compact>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
