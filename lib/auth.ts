import { env } from "cloudflare:workers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getMemberByEmail } from "@/lib/data";
import type { Session } from "@/lib/types";

export const SESSION_COOKIE = "ce_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // ৩০ দিন

interface SessionPayload {
  role: "owner" | "moderator";
  exp: number;
}

function readEnv(key: string): string | undefined {
  const value = (env as unknown as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function authSecret(): string {
  // প্রোডাকশনে AUTH_SECRET সেট করতে হবে; ডেভ-ডিফল্ট শুধু লোকাল সুবিধার জন্য
  return readEnv("AUTH_SECRET") ?? "caption-engine-dev-secret-v1";
}

export function adminKey(): string | undefined {
  return readEnv("ADMIN_KEY");
}

export function moderatorKey(): string | undefined {
  return readEnv("MOD_KEY");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Secret key → role. Returns null when the key does not match. */
export function roleForKey(key: string): "owner" | "moderator" | null {
  const trimmed = key.trim();
  const admin = adminKey();
  const moderator = moderatorKey();
  if (admin && safeEqual(trimmed, admin)) return "owner";
  if (moderator && safeEqual(trimmed, moderator)) return "moderator";
  return null;
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function createSessionToken(role: "owner" | "moderator"): string {
  const payload: SessionPayload = { role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    if (payload.role !== "owner" && payload.role !== "moderator") return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): { maxAge: number; path: string; httpOnly: true; sameSite: "lax"; secure: boolean } {
  return {
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  };
}

const ROLE_LABEL: Record<Session["role"], string> = {
  owner: "owner",
  admin: "admin",
  moderator: "moderator",
};

/**
 * Session resolution order:
 * 1. নিজস্ব secret-key cookie (flparvez / usb)
 * 2. Cloudflare Access header (প্রোডাকশন SSO)
 * কোনোটা না মিললে null — প্রতিটি protected পেজ requireSession() দিয়ে /login-এ পাঠায়।
 */
export async function getSession(): Promise<Session | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (payload) {
    return {
      email: payload.role === "owner" ? "admin@caption.engine" : "moderator@caption.engine",
      name: payload.role === "owner" ? "পারভেজ" : "মডারেটর",
      role: payload.role,
      isDemo: false,
    };
  }

  const headerList = await import("next/headers").then((module) => module.headers());
  const accessEmail = headerList.get("cf-access-authenticated-user-email");
  if (accessEmail) {
    const member = await getMemberByEmail(accessEmail.toLowerCase()).catch(() => null);
    if (member) {
      return { email: member.email, name: member.name, role: member.role, isDemo: false };
    }
    return {
      email: accessEmail.toLowerCase(),
      name: "টিম মেম্বার",
      role: "moderator" as const,
      isDemo: false,
    };
  }

  return null;
}

export function canManage(session: Session | null): boolean {
  return session?.role === "owner" || session?.role === "admin";
}
