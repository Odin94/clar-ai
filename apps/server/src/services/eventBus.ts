/**
 * In-process event bus for broadcasting call events to SSE clients.
 * Uses Node's built-in EventEmitter so there are no extra dependencies.
 */
import { EventEmitter } from "events";

export type CallEvent =
  | { type: "call:new"; conversationId: string }
  | { type: "call:updated"; conversationId: string };

class CallEventBus extends EventEmitter {
  emit(event: "call", payload: CallEvent): boolean {
    return super.emit("call", payload);
  }
  on(event: "call", listener: (payload: CallEvent) => void): this {
    return super.on("call", listener);
  }
  off(event: "call", listener: (payload: CallEvent) => void): this {
    return super.off("call", listener);
  }
}

// Singleton shared across the process
export const callEventBus = new CallEventBus();
callEventBus.setMaxListeners(200); // support many concurrent SSE clients
