/**
 * Knowledge Base Document Generator
 *
 * Reads hotel data from the Dormero database and generates one Markdown
 * document per hotel, suitable for ingestion into ElevenLabs Conversational AI
 * as knowledge-base text.
 *
 * Usage (CLI):
 *   npx tsx packages/db/src/generateKbDocs.ts [--upload] [--out-dir ./kb-docs]
 *
 * Options:
 *   --upload   Upload each document to ElevenLabs KB API  (needs ELEVENLABS_API_KEY)
 *   --out-dir  Directory where .md files are written      (default: ./kb-docs)
 *   --dry-run  Print docs to stdout only; do not write or upload
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { getDb } from "./index.js";
import {
  hotels,
  hotelFacilities,
  roomTypes,
  hotelPolicies,
} from "./schema.js";
import { eq, or, isNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedDoc {
  hotelId: string;
  hotelName: string;
  markdown: string;
  /** Set when the doc was successfully uploaded to ElevenLabs */
  elevenLabsDocId?: string;
}

type Db = BetterSQLite3Database<Record<string, unknown>>;

// ─── Core generator ───────────────────────────────────────────────────────────

/**
 * Generate markdown knowledge-base documents for every hotel in the database.
 */
export async function generateKbDocs(db: Db): Promise<GeneratedDoc[]> {
  const allHotels = await db.select().from(hotels);

  const docs: GeneratedDoc[] = [];

  for (const hotel of allHotels) {
    const facilities = await db
      .select()
      .from(hotelFacilities)
      .where(eq(hotelFacilities.hotelId, hotel.id));

    const rooms = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.hotelId, hotel.id));

    // Hotel-specific + chain-wide policies
    const policies = await db
      .select()
      .from(hotelPolicies)
      .where(or(eq(hotelPolicies.hotelId, hotel.id), isNull(hotelPolicies.hotelId)));

    const markdown = buildMarkdown(hotel, facilities, rooms, policies);

    docs.push({ hotelId: hotel.id, hotelName: hotel.name, markdown });
  }

  return docs;
}

// ─── Markdown builder ─────────────────────────────────────────────────────────

function buildMarkdown(
  hotel: typeof hotels.$inferSelect,
  facilities: (typeof hotelFacilities.$inferSelect)[],
  rooms: (typeof roomTypes.$inferSelect)[],
  policies: (typeof hotelPolicies.$inferSelect)[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${hotel.name}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  if (hotel.city) lines.push(`- **City**: ${hotel.city}`);
  if (hotel.address) lines.push(`- **Address**: ${hotel.address}`);
  if (hotel.phone) lines.push(`- **Phone**: ${hotel.phone}`);
  if (hotel.email) lines.push(`- **Email**: ${hotel.email}`);
  if (hotel.checkInTime) lines.push(`- **Check-in**: ${hotel.checkInTime}`);
  if (hotel.checkOutTime) lines.push(`- **Check-out**: ${hotel.checkOutTime}`);
  if (hotel.description) {
    lines.push("");
    lines.push(hotel.description);
  }
  lines.push("");

  // Facilities grouped by category
  if (facilities.length > 0) {
    lines.push("## Facilities");
    const byCategory = new Map<string, typeof facilities>();
    for (const f of facilities) {
      const bucket = byCategory.get(f.category) ?? [];
      bucket.push(f);
      byCategory.set(f.category, bucket);
    }
    for (const [category, items] of byCategory) {
      lines.push(`\n### ${capitalize(category)}`);
      for (const item of items) {
        lines.push(`- **${item.name}**: ${item.description ?? ""}`);
        if (item.metadata) {
          try {
            const meta = JSON.parse(item.metadata);
            const metaStr = Object.entries(meta)
              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
              .join(", ");
            if (metaStr) lines.push(`  (${metaStr})`);
          } catch {
            /* ignore invalid JSON */
          }
        }
      }
    }
    lines.push("");
  }

  // Room types
  if (rooms.length > 0) {
    lines.push("## Room Types");
    for (const room of rooms) {
      lines.push(`\n### ${room.name}`);
      if (room.description) lines.push(room.description);
      if (room.maxOccupancy) lines.push(`- **Max occupancy**: ${room.maxOccupancy} guests`);
      if (room.priceFromEur != null) lines.push(`- **Price from**: €${room.priceFromEur}/night`);
      if (room.amenities) {
        try {
          const amenities = JSON.parse(room.amenities) as string[];
          lines.push(`- **Amenities**: ${amenities.join(", ")}`);
        } catch {
          lines.push(`- **Amenities**: ${room.amenities}`);
        }
      }
    }
    lines.push("");
  }

  // Policies
  if (policies.length > 0) {
    lines.push("## Policies");
    for (const policy of policies) {
      lines.push(`\n### ${capitalize(policy.topic)}`);
      lines.push(policy.content);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── ElevenLabs upload ────────────────────────────────────────────────────────

/**
 * Upload a knowledge-base document to ElevenLabs.
 * Returns the ElevenLabs document ID on success.
 */
export async function uploadToElevenLabs(
  apiKey: string,
  name: string,
  text: string
): Promise<string> {
  const res = await fetch("https://api.elevenlabs.io/v1/convai/knowledge-base/text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs upload failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { id?: string; document_id?: string };
  return json.id ?? json.document_id ?? "unknown";
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const doUpload = args.includes("--upload");
  const outDirIdx = args.indexOf("--out-dir");
  const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : "./kb-docs";

  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (doUpload && !apiKey) {
    console.error("Error: ELEVENLABS_API_KEY must be set to use --upload");
    process.exit(1);
  }

  const db = await getDb();
  const docs = await generateKbDocs(db as unknown as Db);

  if (docs.length === 0) {
    console.warn("No hotels found in the database. Run `npm run seed` first.");
    return;
  }

  if (!dryRun) {
    mkdirSync(outDir, { recursive: true });
  }

  for (const doc of docs) {
    const slug = doc.hotelId.replace(/[^a-z0-9-]/gi, "-");
    const filename = `${slug}.md`;

    if (dryRun) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`FILE: ${filename}`);
      console.log("=".repeat(60));
      console.log(doc.markdown);
      continue;
    }

    // Write to disk
    const filepath = join(outDir, filename);
    writeFileSync(filepath, doc.markdown, "utf-8");
    console.log(`✓ Written: ${filepath}`);

    // Optionally upload
    if (doUpload && apiKey) {
      try {
        const docId = await uploadToElevenLabs(apiKey, doc.hotelName, doc.markdown);
        doc.elevenLabsDocId = docId;
        console.log(`  ↑ Uploaded to ElevenLabs (id: ${docId})`);
      } catch (err) {
        console.error(`  ✗ Upload failed for ${doc.hotelName}:`, (err as Error).message);
      }
    }
  }

  if (!dryRun) {
    console.log(`\nDone. ${docs.length} document(s) written to ${outDir}`);
  }
}

// Only run main when executed directly (not when imported as a module)
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile || process.argv[1]?.endsWith("generateKbDocs.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
