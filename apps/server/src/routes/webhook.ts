import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { calls, callTranscripts, callFeedback } from "@clarai/db";
import { callEventBus } from "../services/eventBus.js";

interface WebhookPayload {
  event_timestamp: number;
  type: string;
  data: {
    conversation_id: string;
    agent_id: string;
    status: string;
    transcript: Array<{
      role: string;
      message: string;
      time_in_call_secs: number;
    }>;
    metadata: {
      start_time_unix_secs: number;
      call_duration_secs: number;
      cost: { credits: number };
      termination_reason: string;
    };
    analysis: {
      call_successful: string;
      transcript_summary: string;
      data_collection_results?: {
        customer_rating?: { value: number | null };
        customer_comment?: { value: string | null };
      };
    };
  };
}

interface WebhookOptions extends FastifyPluginOptions {
  webhookSecret?: string;
}

export async function webhookRoutes(app: FastifyInstance, opts: WebhookOptions = {}) {
  // POST /api/elevenlabs/webhook
  app.post("/elevenlabs/webhook", async (request, reply) => {
    // ── HMAC signature verification ──────────────────────────────────────────
    const secret = opts.webhookSecret;
    if (secret) {
      const sigHeader = request.headers["elevenlabs-signature"] as string | undefined;
      if (!sigHeader || !verifyWebhookSignature(secret, request.rawBody ?? "", sigHeader)) {
        return reply.status(401).send({ error: "Invalid webhook signature" });
      }
    }

    // Respond immediately
    reply.status(200).send({ ok: true });

    const payload = request.body as WebhookPayload;

    if (payload?.type !== "post_call_transcription") {
      return;
    }

    const { data } = payload;
    if (!data?.conversation_id) return;

    const db = app.db;
    const now = Date.now();

    try {
      // Upsert call
      await db
        .insert(calls)
        .values({
          id: data.conversation_id,
          agentId: data.agent_id,
          status: data.status ?? "done",
          startTime: data.metadata?.start_time_unix_secs ?? 0,
          duration: data.metadata?.call_duration_secs ?? null,
          summary: data.analysis?.transcript_summary ?? null,
          callSuccessful: data.analysis?.call_successful ?? null,
          messageCount: data.transcript?.length ?? null,
          costCredits: data.metadata?.cost?.credits ?? null,
          terminationReason: data.metadata?.termination_reason ?? null,
          syncedAt: now,
        })
        .onConflictDoUpdate({
          target: calls.id,
          set: {
            status: data.status ?? "done",
            startTime: data.metadata?.start_time_unix_secs ?? 0,
            duration: data.metadata?.call_duration_secs ?? null,
            summary: data.analysis?.transcript_summary ?? null,
            callSuccessful: data.analysis?.call_successful ?? null,
            messageCount: data.transcript?.length ?? null,
            costCredits: data.metadata?.cost?.credits ?? null,
            terminationReason: data.metadata?.termination_reason ?? null,
            syncedAt: now,
          },
        });

      // Upsert transcripts (delete + re-insert strategy for webhook)
      if (data.transcript && data.transcript.length > 0) {
        const existingTranscripts = await db
          .select({ id: callTranscripts.id })
          .from(callTranscripts)
          .where(eq(callTranscripts.callId, data.conversation_id))
          .limit(1);

        if (existingTranscripts.length === 0) {
          const transcriptRows = data.transcript.map((t, i) => ({
            id: crypto.randomUUID(),
            callId: data.conversation_id,
            role: t.role,
            message: t.message,
            timeInCallSecs: t.time_in_call_secs,
            sortOrder: i,
          }));

          await db
            .insert(callTranscripts)
            .values(transcriptRows)
            .onConflictDoNothing();
        }
      }

      // Upsert feedback from data collection
      const dcr = data.analysis?.data_collection_results;
      const rating = dcr?.customer_rating?.value ?? null;
      const comment = dcr?.customer_comment?.value ?? null;

      if (rating !== null || comment !== null) {
        await db
          .insert(callFeedback)
          .values({
            id: crypto.randomUUID(),
            callId: data.conversation_id,
            rating: typeof rating === "number" ? rating : null,
            comment: comment ?? null,
            source: "voice",
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: callFeedback.callId,
            set: {
              rating: typeof rating === "number" ? rating : null,
              comment: comment ?? null,
              source: "voice",
              updatedAt: now,
            },
          });
      }
      // Emit event for SSE clients — do this after all DB writes
      callEventBus.emit("call", {
        type: "call:new",
        conversationId: data.conversation_id,
      });
    } catch (err) {
      request.log.error({ err }, "Failed to process webhook payload");
    }
  });
}

/**
 * Verify an ElevenLabs webhook signature.
 *
 * Header format: `ElevenLabs-Signature: t=<unix_ts>,v0=<hmac_sha256_hex>`
 * Signed payload: `<unix_ts>.<raw_request_body>`
 *
 * @param toleranceSecs  Max age of the timestamp before the request is rejected (default 300 s)
 */
function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string,
  toleranceSecs = 300
): boolean {
  const parts = signatureHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v0Part = parts.find((p) => p.startsWith("v0="));
  if (!tPart || !v0Part) return false;

  const timestamp = tPart.slice(2);
  const receivedSig = v0Part.slice(3);

  // Replay-attack guard: reject stale timestamps
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > toleranceSecs) return false;

  // Compute expected HMAC-SHA256
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(receivedSig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
