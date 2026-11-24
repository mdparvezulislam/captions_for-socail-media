import { env } from "cloudflare:workers";
import { SCHEMA_STATEMENTS } from "@/lib/schema";
import { seedDatabase } from "@/lib/seed";

let bootstrap: Promise<void> | null = null;

export function db(): D1Database {
  return env.DB;
}

/**
 * Idempotent schema + demo seed. Runs once per isolate; failures retry on next request.
 */
export function readyDb(): Promise<D1Database> {
  if (!bootstrap) {
    bootstrap = (async () => {
      const database = env.DB;
      await database.batch(SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)));
      await seedDatabase(database);
    })().catch((error) => {
      bootstrap = null;
      throw error;
    });
  }
  return bootstrap.then(() => env.DB);
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
