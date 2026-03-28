/**
 * Unit tests for the knowledge query service.
 * Uses an in-memory SQLite DB seeded with one hotel.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, seedKnowledgeBase } from "./helpers.js";
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
    expect(answer).toMatch(/parking/i);
    expect(answer).toMatch(/12/); // price
  });

  it("includes height limit when present", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "parking");
    // Parking metadata is consolidated: "Parking: €12/day, max height 2 m, no EV charging."
    expect(answer).toMatch(/max height/i);
    expect(answer).toMatch(/2/);
  });

  it("mentions EV charging status", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "garage");
    // Compacted into one metadata sentence
    expect(answer).toMatch(/EV charging|no EV/i);
  });
});

describe("queryKnowledge – policies", () => {
  it("returns pet policy (chain-wide)", async () => {
    const answer = await queryKnowledge(ctx.db, undefined, "pets");
    expect(answer).toMatch(/pet/i);
    expect(answer).toMatch(/€15/);
  });

  it("returns pet policy when hotel is specified", async () => {
    const answer = await queryKnowledge(ctx.db, "Dormero Hotel Coburg", "dog");
    expect(answer).toMatch(/pet/i);
  });

  it("returns cancellation policy", async () => {
    const answer = await queryKnowledge(ctx.db, undefined, "cancellation");
    expect(answer).toMatch(/cancel/i);
    expect(answer).toMatch(/24 hours/i);
  });

  it("returns breakfast policy", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "breakfast");
    expect(answer).toMatch(/breakfast/i);
    expect(answer).toMatch(/06:30/);
  });
});

describe("queryKnowledge – check-in / check-out", () => {
  it("returns times from the hotel row", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "check-in");
    expect(answer).toMatch(/15:00/);
    expect(answer).toMatch(/11:00/);
  });

  it("handles 'checkout' variant", async () => {
    const answer = await queryKnowledge(ctx.db, "coburg", "checkout");
    expect(answer).toMatch(/check-out|checkout/i);
  });
});

describe("queryKnowledge – rooms", () => {
  it("lists available room types", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "rooms");
    expect(answer).toMatch(/Standard Single/);
    expect(answer).toMatch(/Superior Double/);
    expect(answer).toMatch(/€89/);
  });

  it("matches 'suite' topic too", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "suite");
    // Should return room list even though there's no suite — it queries roomTypes
    expect(answer).toMatch(/room/i);
  });
});

describe("queryKnowledge – wifi / wellness", () => {
  it("returns wifi info", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "wifi");
    expect(answer).toMatch(/wifi/i);
  });

  it("returns wellness info", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "spa");
    expect(answer).toMatch(/spa|wellness/i);
  });
});

describe("queryKnowledge – fallback", () => {
  it("returns a graceful fallback for unknown topics", async () => {
    const answer = await queryKnowledge(ctx.db, "Coburg", "helicopter landing pad");
    expect(answer).toMatch(/don't have specific information|contact/i);
  });

  it("returns fallback when hotel name doesn't match — never leaks another hotel's data", async () => {
    const answer = await queryKnowledge(ctx.db, "Nonexistent Hotel XYZ", "parking");
    // Must not return Coburg's parking data
    expect(answer).not.toMatch(/€12/);
    expect(answer).not.toMatch(/underground/i);
    expect(answer).toMatch(/don't have information|contact/i);
  });

  it("does not return Coburg data when asking about an unknown hotel", async () => {
    const answer = await queryKnowledge(ctx.db, "Kudamm Berlin", "parking");
    expect(answer).not.toMatch(/€12/);
    expect(answer).not.toMatch(/underground/i);
    expect(answer).toMatch(/don't have information|contact/i);
  });
});
