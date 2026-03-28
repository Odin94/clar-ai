/**
 * Tests for SSE stream + event bus wiring.
 * We test the event bus directly (unit) and verify the webhook emits on it.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestApp, seedCall, schema } from "./helpers.js";
import { callEventBus } from "../services/eventBus.js";
import type { TestApp } from "./helpers.js";
import type { CallEvent } from "../services/eventBus.js";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => ctx.sqlite.close());

// ─── Event bus unit tests ───────────────────────────────────────────────────

describe("callEventBus", () => {
  it("emits call:new events to listeners", () =>
    new Promise<void>((resolve) => {
      const listener = (ev: CallEvent) => {
        callEventBus.off("call", listener);
        expect(ev.type).toBe("call:new");
        expect(ev.conversationId).toBe("conv_bus_test");
        resolve();
      };
      callEventBus.on("call", listener);
      callEventBus.emit("call", { type: "call:new", conversationId: "conv_bus_test" });
    }));

  it("multiple listeners all receive the event", () =>
    new Promise<void>((resolve) => {
      let received = 0;
      const make = () => {
        const l = (_ev: CallEvent) => {
          callEventBus.off("call", l);
          received++;
          if (received === 3) resolve();
        };
        return l;
      };
      const [l1, l2, l3] = [make(), make(), make()];
      callEventBus.on("call", l1);
      callEventBus.on("call", l2);
      callEventBus.on("call", l3);
      callEventBus.emit("call", { type: "call:new", conversationId: "conv_multi" });
    }));

  it("off() removes a listener", () => {
    const spy = vi.fn();
    callEventBus.on("call", spy);
    callEventBus.off("call", spy);
    callEventBus.emit("call", { type: "call:updated", conversationId: "conv_off_test" });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─── Webhook emits event after persisting call ──────────────────────────────

describe("webhook → event bus integration", () => {
  it("emits call:new after a webhook is processed", () =>
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timed out waiting for call event")), 2000);

      const listener = (ev: CallEvent) => {
        if (ev.conversationId !== "conv_sse_wire_test") return;
        clearTimeout(timeout);
        callEventBus.off("call", listener);
        expect(ev.type).toBe("call:new");
        resolve();
      };
      callEventBus.on("call", listener);

      ctx.app.inject({
        method: "POST",
        url: "/api/elevenlabs/webhook",
        payload: {
          event_timestamp: Math.floor(Date.now() / 1000),
          type: "post_call_transcription",
          data: {
            conversation_id: "conv_sse_wire_test",
            agent_id: "agent_test",
            status: "done",
            transcript: [{ role: "agent", message: "Hello", time_in_call_secs: 0 }],
            metadata: {
              start_time_unix_secs: Math.floor(Date.now() / 1000),
              call_duration_secs: 5,
              cost: { credits: 0.1 },
              termination_reason: "user_hangup",
            },
            analysis: {
              call_successful: "success",
              transcript_summary: "Test call.",
              data_collection_results: {
                customer_rating: { value: null },
                customer_comment: { value: null },
              },
            },
          },
        },
      });
    }));
});

// ─── GET /api/calls/stream — route registration ──────────────────────────────
// Fastify's inject() isn't designed for long-lived SSE streams, so we verify
// the route is registered by checking the router's route table directly.

describe("GET /api/calls/stream", () => {
  it("route is registered in the app", () => {
    // hasRoute is available on the Fastify instance
    const registered = ctx.app.hasRoute({ method: "GET", url: "/api/calls/stream" });
    expect(registered).toBe(true);
  });
});
