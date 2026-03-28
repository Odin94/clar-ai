/**
 * GET /api/stats
 *
 * Returns aggregate metrics for the Control Center dashboard header:
 *   - total_calls, calls_today, calls_this_week
 *   - avg_rating, rated_count
 *   - success_rate (0-1), failure_rate (0-1)
 *   - avg_duration_secs
 */
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { calls, callFeedback } from "@clarai/db";

export interface StatsResponse {
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  successRate: number;       // 0–1
  failureRate: number;       // 0–1
  avgDurationSecs: number | null;
  avgRating: number | null;  // 1–5
  ratedCount: number;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get("/stats", async (_request, reply) => {
    const db = app.db;

    const nowSecs = Math.floor(Date.now() / 1000);
    const startOfTodaySecs = nowSecs - (nowSecs % 86400);            // midnight UTC
    const startOfWeekSecs  = nowSecs - 7 * 86400;

    try {
      // Single aggregation query over calls
      const [callStats] = await db
        .select({
          totalCalls:      sql<number>`count(*)`,
          callsToday:      sql<number>`sum(case when ${calls.startTime} >= ${startOfTodaySecs} then 1 else 0 end)`,
          callsThisWeek:   sql<number>`sum(case when ${calls.startTime} >= ${startOfWeekSecs} then 1 else 0 end)`,
          successCount:    sql<number>`sum(case when ${calls.callSuccessful} = 'success' then 1 else 0 end)`,
          failureCount:    sql<number>`sum(case when ${calls.callSuccessful} = 'failure' then 1 else 0 end)`,
          avgDurationSecs: sql<number | null>`avg(${calls.duration})`,
        })
        .from(calls);

      // Feedback aggregation
      const [feedbackStats] = await db
        .select({
          avgRating:  sql<number | null>`avg(${callFeedback.rating})`,
          ratedCount: sql<number>`count(${callFeedback.rating})`,
        })
        .from(callFeedback);

      const total = callStats.totalCalls ?? 0;

      const response: StatsResponse = {
        totalCalls:      total,
        callsToday:      callStats.callsToday    ?? 0,
        callsThisWeek:   callStats.callsThisWeek ?? 0,
        successRate:     total > 0 ? (callStats.successCount ?? 0) / total : 0,
        failureRate:     total > 0 ? (callStats.failureCount ?? 0) / total : 0,
        avgDurationSecs: callStats.avgDurationSecs != null
          ? Math.round(callStats.avgDurationSecs)
          : null,
        avgRating:  feedbackStats.avgRating != null
          ? Math.round(feedbackStats.avgRating * 10) / 10   // 1 decimal place
          : null,
        ratedCount: feedbackStats.ratedCount ?? 0,
      };

      return reply.send(response);
    } catch (err) {
      _request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch stats" });
    }
  });
}
