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
      // Idempotent additive migration for existing databases.
      for (const alteration of [
        "ALTER TABLE products ADD COLUMN enrich_json TEXT",
        "ALTER TABLE captions ADD COLUMN formatted_body TEXT",
      ]) {
        try {
          await database.prepare(alteration).run();
        } catch {
          /* column already exists */
        }
      }
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
