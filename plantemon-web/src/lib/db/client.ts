import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazily opens the database connection.
 *
 * Deliberately not created at module scope: that would throw at import time in
 * any environment without DATABASE_URL, taking down routes that never touch
 * the database.
 */
export function getDb() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL. Create a Postgres database (e.g. Neon) and add its connection string to .env.local.",
    );
  }

  cached = drizzle(neon(url), { schema });
  return cached;
}
