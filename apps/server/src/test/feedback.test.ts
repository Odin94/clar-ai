/**
 * Tests for POST /api/calls/:id/feedback
 * Covers create, update (upsert), validation, and 404 for missing calls.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, seedCall, authHeaders } from "./helpers.js";
import type { TestApp } from "./helpers.js";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
  await seedCall(ctx.db, { id: "call_fb_test" });
});

afterAll(() => ctx.sqlite.close());

describe("POST /api/calls/:id/feedback", () => {
  it("creates new feedback with rating and comment", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/calls/call_fb_test/feedback",
      headers: authHeaders,
      payload: { rating: 5, comment: "Excellent service!" },
    });
    expect(res.statusCode).toBe(200);

    const { feedback } = res.json<{
      feedback: { rating: number; comment: string; source: string; callId: string };
    }>();
    expect(feedback.rating).toBe(5);
    expect(feedback.comment).toBe("Excellent service!");
    expect(feedback.source).toBe("manual");
    expect(feedback.callId).toBe("call_fb_test");
  });

  it("upserts (updates) existing feedback on second call", async () => {
    // First submission already created it above – now update
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/calls/call_fb_test/feedback",
      headers: authHeaders,
      payload: { rating: 3, comment: "It was okay." },
    });
    expect(res.statusCode).toBe(200);

    const { feedback } = res.json<{ feedback: { rating: number; comment: string } }>();
    expect(feedback.rating).toBe(3);
    expect(feedback.comment).toBe("It was okay.");
  });

  it("accepts only a comment with no rating", async () => {
    await seedCall(ctx.db, { id: "call_comment_only" });

    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/calls/call_comment_only/feedback",
      headers: authHeaders,
      payload: { comment: "Good follow-up needed." },
    });
    expect(res.statusCode).toBe(200);

    const { feedback } = res.json<{ feedback: { rating: number | null; comment: string } }>();
    expect(feedback.rating).toBeNull();
    expect(feedback.comment).toBe("Good follow-up needed.");
  });

  it("accepts only a rating with no comment", async () => {
    await seedCall(ctx.db, { id: "call_rating_only" });

    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/calls/call_rating_only/feedback",
      headers: authHeaders,
      payload: { rating: 4 },
    });
    expect(res.statusCode).toBe(200);

    const { feedback } = res.json<{ feedback: { rating: number; comment: string | null } }>();
    expect(feedback.rating).toBe(4);
    expect(feedback.comment).toBeNull();
  });

  it("rejects rating below 1", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/calls/call_fb_test/feedback",
      headers: authHeaders,
      payload: { rating: 0 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects rating above 5", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/calls/call_fb_test/feedback",
      headers: authHeaders,
      payload: { rating: 6 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for a non-existent call", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/calls/nonexistent_call_xyz/feedback",
      headers: authHeaders,
      payload: { rating: 3 },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toMatch(/not found/i);
  });
});
