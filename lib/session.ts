import { headers } from "next/headers";
import { getMemberByEmail } from "@/lib/data";
import type { Session } from "@/lib/types";

const DEV_FALLBACK_EMAIL = "owner@uniquestore.bd";

/**
 * In production Cloudflare Access injects the authenticated user email.
 * Locally we fall back to the seeded owner so the app is usable instantly.
 */
export async function getSession(): Promise<Session> {
  const headerList = await headers();
  const accessEmail = headerList.get("cf-access-authenticated-user-email");
  const email = (accessEmail ?? process.env.DEV_USER_EMAIL ?? DEV_FALLBACK_EMAIL).toLowerCase();
  const member = await getMemberByEmail(email).catch(() => null);
  return {
    email,
    name: member?.name ?? "রাকিব হাসান",
    role: member?.role ?? "owner",
    isDemo: !accessEmail,
  };
}
