import type { FastifyInstance } from "fastify";
import { eq, desc, like, or, sql } from "drizzle-orm";
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

      const whereClause =
        conditions.length === 0
          ? undefined
          : conditions.length === 1
          ? conditions[0]
          : sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}`;

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
