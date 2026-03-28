/**
 * Tests for POST /api/webhook/callLogEntry
 * Verifies that post-call webhook payloads are persisted correctly,
 * including voice-collected feedback from Data Collection.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createHmac } from "crypto"
import { eq } from "drizzle-orm"
import { createTestApp, schema, authHeaders } from "./helpers.js"
import type { TestApp } from "./helpers.js"

/** Build a valid ElevenLabs-Signature header for a given secret + body */
function signPayload(secret: string, body: string): string {
    const ts = Math.floor(Date.now() / 1000)
    const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")
    return `t=${ts},v0=${sig}`
}

let ctx: TestApp

beforeAll(async () => {
    ctx = await createTestApp()
})

afterAll(() => ctx.sqlite.close())

/** Minimal valid post-call webhook payload */
function makePayload(
    overrides: {
        conversationId?: string
        rating?: number | null
        comment?: string | null
        hotelMentioned?: string | null
        complaintCategory?: string | null
        transcriptEntries?: Array<{ role: string; message: string; time_in_call_secs: number }>
    } = {},
) {
    const {
        conversationId = "webhook_conv_001",
        rating = null,
        comment = null,
        hotelMentioned = null,
        complaintCategory = null,
        transcriptEntries = [
            { role: "agent", message: "Hello! How can I help?", time_in_call_secs: 0 },
            { role: "user", message: "What time is check-in?", time_in_call_secs: 2.1 },
            { role: "agent", message: "Check-in is from 15:00.", time_in_call_secs: 4.5 },
        ],
    } = overrides

    return {
        event_timestamp: Math.floor(Date.now() / 1000),
        type: "post_call_transcription",
        data: {
            conversation_id: conversationId,
            agent_id: "agent_xyz",
            status: "done",
            transcript: transcriptEntries,
            metadata: {
                start_time_unix_secs: Math.floor(Date.now() / 1000) - 180,
                call_duration_secs: 180,
                cost: { credits: 1.5 },
                termination_reason: "user_hangup",
            },
            analysis: {
                call_successful: "success",
                transcript_summary: "Customer asked about check-in time.",
                data_collection_results: {
                    customer_rating: { value: rating },
                    customer_comment: { value: comment },
                    hotel_mentioned: { value: hotelMentioned },
                    complaint_category: { value: complaintCategory },
                },
            },
        },
    }
}

describe("POST /api/webhook/callLogEntry", () => {
    it("responds 200 immediately", async () => {
        const res = await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: "wh_200_test" }),
        })
        expect(res.statusCode).toBe(200)
    })

    it("persists call data to the database", async () => {
        const convId = "wh_persist_test"
        await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: convId }),
        })

        // Give the async background work time to complete
        await new Promise((r) => setTimeout(r, 50))

        const rows = await ctx.db.select().from(schema.calls).where(eq(schema.calls.id, convId))

        expect(rows).toHaveLength(1)
        expect(rows[0].agentId).toBe("agent_xyz")
        expect(rows[0].callSuccessful).toBe("success")
        expect(rows[0].duration).toBe(180)
        expect(rows[0].costCredits).toBe(1.5)
        expect(rows[0].summary).toMatch(/check-in/i)
        expect(rows[0].terminationReason).toBe("user_hangup")
    })

    it("persists transcript entries in order", async () => {
        const convId = "wh_transcript_test"
        await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: convId }),
        })

        await new Promise((r) => setTimeout(r, 50))

        const transcripts = await ctx.db
            .select()
            .from(schema.callTranscripts)
            .where(eq(schema.callTranscripts.callId, convId))
            .orderBy(schema.callTranscripts.sortOrder)

        expect(transcripts).toHaveLength(3)
        expect(transcripts[0].role).toBe("agent")
        expect(transcripts[0].sortOrder).toBe(0)
        expect(transcripts[2].role).toBe("agent")
        expect(transcripts[2].message).toMatch(/15:00/)
    })

    it("persists voice feedback from data collection", async () => {
        const convId = "wh_feedback_test"
        await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: convId, rating: 4, comment: "Very helpful!" }),
        })

        await new Promise((r) => setTimeout(r, 50))

        const feedbackRows = await ctx.db.select().from(schema.callFeedback).where(eq(schema.callFeedback.callId, convId))

        expect(feedbackRows).toHaveLength(1)
        expect(feedbackRows[0].rating).toBe(4)
        expect(feedbackRows[0].comment).toBe("Very helpful!")
        expect(feedbackRows[0].source).toBe("voice")
    })

    it("does NOT create feedback when data collection values are null", async () => {
        const convId = "wh_no_feedback_test"
        await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: convId, rating: null, comment: null }),
        })

        await new Promise((r) => setTimeout(r, 50))

        const feedbackRows = await ctx.db.select().from(schema.callFeedback).where(eq(schema.callFeedback.callId, convId))

        expect(feedbackRows).toHaveLength(0)
    })

    it("persists hotel_mentioned and complaint_category from data collection", async () => {
        const convId = "wh_datacollection_test"
        await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({
                conversationId: convId,
                hotelMentioned: "Dormero Hotel Coburg",
                complaintCategory: "noise",
            }),
        })

        await new Promise((r) => setTimeout(r, 50))

        const rows = await ctx.db.select().from(schema.calls).where(eq(schema.calls.id, convId))

        expect(rows).toHaveLength(1)
        expect(rows[0].hotelMentioned).toBe("Dormero Hotel Coburg")
        expect(rows[0].complaintCategory).toBe("noise")
    })

    it("stores null for hotel_mentioned and complaint_category when not provided", async () => {
        const convId = "wh_datacollection_null"
        await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: convId }),
        })

        await new Promise((r) => setTimeout(r, 50))

        const rows = await ctx.db.select().from(schema.calls).where(eq(schema.calls.id, convId))

        expect(rows).toHaveLength(1)
        expect(rows[0].hotelMentioned).toBeNull()
        expect(rows[0].complaintCategory).toBeNull()
    })

    it("upserts call on duplicate webhook delivery (idempotent)", async () => {
        const convId = "wh_idempotent_test"
        const payload = makePayload({ conversationId: convId })

        await ctx.app.inject({ method: "POST", url: "/api/webhook/callLogEntry", headers: authHeaders, payload })
        await ctx.app.inject({ method: "POST", url: "/api/webhook/callLogEntry", headers: authHeaders, payload })

        await new Promise((r) => setTimeout(r, 50))

        const rows = await ctx.db.select().from(schema.calls).where(eq(schema.calls.id, convId))

        // Should only be one row – upsert, not duplicate insert
        expect(rows).toHaveLength(1)
    })

    it("ignores payloads with unknown event type", async () => {
        const res = await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: { type: "some_other_event", data: {} },
        })
        // Should still return 200 (fire-and-forget)
        expect(res.statusCode).toBe(200)
    })

    it("handles empty transcript gracefully", async () => {
        const convId = "wh_empty_transcript"
        const res = await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: convId, transcriptEntries: [] }),
        })
        expect(res.statusCode).toBe(200)

        await new Promise((r) => setTimeout(r, 50))

        const rows = await ctx.db.select().from(schema.calls).where(eq(schema.calls.id, convId))
        expect(rows).toHaveLength(1)

        const transcripts = await ctx.db.select().from(schema.callTranscripts).where(eq(schema.callTranscripts.callId, convId))
        expect(transcripts).toHaveLength(0)
    })
})

describe("POST /api/webhook/callLogEntry – HMAC signature verification", () => {
    const WEBHOOK_SECRET = "test-webhook-secret-abc123"
    let secured: TestApp

    beforeAll(async () => {
        secured = await createTestApp({ webhookSecret: WEBHOOK_SECRET })
    })

    afterAll(() => secured.sqlite.close())

    it("accepts a request with a valid HMAC signature", async () => {
        const payload = makePayload({ conversationId: "hmac_valid" })
        const body = JSON.stringify(payload)
        const res = await secured.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            payload: body,
            headers: {
                ...authHeaders,
                "content-type": "application/json",
                "elevenlabs-signature": signPayload(WEBHOOK_SECRET, body),
            },
        })
        expect(res.statusCode).toBe(200)
    })

    it("rejects a request with a missing signature header", async () => {
        const res = await secured.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: "hmac_missing" }),
        })
        expect(res.statusCode).toBe(401)
        expect(res.json<{ error: string }>().error).toMatch(/signature/i)
    })

    it("rejects a request with an incorrect signature", async () => {
        const payload = makePayload({ conversationId: "hmac_wrong" })
        const body = JSON.stringify(payload)
        const ts = Math.floor(Date.now() / 1000)
        const res = await secured.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            payload: body,
            headers: {
                ...authHeaders,
                "content-type": "application/json",
                "elevenlabs-signature": `t=${ts},v0=deadbeefdeadbeefdeadbeefdeadbeef`,
            },
        })
        expect(res.statusCode).toBe(401)
    })

    it("skips verification when no webhook secret is configured", async () => {
        // ctx is the app without a secret — requests should pass through
        const res = await ctx.app.inject({
            method: "POST",
            url: "/api/webhook/callLogEntry",
            headers: authHeaders,
            payload: makePayload({ conversationId: "hmac_no_secret" }),
            // No signature header — should still be accepted
        })
        expect(res.statusCode).toBe(200)
    })
})

describe("POST /api/webhook/callLogEntry – knowledge route", () => {
    it("returns answer for a known topic via /api/knowledge/query", async () => {
        // Sanity check that the knowledge route is mounted and works end-to-end
        const res = await ctx.app.inject({
            method: "POST",
            url: "/api/knowledge/query",
            headers: authHeaders,
            payload: { topic: "cancellation" },
        })
        // DB is empty of knowledge data in this test suite, so we get the fallback
        expect(res.statusCode).toBe(200)
        const body = res.json<{ answer: string }>()
        expect(typeof body.answer).toBe("string")
        expect(body.answer.length).toBeGreaterThan(0)
    })
})
