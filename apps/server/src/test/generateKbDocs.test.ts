/**
 * Tests for the knowledge-base document generator.
 * Uses the in-memory test DB and the seedKnowledgeBase helper.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { createTestApp, seedKnowledgeBase } from "./helpers.js";
import type { TestApp } from "./helpers.js";
import { generateKbDocs } from "@clarai/db/generateKbDocs";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
  await seedKnowledgeBase(ctx.db);
});

afterAll(() => ctx.sqlite.close());

describe("generateKbDocs", () => {
  it("returns one document per hotel", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    expect(docs).toHaveLength(1);
    expect(docs[0].hotelName).toBe("DORMERO Hotel Coburg");
  });

  it("generated markdown contains hotel name as heading", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("# DORMERO Hotel Coburg");
  });

  it("generated markdown contains check-in and check-out times", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("15:00");
    expect(markdown).toContain("12:00");
  });

  it("generated markdown contains knowledge sections in German", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    // Parking section
    expect(markdown).toContain("## Parken");
    expect(markdown).toContain("Parkplätze");
    // Rooms section
    expect(markdown).toContain("## Zimmer");
    expect(markdown).toContain("Einzelzimmer");
  });

  it("generated markdown contains chain-wide policies", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("## Stornierung");
    expect(markdown).toContain("stornierbar");
  });

  it("returns empty array when no hotels exist", async () => {
    const empty = await createTestApp();
    const docs = await generateKbDocs(empty.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    expect(docs).toHaveLength(0);
    empty.sqlite.close();
  });
});
