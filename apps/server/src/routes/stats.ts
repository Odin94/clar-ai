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

export interface DailyStatPoint {
  date: string;        // "YYYY-MM-DD"
  calls: number;
  successRate: number; // 0–1
  avgRating: number | null;
  avgDurationSecs: number | null;
  ratedCount: number;       // calls that received any star rating
  commentCount: number;     // calls that received a rating + written comment
}

export async function statsRoutes(app: FastifyInstance) {
  // GET /stats/trends — 7-day daily breakdown
  app.get("/stats/trends", async (request, reply) => {
    const db = app.db;
    const nowSecs = Math.floor(Date.now() / 1000);

    try {
      const points: DailyStatPoint[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayStart = nowSecs - (nowSecs % 86400) - i * 86400;
        const dayEnd = dayStart + 86400;
        const dateStr = new Date(dayStart * 1000).toISOString().slice(0, 10);

        const [callStats] = await db
          .select({
            total:        sql<number>`count(*)`,
            successCount: sql<number>`sum(case when ${calls.callSuccessful} = 'success' then 1 else 0 end)`,
            avgDuration:  sql<number | null>`avg(${calls.duration})`,
          })
          .from(calls)
          .where(sql`${calls.startTime} >= ${dayStart} AND ${calls.startTime} < ${dayEnd}`);

        const [feedbackStats] = await db
          .select({
            avgRating:    sql<number | null>`avg(${callFeedback.rating})`,
            ratedCount:   sql<number>`sum(case when ${callFeedback.rating} is not null then 1 else 0 end)`,
            commentCount: sql<number>`sum(case when ${callFeedback.rating} is not null and ${callFeedback.comment} is not null then 1 else 0 end)`,
          })
          .from(callFeedback)
          .innerJoin(calls, sql`${callFeedback.callId} = ${calls.id}`)
          .where(sql`${calls.startTime} >= ${dayStart} AND ${calls.startTime} < ${dayEnd}`);

        const total = callStats.total ?? 0;
        points.push({
          date: dateStr,
          calls: total,
          successRate: total > 0 ? (callStats.successCount ?? 0) / total : 0,
          avgRating: feedbackStats.avgRating != null
            ? Math.round(feedbackStats.avgRating * 10) / 10
            : null,
          avgDurationSecs: callStats.avgDuration != null
            ? Math.round(callStats.avgDuration)
            : null,
          ratedCount:   feedbackStats.ratedCount   ?? 0,
          commentCount: feedbackStats.commentCount ?? 0,
        });
      }

      return reply.send({ trends: points });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch trends" });
    }
  });

  app.get("/stats", async (request, reply) => {
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
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch stats" });
    }
  });
}
