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
  receptionHours: text("reception_hours"),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  totalRooms: integer("total_rooms"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/**
 * Flexible topic-based knowledge entries.
 * Each row is a self-contained German-language answer snippet.
 * hotelId = null → chain-wide fact (applies to all hotels).
 *
 * Topics (extensible, no enum constraint):
 *   hotel_info, contact, reception, checkin, rooms, breakfast, bar,
 *   restaurant, parking, directions, wellness, fitness, meeting_rooms,
 *   meeting_packages, pets, hotel_pet, reservation, cancellation,
 *   payment, groups, wifi, smoking, free_standards, bed_system,
 *   lost_found, fun_facts, construction, brunch
 */
export const knowledgeEntries = sqliteTable("knowledge_entries", {
  id: text("id").primaryKey(),
  hotelId: text("hotel_id").references(() => hotels.id),
  topic: text("topic").notNull(),
  subtopic: text("subtopic"),           // optional finer key, e.g. "einzelzimmer", "queen_victoria"
  content: text("content").notNull(),   // German-language answer text
  keywords: text("keywords"),           // comma-separated search terms for fuzzy matching
  sortOrder: integer("sort_order").default(0), // controls display order within a topic
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

export const callFlags = sqliteTable("call_flags", {
  id: text("id").primaryKey(),
  callId: text("call_id").notNull().references(() => calls.id).unique(),
  positive: integer("positive").notNull(), // 1 = positive, 0 = negative
  comment: text("comment"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
