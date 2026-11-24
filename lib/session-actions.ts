"use server";

import { cookies } from "next/headers";
import { getSession, SESSION_COOKIE, sessionCookieOptions, createSessionToken, roleForKey } from "@/lib/auth";
import { logout } from "@/lib/session";

export async function loginAction(key: string): Promise<{ ok: boolean; message?: string }> {
  const role = roleForKey(key);
  if (!role) return { ok: false, message: "ভুল সিক্রেট কী" };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(role), sessionCookieOptions());
  return { ok: true };
}

export const loginWithKey = loginAction;

export async function logoutAction(): Promise<void> {
  await logout();
}

export async function sessionGuard(): Promise<boolean> {
  const { getSession } = await import("@/lib/auth");
  return (await getSession()) !== null;
}
