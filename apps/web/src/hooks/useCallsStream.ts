/**
 * useCallsStream — subscribes to the server's SSE stream and invalidates the
 * calls query whenever the server emits a call:new or call:updated event.
 *
 * This gives the call log real-time updates without polling.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useCallsStream() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // EventSource is reconnect-aware — the browser retries automatically
    const es = new EventSource("/api/calls/stream");
    esRef.current = es;

    es.addEventListener("connected", () => {
      // Stream is live — noop, just confirms the connection
    });

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as { type: string; conversationId: string };
        if (payload.type === "call:new" || payload.type === "call:updated") {
          // Invalidate the list AND the specific call detail (if open)
          queryClient.invalidateQueries({ queryKey: ["calls"] });
          queryClient.invalidateQueries({ queryKey: ["call", payload.conversationId] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
        }
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      // EventSource will auto-reconnect; no action needed
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [queryClient]);
}
