import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import type { getDb } from "@clarai/db";
import { callsRoutes } from "./routes/calls.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { flagsRoutes } from "./routes/flags.js";
import { syncRoutes } from "./routes/sync.js";
import { webhookRoutes } from "./routes/webhook.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { streamRoutes } from "./routes/stream.js";
import { statsRoutes } from "./routes/stats.js";
import { env } from "./env.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Awaited<ReturnType<typeof getDb>>;
  }
  interface FastifyRequest {
    rawBody?: string;
  }
}

export async function buildApp(
  db: Awaited<ReturnType<typeof getDb>>,
  opts: { logger?: boolean; webhookSecret?: string; apiKey?: string } = {}
): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  app.decorate("db", db);

  // Capture raw body for webhook HMAC verification.
  // We replace the default JSON parser with one that stashes the raw string
  // on request.rawBody before handing the parsed object to handlers.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req: FastifyRequest, body: Buffer, done) => {
      req.rawBody = body.toString("utf-8");
      try {
        done(null, JSON.parse(req.rawBody));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  await app.register(cors, { origin: "*" });

  const validApiKey = opts.apiKey ?? env.BACKEND_VALID_API_KEY;

  await app.register(
    async (api) => {
      api.addHook("onRequest", async (request, reply) => {
        const provided = request.headers["x-api-key"];
        if (!provided) {
          return reply.code(401).send({ error: "Unauthorized" });
        }
        if (!validApiKey || provided !== validApiKey) {
          return reply.code(403).send({ error: "Forbidden" });
        }
      });

      await api.register(callsRoutes);
      await api.register(feedbackRoutes);
      await api.register(flagsRoutes);
      await api.register(syncRoutes);
      await api.register(webhookRoutes, { webhookSecret: opts.webhookSecret });
      await api.register(knowledgeRoutes);
      await api.register(streamRoutes);
      await api.register(statsRoutes);
    },
    { prefix: "/api" }
  );

  app.get("/health", async () => ({ status: "ok", timestamp: Date.now() }));

  return app;
}
