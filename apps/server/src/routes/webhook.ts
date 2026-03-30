import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import { createHmac, timingSafeEqual } from "crypto"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { calls, callTranscripts, callFeedback } from "@clarai/db"
import { callEventBus } from "../services/eventBus.js"

const DataCollectionValueSchema = z.object({ value: z.union([z.string(), z.number(), z.null()]).nullable().optional() })

const WebhookPayloadSchema = z.object({
    type: z.string(),
    data: z.object({
        conversation_id: z.string(),
        agent_id: z.string(),
        status: z.string().optional(),
        transcript: z
            .array(
                z.object({
                    role: z.string(),
                    message: z.string(),
                    time_in_call_secs: z.number(),
                })
            )
            .optional()
            .default([]),
        metadata: z
            .object({
                call_duration_secs: z.number().nullable().optional(),
                cost: z.object({ credits: z.number().nullable().optional() }).optional(),
                termination_reason: z.string().optional(),
            })
            .optional(),
        analysis: z
            .object({
                call_successful: z.string().optional(),
                transcript_summary: z.string().optional(),
                data_collection_results: z
                    .object({
                        customer_rating: DataCollectionValueSchema.optional(),
                        customer_comment: DataCollectionValueSchema.optional(),
                        hotel_mentioned: DataCollectionValueSchema.optional(),
                        complaint_category: DataCollectionValueSchema.optional(),
                    })
                    .optional(),
            })
            .optional(),
    }),
})

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

interface WebhookOptions extends FastifyPluginOptions {
    webhookSecret?: string
}

export async function webhookRoutes(app: FastifyInstance, opts: WebhookOptions = {}) {
    // POST /api/webhook/callLogEntry
    app.post("/webhook/callLogEntry", async (request, reply) => {
        // ── HMAC signature verification ──────────────────────────────────────────
        const secret = opts.webhookSecret
        if (secret) {
            const sigHeader = request.headers["elevenlabs-signature"] as string | undefined
            if (!sigHeader || !verifyWebhookSignature(secret, request.rawBody ?? "", sigHeader)) {
                return reply.status(401).send({ error: "Invalid webhook signature" })
            }
        }

        const parsed = WebhookPayloadSchema.safeParse(request.body)
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload", issues: parsed.error.issues })
        }

        const payload: WebhookPayload = parsed.data

        if (payload.type !== "post_call_transcription") {
            return reply.status(400).send({ error: `Unsupported event type: ${payload.type}` })
        }

        const { data } = payload

        const db = app.db
        const now = Date.now()
        const nowSecs = Math.floor(now / 1000)
        // Don't trust LLM-provided timestamps — the model has no real clock and will hallucinate dates.
        // Back-calculate start time from server receipt time minus reported call duration.
        // We could probably configure elevenlabs to send a non-llm-generated timestamp
        const startTimeSecs = nowSecs - (data.metadata?.call_duration_secs ?? 0)
        const dcr = data.analysis?.data_collection_results
        const hotelMentioned = (dcr?.hotel_mentioned?.value as string | null) ?? null
        const complaintCategory = (dcr?.complaint_category?.value as string | null) ?? null

        // Upsert call
        await db
            .insert(calls)
            .values({
                id: data.conversation_id,
                agentId: data.agent_id,
                status: data.status ?? "done",
                startTime: startTimeSecs,
                duration: data.metadata?.call_duration_secs ?? null,
                summary: data.analysis?.transcript_summary ?? null,
                callSuccessful: data.analysis?.call_successful ?? null,
                messageCount: data.transcript.length,
                costCredits: data.metadata?.cost?.credits ?? null,
                terminationReason: data.metadata?.termination_reason ?? null,
                syncedAt: now,
                hotelMentioned,
                complaintCategory,
            })
            .onConflictDoUpdate({
                target: calls.id,
                set: {
                    status: data.status ?? "done",
                    startTime: startTimeSecs,
                    duration: data.metadata?.call_duration_secs ?? null,
                    summary: data.analysis?.transcript_summary ?? null,
                    callSuccessful: data.analysis?.call_successful ?? null,
                    messageCount: data.transcript.length,
                    costCredits: data.metadata?.cost?.credits ?? null,
                    terminationReason: data.metadata?.termination_reason ?? null,
                    syncedAt: now,
                    hotelMentioned,
                    complaintCategory,
                },
            })

        // Upsert transcripts (delete + re-insert strategy for webhook)
        if (data.transcript.length > 0) {
            const existingTranscripts = await db
                .select({ id: callTranscripts.id })
                .from(callTranscripts)
                .where(eq(callTranscripts.callId, data.conversation_id))
                .limit(1)

            if (existingTranscripts.length === 0) {
                const transcriptRows = data.transcript.map((t, i) => ({
                    id: crypto.randomUUID(),
                    callId: data.conversation_id,
                    role: t.role,
                    message: t.message,
                    timeInCallSecs: t.time_in_call_secs,
                    sortOrder: i,
                }))

                await db.insert(callTranscripts).values(transcriptRows).onConflictDoNothing()
            }
        }

        // Upsert feedback from data collection
        const rating = (dcr?.customer_rating?.value as number | null) ?? null
        const comment = (dcr?.customer_comment?.value as string | null) ?? null

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
                })
        }

        // Emit event for SSE clients — do this after all DB writes
        callEventBus.emit("call", {
            type: "call:new",
            conversationId: data.conversation_id,
        })

        return reply.status(200).send({ ok: true })
    })
}

/**
 * Verify an ElevenLabs webhook signature.
 *
 * Header format: `ElevenLabs-Signature: t=<unix_ts>,v0=<hmac_sha256_hex>`
 * Signed payload: `<unix_ts>.<raw_request_body>`
 *
 * @param toleranceSecs  Max age of the timestamp before the request is rejected (default 300 s)
 */
function verifyWebhookSignature(secret: string, rawBody: string, signatureHeader: string, toleranceSecs = 300): boolean {
    const parts = signatureHeader.split(",")
    const tPart = parts.find((p) => p.startsWith("t="))
    const v0Part = parts.find((p) => p.startsWith("v0="))
    if (!tPart || !v0Part) return false

    const timestamp = tPart.slice(2)
    const receivedSig = v0Part.slice(3)

    // Replay-attack guard: reject stale timestamps
    const now = Math.floor(Date.now() / 1000)
    const ts = parseInt(timestamp, 10)
    if (isNaN(ts) || Math.abs(now - ts) > toleranceSecs) return false

    // Compute expected HMAC-SHA256
    const signedPayload = `${timestamp}.${rawBody}`
    const expected = createHmac("sha256", secret).update(signedPayload).digest("hex")

    // Constant-time comparison to prevent timing attacks
    try {
        return timingSafeEqual(Buffer.from(receivedSig, "hex"), Buffer.from(expected, "hex"))
    } catch {
        return false
    }
}
