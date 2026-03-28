import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { queryKnowledge } from "../services/knowledge.js";

const bodySchema = z.object({
  hotel_name: z.string().optional(),
  topic: z.string().min(1, "topic is required"),
});

export async function knowledgeRoutes(app: FastifyInstance) {
  app.post("/knowledge/query", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { hotel_name, topic } = parsed.data;
    const db = app.db;

    try {
      const answer = await queryKnowledge(db, hotel_name, topic);
      return reply.send({ answer });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to query knowledge base" });
    }
  });
}
