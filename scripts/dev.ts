/** `npm run dev`: start the local database (if needed), apply migrations, then run Next.js. */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { spawn } from "node:child_process";
import { ensureLocalDb } from "./local-db";
import { runMigrations } from "./migrate";

async function main() {
  const { url, stop } = await ensureLocalDb();
  process.env.DATABASE_URL = url;
  await runMigrations();

  const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });
  let stopping = false;
  const shutdown = async (code: number) => {
    if (stopping) return;
    stopping = true;
    next.kill();
    await stop(); // clean Postgres shutdown
    process.exit(code);
  };
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
  next.on("exit", (code) => shutdown(code ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
