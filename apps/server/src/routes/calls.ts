import type { FastifyInstance } from "fastify";
import { eq, desc, like, or, sql, gte, lte, and } from "drizzle-orm";
import { calls, callTranscripts, callFeedback } from "@clarai/db";

export async function callsRoutes(app: FastifyInstance) {
  // GET /api/calls
  app.get("/calls", async (request, reply) => {
    const query = request.query as {
      page?: string;
      pageSize?: string;
      status?: string;
      rating?: string;
      search?: string;
      from?: string;  // ISO date string or Unix seconds
      to?: string;    // ISO date string or Unix seconds
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? "20", 10)));
    const offset = (page - 1) * pageSize;

    const db = app.db;

    try {
      // Build where conditions
      const conditions: ReturnType<typeof eq>[] = [];

      if (query.status) {
        conditions.push(eq(calls.callSuccessful, query.status));
      }

      if (query.search) {
        const pattern = `%${query.search}%`;
        conditions.push(
          or(
            like(calls.id, pattern),
            like(calls.summary, pattern)
          ) as ReturnType<typeof eq>
        );
      }

      // Date range — accept ISO strings (YYYY-MM-DD) or raw Unix seconds
      if (query.from) {
        const fromSecs = parseTimestamp(query.from);
        if (fromSecs !== null) conditions.push(gte(calls.startTime, fromSecs) as ReturnType<typeof eq>);
      }
      if (query.to) {
        const toSecs = parseTimestamp(query.to, true);
        if (toSecs !== null) conditions.push(lte(calls.startTime, toSecs) as ReturnType<typeof eq>);
      }

      const whereClause =
        conditions.length === 0
          ? undefined
          : conditions.length === 1
          ? conditions[0]
          : and(...conditions) as ReturnType<typeof eq>;

      // Query calls with feedback join
      const rows = await db
        .select({
          id: calls.id,
          agentId: calls.agentId,
          status: calls.status,
          startTime: calls.startTime,
          duration: calls.duration,
          summary: calls.summary,
          callSuccessful: calls.callSuccessful,
          messageCount: calls.messageCount,
          costCredits: calls.costCredits,
          terminationReason: calls.terminationReason,
          syncedAt: calls.syncedAt,
          rating: callFeedback.rating,
        })
        .from(calls)
        .leftJoin(callFeedback, eq(calls.id, callFeedback.callId))
        .where(whereClause)
        .orderBy(desc(calls.startTime))
        .limit(pageSize)
        .offset(offset);

      // Filter by rating after join if requested
      const filtered = query.rating
        ? rows.filter((r) => r.rating === parseInt(query.rating!, 10))
        : rows;

      // Count total
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(calls)
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      return reply.send({ calls: filtered, total, page, pageSize });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch calls" });
    }
  });

  // GET /api/calls/:id
  app.get("/calls/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = app.db;

    try {
      const callRows = await db
        .select()
        .from(calls)
        .where(eq(calls.id, id))
        .limit(1);

      if (callRows.length === 0) {
        return reply.status(404).send({ error: "Call not found" });
      }

      const transcript = await db
        .select()
        .from(callTranscripts)
        .where(eq(callTranscripts.callId, id))
        .orderBy(callTranscripts.sortOrder);

      const feedbackRows = await db
        .select()
        .from(callFeedback)
        .where(eq(callFeedback.callId, id))
        .limit(1);

      return reply.send({
        call: callRows[0],
        transcript,
        feedback: feedbackRows[0] ?? null,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch call" });
    }
  });
}

/**
 * Parse a timestamp string into Unix seconds.
 * Accepts:
 *  - ISO date string: "YYYY-MM-DD"  → start of day (00:00:00 UTC)
 *  - Raw numeric string: treated as Unix seconds
 * @param endOfDay  If true and the value is a date string, returns end-of-day (23:59:59 UTC)
 */
function parseTimestamp(value: string, endOfDay = false): number | null {
  const trimmed = value.trim();
  // ISO date pattern YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const ms = Date.parse(trimmed + "T00:00:00Z");
    if (isNaN(ms)) return null;
    const secs = Math.floor(ms / 1000);
    return endOfDay ? secs + 86399 : secs;
  }
  // Raw numeric (Unix seconds)
  const n = Number(trimmed);
  if (!isNaN(n) && trimmed !== "") return Math.floor(n);
  return null;
}
