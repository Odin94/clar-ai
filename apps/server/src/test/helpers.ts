/**
 * Test helpers – builds a Fastify app backed by an in-memory SQLite database.
 * Each call to `createTestApp()` returns an isolated app + db pair so tests
 * never share state.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  hotels,
  knowledgeEntries,
  calls,
  callTranscripts,
  callFeedback,
} from "@clarai/db";
import { buildApp } from "../buildApp.js";

// Re-export as named tables for use in test files
export const schema = { hotels, knowledgeEntries, calls, callTranscripts, callFeedback };

// ── DDL (mirrors packages/db/src/seed.ts) ────────────────────────────────────
const DDL = `
CREATE TABLE IF NOT EXISTS hotels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  reception_hours TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  total_rooms INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,
  hotel_id TEXT REFERENCES hotels(id),
  topic TEXT NOT NULL,
  subtopic TEXT,
  content TEXT NOT NULL,
  keywords TEXT,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ke_hotel_topic ON knowledge_entries(hotel_id, topic);
CREATE INDEX IF NOT EXISTS idx_ke_topic ON knowledge_entries(topic);
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT,
  start_time INTEGER NOT NULL,
  duration INTEGER,
  summary TEXT,
  call_successful TEXT,
  message_count INTEGER,
  cost_credits REAL,
  termination_reason TEXT,
  synced_at INTEGER,
  hotel_mentioned TEXT,
  complaint_category TEXT
);
CREATE TABLE IF NOT EXISTS call_transcripts (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id),
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  time_in_call_secs REAL,
  sort_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS call_feedback (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) UNIQUE,
  rating INTEGER,
  comment TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const TEST_API_KEY = "test-api-key-secret";

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export async function createTestApp(opts: { webhookSecret?: string; apiKey?: string } = {}) {
  // In-memory SQLite – isolated per test suite
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);

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
