import type { Metadata, Viewport } from "next";
import { cache } from "react";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { listPages } from "@/lib/data";
import { currentSession } from "@/lib/session";

const getPages = cache(listPages);


export const metadata: Metadata = {
  title: "ক্যাপশন স্টুডিও — বাংলা ক্যাপশন ডেস্ক",
  description: "প্রোডাক্ট থেকে প্রতিদিন বাংলা ক্যাপশন — ফেসবুক পেজের জন্য তৈরি কনটেন্ট ডেস্ক।",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f1e9",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [pages, session] = await Promise.all([getPages(), currentSession()]);
  return (
    <html lang="bn">
      <head>
        <link rel="preload" href="/fonts/anek-bengali.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <AppShell pages={pages} session={session}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
