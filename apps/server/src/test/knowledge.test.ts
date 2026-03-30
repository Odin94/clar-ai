/**
 * Unit tests for the knowledge query service.
 * Uses an in-memory SQLite DB seeded with one hotel.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, seedKnowledgeBase, schema } from "./helpers.js";
import { queryKnowledge } from "../services/knowledge.js";
import type { TestApp } from "./helpers.js";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
  await seedKnowledgeBase(ctx.db);
});

afterAll(() => ctx.sqlite.close());

describe("queryKnowledge – parking", () => {
  it("returns parking info for a known hotel", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "parking");
    expect(answer).toMatch(/Parkplätze/i);
    expect(answer).toMatch(/20 €/);
  });

  it("matches German parking queries", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "Wo kann ich parken?");
    expect(answer).toMatch(/Park/i);
  });
});

describe("queryKnowledge – policies", () => {
  it("returns pet policy (chain-wide)", async () => {
    const answer = await queryKnowledge(ctx.db, undefined, "Haustier");
    expect(answer).toMatch(/Haustier|gratis/i);
  });

  it("returns pet policy when hotel is specified", async () => {
    const answer = await queryKnowledge(ctx.db, "DORMERO Hotel Coburg", "Hund mitbringen");
    expect(answer).toMatch(/Haustier|gratis/i);
  });

  it("returns cancellation policy", async () => {
    const answer = await queryKnowledge(ctx.db, undefined, "Stornierung");
    expect(answer).toMatch(/stornierbar|Smart Rate/i);
  });

  it("returns breakfast info", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "Frühstück");
    expect(answer).toMatch(/19,90/);
    expect(answer).toMatch(/06:30/);
  });
});

describe("queryKnowledge – check-in / check-out", () => {
  it("returns check-in times", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "check-in");
    expect(answer).toMatch(/15:00/);
  });

  it("handles German checkout query", async () => {
    const answer = await queryKnowledge(ctx.db, "coburg", "Wann muss ich auschecken?");
    expect(answer).toMatch(/Check-out|12:00/i);
  });
});

describe("queryKnowledge – rooms", () => {
  it("lists available room types", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "Zimmer");
    expect(answer).toMatch(/Einzelzimmer|Komfort|Superior/i);
  });
});

describe("queryKnowledge – wifi / wellness", () => {
  it("returns wifi info", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "WLAN");
    expect(answer).toMatch(/WLAN|wifi/i);
  });

  it("returns wellness info", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "Sauna");
    expect(answer).toMatch(/Sauna|Wellness/i);
  });
});

describe("queryKnowledge – no-hotel scope isolation", () => {
  beforeAll(async () => {
    await ctx.db.insert(schema.knowledgeEntries).values({
      id: "ke_hotel_pet_coburg_test",
      hotelId: "hotel_coburg_test",
      topic: "hotel_pet",
      content: "Im DORMERO Hotel Coburg lebt Schildkröte Hildegard.",
      keywords: "maskott,tier,haustier",
    });
  });

  it("without hotel: returns only chain-wide pet entries, not hotel-specific", async () => {
    const answer = await queryKnowledge(ctx.db, undefined, "Haustier");
    expect(answer).not.toMatch(/Hildegard/);
    expect(answer).toMatch(/Haustier|gratis/i);
  });

  it("with hotel: includes both hotel-specific and chain-wide pet entries", async () => {
    const answer = await queryKnowledge(ctx.db, "DORMERO Hotel Coburg", "Haustier");
    expect(answer).toMatch(/Hildegard/);
    expect(answer).toMatch(/Haustier|gratis/i);
  });
});

describe("queryKnowledge – fallback", () => {
  it("returns a graceful German fallback for unknown topics", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "Hubschrauberlandeplatz");
    // Should still return something (hotel_info fallback or keyword match)
    expect(answer.length).toBeGreaterThan(0);
  });

  it("returns fallback when hotel name doesn't match", async () => {
    const answer = await queryKnowledge(ctx.db, "Nonexistent Hotel XYZ", "parking");
    expect(answer).not.toMatch(/20 €/);
    expect(answer).toMatch(/keine Informationen|Reservierung/i);
  });
});
