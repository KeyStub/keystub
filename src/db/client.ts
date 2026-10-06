/**
 * Database connection (PostgreSQL via postgres.js).
 *
 * DATABASE_URL points at any Postgres: Neon / Supabase / RDS in production, or the local dev
 * server that `npm run dev` starts automatically (see scripts/local-db.ts).
 *
 * Kept free of Next-only imports so CLI scripts (import, migrate) can use it too.
 */
import path from "node:path";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

export function createDb(): { db: DB; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Start the app with `npm run dev`, or set DATABASE_URL.");
  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    prepare: false, // compatible with transaction-mode poolers (Neon, Supabase, PgBouncer)
    onnotice: () => {},
  });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
