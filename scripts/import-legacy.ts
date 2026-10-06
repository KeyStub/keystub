/**
 * One-time, verified import of a Santa Fe Tracker export into an existing account.
 *
 *   npm run import:legacy -- <export.json> --email you@example.com [--dry-run]
 *
 * The account must already exist (sign up in the app first). Works whether or not
 * `npm run dev` is running.
 *
 * Safety: runs in one transaction; verifies record counts and cent totals against the file (and,
 * for the original handoff file, against the handoff's published totals) before committing.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { importExport } from "../src/db/import-core";
import { user } from "../src/db/schema";
import { summarizeRaw } from "../src/lib/legacy-import";
import { ensureLocalDb } from "./local-db";

config({ path: [".env.local", ".env"] });

/** Totals published in the handoff document (section 3). */
const HANDOFF_EXPECTED = {
  fuel: { count: 45, cents: 323574 },
  maintenance: { count: 16, cents: 537797 },
  costs: { count: 29, cents: 1065553 },
  vehicles: 1,
};

const fmt = (c: number) => `$${(c / 100).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`;

async function main() {
  const args = process.argv.slice(2);
  const file = args[0]?.startsWith("--") ? undefined : args[0];
  const email = args[args.indexOf("--email") + 1];
  const dryRun = args.includes("--dry-run");
  if (!file || !email || args.indexOf("--email") < 0) {
    console.error("Usage: npm run import:legacy -- <export.json> --email you@example.com [--dry-run]");
    process.exit(2);
  }

  const raw = JSON.parse(readFileSync(file, "utf8"));
  const before = summarizeRaw(raw);
  console.log("\nFile totals (before):");
  console.log(`  Vehicles:     ${before.vehicles}`);
  console.log(`  Fuel:         ${before.fuel.count} records, ${fmt(before.fuel.cents)}`);
  console.log(`  Maintenance:  ${before.maintenance.count} records, ${fmt(before.maintenance.cents)}`);
  console.log(`  Ins/Reg/etc:  ${before.costs.count} records, ${fmt(before.costs.cents)}`);

  const isHandoffFile = raw?.meta?.[0]?.migrationSource?.includes("Canva");
  if (isHandoffFile) {
    const ok =
      before.vehicles === HANDOFF_EXPECTED.vehicles &&
      JSON.stringify(before.fuel) === JSON.stringify(HANDOFF_EXPECTED.fuel) &&
      JSON.stringify(before.maintenance) === JSON.stringify(HANDOFF_EXPECTED.maintenance) &&
      JSON.stringify(before.costs) === JSON.stringify(HANDOFF_EXPECTED.costs);
    console.log(`\nMatches handoff document totals: ${ok ? "YES ✓" : "NO ✗"}`);
    if (!ok) {
      console.error("Refusing to import: the file doesn't match the totals in the handoff document.");
      process.exit(1);
    }
  }

  const local = await ensureLocalDb();
  process.env.DATABASE_URL = local.url;
  const { db, close } = createDb();
  try {
    const [u] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.email, email.toLowerCase()));
    if (!u) throw new Error(`No account with email ${email}. Sign up in the app first.`);
    const res = await importExport(db, u.id, raw, { source: `CLI import of ${file.split(/[\\/]/).pop()}`, dryRun });
    console.log(`\nWritten to database (${dryRun ? "DRY RUN — rolled back" : "committed"}):`);
    console.log(`  Vehicles:     ${res.written.vehicles}`);
    console.log(`  Fuel:         ${res.written.fuel.count} records, ${fmt(res.written.fuel.cents)}`);
    console.log(`  Maintenance:  ${res.written.maintenance.count} records, ${fmt(res.written.maintenance.cents)}`);
    console.log(`  Ins/Reg/etc:  ${res.written.costs.count} records, ${fmt(res.written.costs.cents)}`);
    console.log(`  ${res.inserted} inserted, ${res.updated} updated`);
    console.log(`\nBefore/after match: YES ✓`);
  } finally {
    await close();
    await local.stop();
  }
}

main().catch((e) => {
  console.error(`\nImport FAILED — nothing was saved.\n${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
