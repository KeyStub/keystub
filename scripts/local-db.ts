/**
 * Local development database: a real PostgreSQL 18 server (via the embedded-postgres npm package),
 * stored in ./.data/postgres and listening on localhost only. Crash-safe (write-ahead log), and the
 * same engine as production.
 *
 * If DATABASE_URL is set, that database is used instead and nothing local is started.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const DIR = path.join(process.cwd(), ".data", "postgres");
const PORT = Number(process.env.LOCAL_DB_PORT ?? 54329);
const USER = "tracker";
const PASSWORD = "tracker-local-dev"; // localhost-only dev server; never used in production
const DB = "tracker";
export const LOCAL_URL = `postgres://${USER}:${PASSWORD}@localhost:${PORT}/${DB}`;

async function canConnect(url: string) {
  const sql = postgres(url, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Returns a connection URL and a `stop` function (no-op if we didn't start the server). */
export async function ensureLocalDb(): Promise<{ url: string; stop: () => Promise<void> }> {
  if (process.env.DATABASE_URL) return { url: process.env.DATABASE_URL, stop: async () => {} };
  if (await canConnect(LOCAL_URL)) return { url: LOCAL_URL, stop: async () => {} }; // already running (e.g. dev server)

  const pg = new EmbeddedPostgres({
    databaseDir: DIR,
    port: PORT,
    user: USER,
    password: PASSWORD,
    persistent: true,
    postgresFlags: ["-c", "listen_addresses=localhost"],
    onLog: () => {},
  });
  const fresh = !existsSync(path.join(DIR, "PG_VERSION"));
  if (fresh) {
    console.log("Creating local Postgres database in .data/postgres …");
    await pg.initialise();
  }
  await pg.start();
  if (fresh) await pg.createDatabase(DB);
  return { url: LOCAL_URL, stop: () => pg.stop() };
}
