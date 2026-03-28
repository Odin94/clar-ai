import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { calls, callFeedback } from "@clarai/db";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
});

export async function feedbackRoutes(app: FastifyInstance) {
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
