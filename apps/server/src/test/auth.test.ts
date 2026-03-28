/**
 * Tests for API key authentication on all /api endpoints.
 * Verifies 401 when missing, 403 when invalid or unconfigured, and 200 when valid.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, seedCall, authHeaders } from "./helpers.js";
import type { TestApp } from "./helpers.js";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
  await seedCall(ctx.db, { id: "auth_test_call" });
});

afterAll(() => ctx.sqlite.close());

const endpoints = [
  { method: "GET" as const, url: "/api/calls" },
  { method: "GET" as const, url: "/api/calls/auth_test_call" },
  { method: "GET" as const, url: "/api/stats" },
  { method: "GET" as const, url: "/api/calls/stream" },
  { method: "POST" as const, url: "/api/calls/auth_test_call/feedback", payload: { rating: 3 } },
  { method: "POST" as const, url: "/api/agent-api/v1/callLogEntry", payload: { type: "ping", data: {} } },
  { method: "POST" as const, url: "/api/sync" },
  { method: "POST" as const, url: "/api/knowledge/query", payload: { topic: "pets" } },
];

describe("API key authentication", () => {
  describe("returns 401 Unauthorized when x-api-key header is missing", () => {
    for (const { method, url, payload } of endpoints) {
      it(`${method} ${url}`, async () => {
        const res = await ctx.app.inject({ method, url, payload });
        expect(res.statusCode).toBe(401);
        expect(res.json<{ error: string }>().error).toBe("Unauthorized");
      });
    }
  });

  describe("returns 403 Forbidden when x-api-key header is invalid", () => {
    for (const { method, url, payload } of endpoints) {
      it(`${method} ${url}`, async () => {
        const res = await ctx.app.inject({
          method,
          url,
          payload,
          headers: { "x-api-key": "wrong-key" },
        });
        expect(res.statusCode).toBe(403);
        expect(res.json<{ error: string }>().error).toBe("Forbidden");
      });
    }
  });

  describe("allows requests with a valid x-api-key", () => {
    it("GET /api/calls succeeds with valid key", async () => {
      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/calls",
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(200);
    });

    it("GET /api/stats succeeds with valid key", async () => {
      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/stats",
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(200);
    });
  });

  it("does NOT require API key for /health", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe("ok");
  });

  describe("rejects all requests when no BACKEND_VALID_API_KEY is configured", () => {
    let noKeyCtx: TestApp;

    beforeAll(async () => {
      // Create an app with no API key configured at all
      noKeyCtx = await createTestApp({ apiKey: "" });
      await seedCall(noKeyCtx.db, { id: "no_key_call" });
    });

    afterAll(() => noKeyCtx.sqlite.close());

    for (const { method, url, payload } of endpoints) {
      it(`${method} ${url} → 403 even with a key in the header`, async () => {
        const res = await noKeyCtx.app.inject({
          method,
          url,
          payload,
          headers: { "x-api-key": "any-key-at-all" },
        });
        expect(res.statusCode).toBe(403);
        expect(res.json<{ error: string }>().error).toBe("Forbidden");
      });
    }

    it("GET /api/calls → 401 when header is also missing", async () => {
      const res = await noKeyCtx.app.inject({ method: "GET", url: "/api/calls" });
      expect(res.statusCode).toBe(401);
    });
  });
});
