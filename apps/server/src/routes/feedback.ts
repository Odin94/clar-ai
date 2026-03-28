import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, isNotNull, isNull, sql } from "drizzle-orm";
import { calls, callFeedback } from "@clarai/db";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
});

export async function feedbackRoutes(app: FastifyInstance) {
  // GET /api/feedback
  app.get("/feedback", async (request, reply) => {
    const query = request.query as {
      page?: string;
      pageSize?: string;
      rating?: string;    // "1"|"2"|"3"|"4"|"5"
      hasComment?: string; // "yes"|"no"
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? "20", 10)));
    const offset = (page - 1) * pageSize;

    const db = app.db;

    try {
      const conditions: ReturnType<typeof eq>[] = [];

      if (query.rating) {
        const r = parseInt(query.rating, 10);
        if (!isNaN(r) && r >= 1 && r <= 5) {
          conditions.push(eq(callFeedback.rating, r) as ReturnType<typeof eq>);
        }
      }

      if (query.hasComment === "yes") {
        conditions.push(isNotNull(callFeedback.comment) as ReturnType<typeof eq>);
      } else if (query.hasComment === "no") {
        conditions.push(isNull(callFeedback.comment) as ReturnType<typeof eq>);
      }

      const whereClause =
        conditions.length === 0
          ? undefined
          : conditions.length === 1
          ? conditions[0]
          : (conditions.reduce((a, b) => sql`${a} AND ${b}` as unknown as ReturnType<typeof eq>));

      const rows = await db
        .select({
          id: callFeedback.id,
          callId: callFeedback.callId,
          rating: callFeedback.rating,
          comment: callFeedback.comment,
          source: callFeedback.source,
          createdAt: callFeedback.createdAt,
          updatedAt: callFeedback.updatedAt,
          callStartTime: calls.startTime,
          callHotelMentioned: calls.hotelMentioned,
          callSummary: calls.summary,
        })
        .from(callFeedback)
        .innerJoin(calls, eq(callFeedback.callId, calls.id))
        .where(whereClause)
        .orderBy(desc(callFeedback.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(callFeedback)
        .innerJoin(calls, eq(callFeedback.callId, calls.id))
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      const shaped = rows.map(({ callStartTime, callHotelMentioned, callSummary, ...fb }) => ({
        ...fb,
        call: { startTime: callStartTime, hotelMentioned: callHotelMentioned, summary: callSummary },
      }));

      return reply.send({ feedback: shaped, total, page, pageSize });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch feedback" });
    }
  });

  // POST /api/calls/:id/feedback
  app.post("/calls/:id/feedback", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = bodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { rating, comment } = parsed.data;
    const db = app.db;

    try {
      // Verify the call exists
      const callRows = await db
        .select()
        .from(calls)
        .where(eq(calls.id, id))
        .limit(1);

      if (callRows.length === 0) {
        return reply.status(404).send({ error: "Call not found" });
      }

      const now = Date.now();
      const feedbackId = crypto.randomUUID();

      await db
        .insert(callFeedback)
        .values({
          id: feedbackId,
          callId: id,
          rating: rating ?? null,
          comment: comment ?? null,
          source: "manual",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: callFeedback.callId,
          set: {
            rating: rating ?? null,
            comment: comment ?? null,
            updatedAt: now,
          },
        });

      const feedbackRows = await db
        .select()
        .from(callFeedback)
        .where(eq(callFeedback.callId, id))
        .limit(1);

      return reply.send({ feedback: feedbackRows[0] });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to save feedback" });
    }
  });
}
