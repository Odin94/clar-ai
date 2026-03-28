import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { mkdir } from "fs/promises";
import { dirname } from "path";

export * from "./schema.js";
export { schema };

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb(url?: string) {
  if (_db) return _db;
  const dbPath = url ?? process.env.DATABASE_URL ?? "./data/clarai.db";
  await mkdir(dirname(dbPath), { recursive: true }).catch(() => {});
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _db = drizzle(sqlite, { schema });
  return _db;
}
