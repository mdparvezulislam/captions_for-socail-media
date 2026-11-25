
import { env } from "cloudflare:workers";
import { getSession } from "@/lib/auth";

/** Bearer INTERNAL_JOB_TOKEN অথবা লগইন-সেশন — দুটোর যেকোনোটা থাকলেই অনুমতি */
export async function canRunOps(request: Request): Promise<boolean> {
  const expected = (env as unknown as Record<string, unknown>).INTERNAL_JOB_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  if (typeof expected === "string" && expected.length > 0 && authorization === `Bearer ${expected}`) {
    return true;
  }
  try {
    return (await getSession()) !== null;
  } catch {
    return false;
  }
}
