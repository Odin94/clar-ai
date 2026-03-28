/**
 * GET /api/calls/stream  — Server-Sent Events endpoint.
 *
 * Clients connect once and receive push notifications whenever a call
 * is created or updated via the ElevenLabs post-call webhook.
 * The frontend uses this to invalidate its React Query cache without polling.
 *
 * SSE message format:
 *   data: {"type":"call:new","conversationId":"conv_abc123"}\n\n
 */
import type { FastifyInstance } from "fastify";
import { callEventBus, type CallEvent } from "../services/eventBus.js";

export async function streamRoutes(app: FastifyInstance) {
  app.get("/calls/stream", async (request, reply) => {
    const raw = reply.raw;

    // SSE headers
    raw.setHeader("Content-Type", "text/event-stream");
    raw.setHeader("Cache-Control", "no-cache, no-transform");
    raw.setHeader("Connection", "keep-alive");
    raw.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
    raw.flushHeaders();

    // Send an initial "connected" heartbeat so the client knows the stream is live
    raw.write("event: connected\ndata: {}\n\n");

    // Periodic keepalive to prevent proxies from closing idle connections (every 25 s)
    const keepalive = setInterval(() => {
      if (!raw.destroyed) raw.write(": keepalive\n\n");
    }, 25_000);

    const onCall = (payload: CallEvent) => {
      if (!raw.destroyed) {
        raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    callEventBus.on("call", onCall);

    // Clean up when the client disconnects
    request.raw.on("close", () => {
      clearInterval(keepalive);
      callEventBus.off("call", onCall);
    });

    // Keep the handler alive — Fastify shouldn't close the response
    await new Promise<void>((resolve) => {
      request.raw.on("close", resolve);
    });
  });
}
