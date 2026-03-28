import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Knowledge Base ───────────────────────────────────────────────

export const hotels = sqliteTable("hotels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  description: text("description"),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const hotelFacilities = sqliteTable("hotel_facilities", {
  id: text("id").primaryKey(),
  hotelId: text("hotel_id").notNull().references(() => hotels.id),
  category: text("category").notNull(), // "parking" | "dining" | "wellness" | "pets" | "accessibility" | "wifi" | "business"
  name: text("name").notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON string for structured extras
});

export const roomTypes = sqliteTable("room_types", {
  id: text("id").primaryKey(),
  hotelId: text("hotel_id").notNull().references(() => hotels.id),
  name: text("name").notNull(),
  description: text("description"),
  maxOccupancy: integer("max_occupancy"),
  priceFromEur: real("price_from_eur"),
  amenities: text("amenities"), // JSON array string
});

export const hotelPolicies = sqliteTable("hotel_policies", {
  id: text("id").primaryKey(),
  hotelId: text("hotel_id"), // null = chain-wide
  topic: text("topic").notNull(), // "pets" | "cancellation" | "check-in" | "breakfast" | "smoking"
  content: text("content").notNull(),
});

// ─── Call Logs ────────────────────────────────────────────────────

export const calls = sqliteTable("calls", {
  id: text("id").primaryKey(), // ElevenLabs conversation_id
  agentId: text("agent_id").notNull(),
  status: text("status"), // "done" | "failed" | "in-progress"
  startTime: integer("start_time").notNull(),
  duration: integer("duration"), // seconds
  summary: text("summary"),
  callSuccessful: text("call_successful"), // "success" | "failure" | "unknown"
  messageCount: integer("message_count"),
  costCredits: real("cost_credits"),
  terminationReason: text("termination_reason"),
  syncedAt: integer("synced_at"),
  hotelMentioned: text("hotel_mentioned"),     // from Data Collection
  complaintCategory: text("complaint_category"), // from Data Collection
});

export const callTranscripts = sqliteTable("call_transcripts", {
  id: text("id").primaryKey(),
  callId: text("call_id").notNull().references(() => calls.id),
  role: text("role").notNull(), // "agent" | "user"
  message: text("message").notNull(),
  timeInCallSecs: real("time_in_call_secs"),
  sortOrder: integer("sort_order").notNull(),
});

export const callFeedback = sqliteTable("call_feedback", {
  id: text("id").primaryKey(),
  callId: text("call_id").notNull().references(() => calls.id).unique(),
  rating: integer("rating"), // 1-5
  comment: text("comment"),
  source: text("source").notNull().default("manual"), // "manual" | "voice" | "webhook"
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
