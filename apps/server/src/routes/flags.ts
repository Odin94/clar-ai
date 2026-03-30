import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SQL } from "drizzle-orm";
import { eq, desc, sql } from "drizzle-orm";
import { calls, callFlags } from "@clarai/db";

const bodySchema = z.object({
  positive: z.boolean(),
  comment: z.string().optional(),
});

export async function flagsRoutes(app: FastifyInstance) {
  // GET /api/flags
  app.get("/flags", async (request, reply) => {
    const query = request.query as {
      page?: string;
      pageSize?: string;
      positive?: string; // "true" | "false"
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? "20", 10)));
    const offset = (page - 1) * pageSize;

    const db = app.db;

    try {
      const conditions: SQL[] = [];

      if (query.positive === "true") {
        conditions.push(eq(callFlags.positive, 1));
      } else if (query.positive === "false") {
        conditions.push(eq(callFlags.positive, 0));
      }

      const whereClause = conditions.length === 0 ? undefined : conditions[0];

      const rows = await db
        .select({
          id: callFlags.id,
          callId: callFlags.callId,
          positive: callFlags.positive,
          comment: callFlags.comment,
          createdAt: callFlags.createdAt,
          updatedAt: callFlags.updatedAt,
          callStartTime: calls.startTime,
          callHotelMentioned: calls.hotelMentioned,
          callSummary: calls.summary,
        })
        .from(callFlags)
        .innerJoin(calls, eq(callFlags.callId, calls.id))
        .where(whereClause)
        .orderBy(desc(callFlags.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(callFlags)
        .innerJoin(calls, eq(callFlags.callId, calls.id))
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      const shaped = rows.map(({ callStartTime, callHotelMentioned, callSummary, ...flag }) => ({
        ...flag,
        call: { startTime: callStartTime, hotelMentioned: callHotelMentioned, summary: callSummary },
      }));

      return reply.send({ flags: shaped, total, page, pageSize });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch flags" });
    }
  });

  // POST /api/calls/:id/flag  — create or update a flag
  app.post("/calls/:id/flag", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = bodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { positive, comment } = parsed.data;
    const db = app.db;

    try {
      const callRows = await db.select().from(calls).where(eq(calls.id, id)).limit(1);
      if (callRows.length === 0) {
        return reply.status(404).send({ error: "Call not found" });
      }

      const now = Date.now();
      const flagId = crypto.randomUUID();

      await db
        .insert(callFlags)
        .values({
          id: flagId,
          callId: id,
          positive: positive ? 1 : 0,
          comment: comment ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: callFlags.callId,
          set: {
            positive: positive ? 1 : 0,
            comment: comment ?? null,
            updatedAt: now,
          },
        });

      const flagRows = await db
        .select()
        .from(callFlags)
        .where(eq(callFlags.callId, id))
        .limit(1);

      return reply.send({ flag: flagRows[0] });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to save flag" });
    }
  });

  // DELETE /api/calls/:id/flag  — remove a flag
  app.delete("/calls/:id/flag", async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = app.db;

    try {
      const flagRows = await db
        .select()
        .from(callFlags)
        .where(eq(callFlags.callId, id))
        .limit(1);

      if (flagRows.length === 0) {
        return reply.status(404).send({ error: "Flag not found" });
      }

      await db.delete(callFlags).where(eq(callFlags.callId, id));

      return reply.send({ success: true });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to delete flag" });
    }
  });
}
