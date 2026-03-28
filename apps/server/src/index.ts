import { getDb } from "@clarai/db";
import { env } from "./env.js";
import { buildApp } from "./buildApp.js";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// __dirname = apps/server/src/ → ../../../ = project root
const DB_PATH = env.DATABASE_URL === "./data/clarai.db"
  ? resolve(__dirname, "../../../data/clarai.db")
  : env.DATABASE_URL;

async function main() {
  const db = await getDb(DB_PATH);
  const app = await buildApp(db, { logger: true });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`Dormero Viktoria API running on http://localhost:${env.PORT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
