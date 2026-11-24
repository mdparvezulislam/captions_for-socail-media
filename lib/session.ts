import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, SESSION_COOKIE, sessionCookieOptions, createSessionToken, roleForKey } from "@/lib/auth";
import type { Session } from "@/lib/types";

export type { Session };
export { getSession };

/** Protected পেজগুলোর প্রথম লাইনে ডাকা হয় — সেশন না থাকলে /login। */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function currentSession(): Promise<Session | null> {
  return getSession();
}

export async function loginWithKey(key: string): Promise<{ ok: boolean; message?: string }> {
  const role = roleForKey(key);
  if (!role) return { ok: false, message: "ভুল সিক্রেট কী" };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(role), sessionCookieOptions());
  return { ok: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
