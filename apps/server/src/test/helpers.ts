/**
 * Test helpers – builds a Fastify app backed by an in-memory SQLite database.
 * Each call to `createTestApp()` returns an isolated app + db pair so tests
 * never share state.
 */
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  hotels,
  knowledgeEntries,
  calls,
  callTranscripts,
  callFeedback,
  callFlags,
} from "@clarai/db";
import { buildApp } from "../buildApp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "../../../../packages/db/migrations");

// Re-export as named tables for use in test files
export const schema = { hotels, knowledgeEntries, calls, callTranscripts, callFeedback, callFlags };

export const TEST_API_KEY = "test-api-key-secret";

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export async function createTestApp(opts: { webhookSecret?: string; apiKey?: string } = {}) {
  // In-memory SQLite – isolated per test suite
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  // Apply all migrations so the schema is always up to date
  const migrationDb = drizzle(sqlite);
  migrate(migrationDb, { migrationsFolder });

  const db = drizzle(sqlite, { schema }) as Awaited<
    ReturnType<typeof import("@clarai/db").getDb>
  >;

  const app = await buildApp(db, {
    webhookSecret: opts.webhookSecret,
    apiKey: opts.apiKey ?? TEST_API_KEY,
  });
  await app.ready();

  return { app, db, sqlite };
}

/** Default headers with API key authentication for test requests */
export const authHeaders = { "x-api-key": TEST_API_KEY } as const;

/** Seed a minimal call row for use in route tests */
export function seedCall(
  db: Awaited<ReturnType<typeof import("@clarai/db").getDb>>,
  overrides: Partial<typeof schema.calls.$inferInsert> = {}
) {
  return db.insert(schema.calls).values({
    id: "conv_test_001",
    agentId: "agent_abc",
    status: "done",
    startTime: Math.floor(Date.now() / 1000),
    duration: 120,
    summary: "Customer asked about parking at Coburg hotel.",
    callSuccessful: "success",
    messageCount: 6,
    ...overrides,
  });
}

/** Seed a hotel + knowledge entries for knowledge tests */
export async function seedKnowledgeBase(
  db: Awaited<ReturnType<typeof import("@clarai/db").getDb>>
) {
  const hotelId = "hotel_coburg_test";
  const now = Date.now();

  await db.insert(schema.hotels).values({
    id: hotelId,
    name: "DORMERO Hotel Coburg",
    slug: "coburg",
    city: "Coburg",
    checkInTime: "15:00",
    checkOutTime: "12:00",
    receptionHours: "13:00–23:00 Uhr",
    totalRooms: 68,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.knowledgeEntries).values([
    // Hotel-specific entries
    {
      id: "ke_parking",
      hotelId,
      topic: "parking",
      content: "Das DORMERO Hotel Coburg bietet 8 Parkplätze hinter dem Haus. Das Parkticket kostet 20 € am Tag. Eine Reservierung ist nicht möglich.",
      keywords: "parken,parkplatz,auto",
    },
    {
      id: "ke_rooms",
      hotelId,
      topic: "rooms",
      content: "Das DORMERO Hotel Coburg bietet folgende Zimmerkategorien: Einzelzimmer (18 m²), Komfort Zimmer (22 m²), Superior Zimmer (25 m²), Deluxe Zimmer (25 m²). Alle mit kostenfreiem WLAN, Flatscreen TV und Minibar.",
      keywords: "zimmer,room,übernachtung",
      subtopic: "overview",
    },
    {
      id: "ke_wellness",
      hotelId,
      topic: "wellness",
      content: "Der Wellnessbereich umfasst ca. 300 m²: Finnische Sauna, Bio Sauna, Dampfbad, Massagen und Fitness.",
      keywords: "wellness,spa,sauna,fitness",
    },
    {
      id: "ke_wifi",
      hotelId,
      topic: "wifi",
      content: "Kostenfreies WLAN im gesamten Hotel verfügbar.",
      keywords: "wlan,wifi,internet",
    },
    {
      id: "ke_breakfast_hotel",
      hotelId,
      topic: "breakfast",
      content: "Frühstück im DORMERO Hotel Coburg: 19,90 € pro Person, täglich von 06:30 bis 10:30 Uhr.",
      keywords: "frühstück,breakfast,morgens",
    },
    // Chain-wide entries
    {
      id: "ke_pets_chain",
      hotelId: null,
      topic: "pets",
      content: "Bei DORMERO checkt Ihr Haustier gratis mit ein. Geben Sie diese Information bei der Reservierung an.",
      keywords: "haustier,hund,katze,tier",
    },
    {
      id: "ke_cancel_chain",
      hotelId: null,
      topic: "cancellation",
      content: "Die Fancy Saver Rate ist nicht stornierbar. Die Smart Rate ist flexibel stornierbar bis 24 Stunden vor Anreise.",
      keywords: "stornierung,stornieren,absagen",
    },
    {
      id: "ke_checkin_chain",
      hotelId: null,
      topic: "checkin",
      content: "Check-in ab 15:00 Uhr bis 23:00 Uhr. Check-out bis 12:00 Uhr. Late Check-out bis 14:00 Uhr sonntags und an Feiertagen.",
      keywords: "check-in,check-out,einchecken,auschecken",
    },
  ]);

  return { hotelId };
}
