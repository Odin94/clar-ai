/**
 * Test helpers – builds a Fastify app backed by an in-memory SQLite database.
 * Each call to `createTestApp()` returns an isolated app + db pair so tests
 * never share state.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  hotels,
  hotelFacilities,
  roomTypes,
  hotelPolicies,
  calls,
  callTranscripts,
  callFeedback,
} from "@clarai/db";
import { buildApp } from "../buildApp.js";

// Re-export as named tables for use in test files (avoids the circular `schema` re-export issue)
export const schema = { hotels, hotelFacilities, roomTypes, hotelPolicies, calls, callTranscripts, callFeedback };

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
  check_in_time TEXT,
  check_out_time TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hotel_facilities (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata TEXT
);
CREATE TABLE IF NOT EXISTS room_types (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  description TEXT,
  max_occupancy INTEGER,
  price_from_eur REAL,
  amenities TEXT
);
CREATE TABLE IF NOT EXISTS hotel_policies (
  id TEXT PRIMARY KEY,
  hotel_id TEXT,
  topic TEXT NOT NULL,
  content TEXT NOT NULL
);
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

  // Use the explicit schema (not the re-exported namespace) so Drizzle can process it cleanly
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

/** Seed a hotel + facilities for knowledge tests */
export async function seedKnowledgeBase(
  db: Awaited<ReturnType<typeof import("@clarai/db").getDb>>
) {
  const hotelId = "hotel_coburg_test";
  const now = Date.now();

  await db.insert(schema.hotels).values({
    id: hotelId,
    name: "Dormero Hotel Coburg",
    slug: "coburg",
    city: "Coburg",
    checkInTime: "15:00",
    checkOutTime: "11:00",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.hotelFacilities).values([
    {
      id: "fac_parking",
      hotelId,
      category: "parking",
      name: "Underground Parking",
      description: "Secure underground parking garage available 24/7.",
      metadata: JSON.stringify({
        price_per_day_eur: 12,
        height_limit_m: 2.0,
        ev_charging: false,
      }),
    },
    {
      id: "fac_wifi",
      hotelId,
      category: "wifi",
      name: "Free WiFi",
      description: "Complimentary high-speed WiFi throughout the hotel.",
      metadata: null,
    },
    {
      id: "fac_wellness",
      hotelId,
      category: "wellness",
      name: "Spa & Fitness",
      description: "Spa, sauna, and fitness centre available to all guests.",
      metadata: null,
    },
  ]);

  await db.insert(schema.hotelPolicies).values([
    {
      id: "pol_pets",
      hotelId: null, // chain-wide
      topic: "pets",
      content: "Pets are welcome at all Dormero hotels. A fee of €15/night applies.",
    },
    {
      id: "pol_cancel",
      hotelId: null,
      topic: "cancellation",
      content: "Free cancellation up to 24 hours before arrival. Late cancellations incur one night's charge.",
    },
    {
      id: "pol_breakfast",
      hotelId: null,
      topic: "breakfast",
      content: "Breakfast buffet is available daily from 06:30 to 10:30. Price: €18 per person.",
    },
  ]);

  await db.insert(schema.roomTypes).values([
    {
      id: "room_single",
      hotelId,
      name: "Standard Single",
      description: "Cosy single room with city view.",
      maxOccupancy: 1,
      priceFromEur: 89,
      amenities: JSON.stringify(["wifi", "safe", "minibar"]),
    },
    {
      id: "room_double",
      hotelId,
      name: "Superior Double",
      description: "Spacious double room.",
      maxOccupancy: 2,
      priceFromEur: 129,
      amenities: JSON.stringify(["wifi", "safe", "minibar", "bathtub"]),
    },
  ]);

  return { hotelId };
}
