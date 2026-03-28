import type { FastifyInstance } from "fastify";
import { eq, isNull } from "drizzle-orm";
import { calls, callTranscripts } from "@clarai/db";
import { elevenLabsClient } from "../services/elevenlabs.js";
import { env } from "../env.js";

export async function syncRoutes(app: FastifyInstance) {
  // POST /api/sync
  app.post("/sync", async (request, reply) => {
    const agentId = env.ELEVENLABS_AGENT_ID;
    if (!agentId) {
      return reply
        .status(400)
        .send({ error: "ELEVENLABS_AGENT_ID is not configured" });
    }

    const db = app.db;
    let synced = 0;

    try {
      const conversations = await elevenLabsClient.listConversations(agentId);

      for (const conv of conversations) {
        const now = Date.now();

        // Upsert call
        await db
          .insert(calls)
          .values({
            id: conv.conversation_id,
            agentId: conv.agent_id,
            status: conv.status,
            startTime: conv.start_time_unix_secs,
            duration: conv.call_duration_secs,
            summary: conv.transcript_summary ?? null,
            callSuccessful: conv.call_successful,
            messageCount: conv.message_count,
            costCredits: null,
            terminationReason: conv.termination_reason ?? null,
            syncedAt: now,
          })
          .onConflictDoUpdate({
            target: calls.id,
            set: {
              status: conv.status,
              duration: conv.call_duration_secs,
              summary: conv.transcript_summary ?? null,
              callSuccessful: conv.call_successful,
              messageCount: conv.message_count,
              terminationReason: conv.termination_reason ?? null,
              syncedAt: now,
            },
          });

        // Check if we already have transcripts for this call
        const existingTranscripts = await db
          .select({ id: callTranscripts.id })
          .from(callTranscripts)
          .where(eq(callTranscripts.callId, conv.conversation_id))
          .limit(1);

        if (existingTranscripts.length === 0) {
          // Fetch detailed conversation with transcript
          try {
            const detail = await elevenLabsClient.getConversation(
              conv.conversation_id
            );

            // Update cost if available
            if (detail.cost?.credits != null) {
              await db
                .update(calls)
                .set({ costCredits: detail.cost.credits })
                .where(eq(calls.id, conv.conversation_id));
            }

            // Insert transcripts
            if (detail.transcript && detail.transcript.length > 0) {
              const transcriptRows = detail.transcript.map((t, i) => ({
                id: crypto.randomUUID(),
                callId: conv.conversation_id,
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
          } catch (detailErr) {
            request.log.warn(
              `Failed to fetch details for conversation ${conv.conversation_id}: ${detailErr}`
            );
          }
        }

        synced++;
      }

      return reply.send({
        synced,
        message: `Successfully synced ${synced} conversation(s)`,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Sync failed", details: String(err) });
    }
  });
}
