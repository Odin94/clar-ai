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
    expect(docs[0].hotelName).toBe("Dormero Hotel Coburg");
  });

  it("generated markdown contains hotel name as heading", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("# Dormero Hotel Coburg");
  });

  it("generated markdown contains check-in and check-out times", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("15:00");
    expect(markdown).toContain("11:00");
  });

  it("generated markdown contains facilities section", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("## Facilities");
    expect(markdown).toContain("Underground Parking");
    expect(markdown).toContain("Free WiFi");
  });

  it("generated markdown contains room types with prices", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("## Room Types");
    expect(markdown).toContain("Standard Single");
    expect(markdown).toContain("€89");
  });

  it("generated markdown contains policies section", async () => {
    const docs = await generateKbDocs(ctx.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    const { markdown } = docs[0];
    expect(markdown).toContain("## Policies");
    expect(markdown).toContain("cancellation");
    expect(markdown).toContain("Free cancellation");
  });

  it("returns empty array when no hotels exist", async () => {
    // Use a fresh app with empty DB
    const empty = await createTestApp();
    const docs = await generateKbDocs(empty.db as unknown as BetterSQLite3Database<Record<string, unknown>>);
    expect(docs).toHaveLength(0);
    empty.sqlite.close();
  });
});
