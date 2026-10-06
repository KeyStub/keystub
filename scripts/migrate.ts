/** Applies pending migrations in ./drizzle to DATABASE_URL (starting the local dev DB if unset). */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { createDb, MIGRATIONS_DIR } from "../src/db/client";
import { ensureLocalDb } from "./local-db";

export async function runMigrations() {
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { db, close } = createDb();
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  await close();
  console.log("Database migrations up to date.");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/migrate.ts")) {
  (async () => {
    if (process.env.VERCEL && !process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set in Vercel → Settings → Environment Variables. Add it, then redeploy.");
    }
    const { url, stop } = await ensureLocalDb();
    process.env.DATABASE_URL = url;
    await runMigrations();
    await stop();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
