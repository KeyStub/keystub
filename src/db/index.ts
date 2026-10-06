import "server-only";
import { createDb, type DB } from "./client";

// Reuse one connection across dev hot-reloads (and across requests in a server process).
const g = globalThis as unknown as { __db?: DB };

export const db: DB = (g.__db ??= createDb().db);
