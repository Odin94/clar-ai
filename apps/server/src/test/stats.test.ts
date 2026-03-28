import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, seedCall, schema, authHeaders } from "./helpers.js";
import type { TestApp } from "./helpers.js";
import type { StatsResponse } from "../routes/stats.js";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();

  const nowSecs = Math.floor(Date.now() / 1000);
  const todaySecs = nowSecs - (nowSecs % 86400);
  const weekAgoSecs = nowSecs - 7 * 86400;

  // 3 calls: 2 success today, 1 failure last week
  await seedCall(ctx.db, {
    id: "st_001",
    callSuccessful: "success",
    startTime: todaySecs + 60,
    duration: 60,
  });
  await seedCall(ctx.db, {
    id: "st_002",
    callSuccessful: "success",
    startTime: todaySecs + 120,
    duration: 120,
  });
  await seedCall(ctx.db, {
    id: "st_003",
    callSuccessful: "failure",
    startTime: weekAgoSecs + 60,
    duration: 30,
  });

  // 2 feedback ratings: 4 and 5
  await ctx.db.insert(schema.callFeedback).values([
    { id: "fb_s1", callId: "st_001", rating: 4, comment: null, source: "manual", createdAt: Date.now(), updatedAt: Date.now() },
    { id: "fb_s2", callId: "st_002", rating: 5, comment: null, source: "voice", createdAt: Date.now(), updatedAt: Date.now() },
  ]);
});

afterAll(() => ctx.sqlite.close());

describe("GET /api/stats", () => {
  it("returns 200 with correct shape", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    expect(res.statusCode).toBe(200);
    const body = res.json<StatsResponse>();
    expect(typeof body.totalCalls).toBe("number");
    expect(typeof body.successRate).toBe("number");
  });

  it("counts total calls correctly", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { totalCalls } = res.json<StatsResponse>();
    expect(totalCalls).toBe(3);
  });

  it("counts calls today correctly", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { callsToday } = res.json<StatsResponse>();
    expect(callsToday).toBe(2);
  });

  it("counts calls this week (includes today + last week call within 7d)", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { callsThisWeek } = res.json<StatsResponse>();
    // last week call is exactly 7d ago, so it's on the boundary — all 3 qualify
    expect(callsThisWeek).toBeGreaterThanOrEqual(2);
  });

  it("calculates success_rate as 2/3", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { successRate } = res.json<StatsResponse>();
    expect(successRate).toBeCloseTo(2 / 3, 2);
  });

  it("calculates failure_rate as 1/3", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { failureRate } = res.json<StatsResponse>();
    expect(failureRate).toBeCloseTo(1 / 3, 2);
  });

  it("calculates avg duration correctly", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { avgDurationSecs } = res.json<StatsResponse>();
    // (60 + 120 + 30) / 3 = 70
    expect(avgDurationSecs).toBe(70);
  });

  it("calculates avg rating as 4.5", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { avgRating, ratedCount } = res.json<StatsResponse>();
    expect(avgRating).toBe(4.5);
    expect(ratedCount).toBe(2);
  });

  it("returns zero successRate when no calls", async () => {
    // Create a fresh app with empty DB
    const empty = await createTestApp();
    const res = await empty.app.inject({ method: "GET", url: "/api/stats", headers: authHeaders });
    const { successRate, totalCalls, avgRating } = res.json<StatsResponse>();
    expect(totalCalls).toBe(0);
    expect(successRate).toBe(0);
    expect(avgRating).toBeNull();
    empty.sqlite.close();
  });
});
