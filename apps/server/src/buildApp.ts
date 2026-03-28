import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import type { getDb } from "@clarai/db";
import { callsRoutes } from "./routes/calls.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { syncRoutes } from "./routes/sync.js";
import { webhookRoutes } from "./routes/webhook.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { streamRoutes } from "./routes/stream.js";
import { statsRoutes } from "./routes/stats.js";

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
  opts: { logger?: boolean; webhookSecret?: string } = {}
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

  await app.register(
    async (api) => {
      await api.register(callsRoutes);
      await api.register(feedbackRoutes);
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
