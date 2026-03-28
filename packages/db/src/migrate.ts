/**
 * Migration runner — applies all pending Drizzle migrations in packages/db/migrations/
 *
 * Usage:
 *   npm run db:migrate                  (uses DATABASE_URL env or ./data/clarai.db)
 *   DATABASE_URL=./other.db npm run db:migrate
 *
 * Why not `drizzle-kit migrate`?
 *   drizzle-kit opens its own connection and can stall on a WAL-mode DB that is
 *   already open.  This script uses drizzle-orm's migrate() directly, which
 *   shares the same connection lifecycle as the rest of the app.
 *
 * Bootstrapping note:
 *   The DB may have been created by the seed script before the migration system
 *   was introduced.  In that case __drizzle_migrations is empty even though all
 *   the tables from 0000 already exist.  We detect this situation and stamp 0000
 *   as already-applied so that migrate() only runs genuinely new migrations.
 */

import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import { readFileSync, readdirSync } from "fs";
import { mkdir } from "fs/promises";
import { createHash } from "crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "../migrations");

/** Compute the SHA-256 hash Drizzle uses to fingerprint a migration file. */
function hashMigration(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

async function main() {
  const dbPath = process.env["DATABASE_URL"] ?? "./data/clarai.db";
  await mkdir(dirname(resolve(dbPath)), { recursive: true }).catch(() => {});

  console.log(`Applying migrations to: ${dbPath}`);
  console.log(`Migrations folder:      ${migrationsFolder}`);

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // If the tracking table exists but is empty, the DB was bootstrapped via the
  // seed script (CREATE TABLE IF NOT EXISTS) rather than the migrator.
  // Stamp every migration whose tables already exist so migrate() skips them.
  const trackingExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
    .get();

  if (trackingExists) {
    const applied = sqlite
      .prepare("SELECT hash FROM __drizzle_migrations")
      .all() as { hash: string }[];
    const appliedHashes = new Set(applied.map((r) => r.hash));

    if (appliedHashes.size === 0) {
      // Seed-bootstrapped DB: stamp all migration files that don't introduce
      // tables we already have, so the migrator won't try to recreate them.
      const existingTables = new Set<string>(
        (sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[])
          .map((r) => r.name)
      );

      const migrationFiles = readdirSync(migrationsFolder)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      const now = Date.now();
      const stamp = sqlite.prepare(
        "INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)"
      );

      for (const file of migrationFiles) {
        const sql = readFileSync(resolve(migrationsFolder, file), "utf8");
        const hash = hashMigration(sql);
        if (appliedHashes.has(hash)) continue;

        // Heuristic: if every CREATE TABLE in this migration already exists,
        // the migration has effectively been applied — stamp it.
        const creates = [...sql.matchAll(/CREATE TABLE[^`]*`(\w+)`/g)].map((m) => m[1]);
        const allExist = creates.length > 0 && creates.every((t) => existingTables.has(t));

        if (allExist) {
          stamp.run(hash, now);
          console.log(`  ✓ Stamped as already applied: ${file}`);
        }
      }
    }
  }

  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder });

  sqlite.close();
  console.log("✓ Migrations applied successfully.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
