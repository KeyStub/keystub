import "server-only";
import { createDb, type DB } from "./client";

// Reuse one connection across dev hot-reloads (and across requests in a server process).
const g = globalThis as unknown as { __db?: DB };

/**
 * Connects on first use rather than on import, so `next build` (which loads route modules to
 * read their config) works without DATABASE_URL.
 */
export const db: DB = new Proxy({} as DB, {
  get(_t, prop) {
    const real = (g.__db ??= createDb().db);
    const v = Reflect.get(real, prop, real);
    return typeof v === "function" ? v.bind(real) : v;
  },
});
