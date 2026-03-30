import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import { mkdir } from "fs/promises";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "../migrations");
const dbPath = process.env["DATABASE_URL"] ?? "./data/clarai.db";

await mkdir(dirname(resolve(dbPath)), { recursive: true }).catch(() => {});

console.log(`Applying migrations to: ${dbPath}`);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder });
sqlite.close();

console.log("✓ Migrations applied successfully.");
