import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { getDb } from "@clarai/db";
import { callsRoutes } from "./routes/calls.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { syncRoutes } from "./routes/sync.js";
import { webhookRoutes } from "./routes/webhook.js";
import { knowledgeRoutes } from "./routes/knowledge.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Awaited<ReturnType<typeof getDb>>;
  }
}

export async function buildApp(
  db: Awaited<ReturnType<typeof getDb>>,
  opts: { logger?: boolean } = {}
): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  app.decorate("db", db);

  await app.register(cors, { origin: "*" });

  await app.register(
    async (api) => {
      await api.register(callsRoutes);
      await api.register(feedbackRoutes);
      await api.register(syncRoutes);
      await api.register(webhookRoutes);
      await api.register(knowledgeRoutes);
    },
    { prefix: "/api" }
  );

  app.get("/health", async () => ({ status: "ok", timestamp: Date.now() }));

  return app;
}
