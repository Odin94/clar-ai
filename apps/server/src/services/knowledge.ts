import { eq, like, or, sql } from "drizzle-orm";
import type { getDb } from "@clarai/db";
import {
  hotels,
  hotelFacilities,
  hotelPolicies,
  roomTypes,
} from "@clarai/db";

type DB = Awaited<ReturnType<typeof getDb>>;

function topicToCategories(topic: string): {
  facilityCategories: string[];
  policyTopics: string[];
  queryRooms: boolean;
} {
  const t = topic.toLowerCase();

  if (/parking|car|garage/.test(t)) {
    return { facilityCategories: ["parking"], policyTopics: [], queryRooms: false };
  }
  if (/food|restaurant|dining/.test(t)) {
    return { facilityCategories: ["dining"], policyTopics: [], queryRooms: false };
  }
  if (/breakfast/.test(t)) {
    return { facilityCategories: ["dining"], policyTopics: ["breakfast"], queryRooms: false };
  }
  if (/pet|dog|animal|cat/.test(t)) {
    return { facilityCategories: [], policyTopics: ["pets"], queryRooms: false };
  }
  if (/cancel|refund/.test(t)) {
    return { facilityCategories: [], policyTopics: ["cancellation"], queryRooms: false };
  }
  if (/check.?in|check.?out/.test(t)) {
    return { facilityCategories: [], policyTopics: ["check-in"], queryRooms: false };
  }
  if (/wellness|spa|pool|gym|fitness/.test(t)) {
    return { facilityCategories: ["wellness"], policyTopics: [], queryRooms: false };
  }
  if (/wifi|internet/.test(t)) {
    return { facilityCategories: ["wifi"], policyTopics: [], queryRooms: false };
  }
  if (/room|suite|double|single/.test(t)) {
    return { facilityCategories: [], policyTopics: [], queryRooms: true };
  }
  if (/smok/.test(t)) {
    return { facilityCategories: [], policyTopics: ["smoking"], queryRooms: false };
  }

  // fallback – return everything
  return { facilityCategories: [], policyTopics: [], queryRooms: false };
}

export async function queryKnowledge(
  db: DB,
  hotelName: string | undefined,
  topic: string
): Promise<string> {
  const { facilityCategories, policyTopics, queryRooms } = topicToCategories(topic);

  // ── Find hotel (optional) ─────────────────────────────────────────
  let hotel: typeof hotels.$inferSelect | undefined;

  if (hotelName) {
    const pattern = `%${hotelName}%`;
    const results = await db
      .select()
      .from(hotels)
      .where(
        or(
          like(hotels.name, pattern),
          like(hotels.city, pattern),
          like(hotels.slug, pattern)
        )
      )
      .limit(1);
    hotel = results[0];

    // If the caller asked about a specific hotel but we have no record of it,
    // return early rather than falling through and serving another hotel's data.
    if (!hotel) {
      console.warn(`[knowledge] FALLBACK – hotel not found: hotel_name="${hotelName}", topic="${topic}"`);
      return `I'm sorry, I don't have information for "${hotelName}" in our knowledge base. Please contact that hotel directly for assistance.`;
    }
  }

  const parts: string[] = [];

  // ── Check-in / check-out times from hotel row ────────────────────
  if (/check.?in|check.?out/.test(topic.toLowerCase()) && hotel) {
    parts.push(
      `At ${hotel.name}, check-in is from ${hotel.checkInTime ?? "15:00"} and check-out is by ${hotel.checkOutTime ?? "12:00"}.`
    );
  }

  // ── Facilities ───────────────────────────────────────────────────
  if (facilityCategories.length > 0) {
    const facilityConditions = facilityCategories.map((cat) =>
      eq(hotelFacilities.category, cat)
    );
    const whereClause = hotel
      ? sql`${hotelFacilities.hotelId} = ${hotel.id} AND ${
          facilityConditions.length === 1
            ? facilityConditions[0]
            : or(...facilityConditions)
        }`
      : or(...facilityConditions) ?? sql`1=1`;

    const facilities = await db
      .select()
      .from(hotelFacilities)
      .where(whereClause)
      .limit(6)
      .then((fs) => fs.filter((f, i, arr) => arr.findIndex((x) => x.name === f.name) === i).slice(0, 3));

    for (const f of facilities) {
      parts.push(f.description ?? f.name);
      if (f.metadata) {
        try {
          const meta = JSON.parse(f.metadata) as Record<string, unknown>;
          if (facilityCategories.includes("parking")) {
            const price = meta["price_per_day_eur"];
            const height = meta["height_limit_m"];
            const ev = meta["ev_charging"];
            const details: string[] = [];
            if (price != null) details.push(`€${price}/day`);
            if (height != null) details.push(`max height ${height} m`);
            if (ev === false) details.push(`no EV charging`);
            else if (ev === true) details.push(`EV charging available`);
            if (details.length > 0)
              parts.push(`Parking: ${details.join(", ")}.`);
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }
  }

  // ── Policies ─────────────────────────────────────────────────────
  if (policyTopics.length > 0) {
    const policyConditions = policyTopics.map((t) =>
      eq(hotelPolicies.topic, t)
    );
    const whereClause = hotel
      ? sql`(${hotelPolicies.hotelId} = ${hotel.id} OR ${hotelPolicies.hotelId} IS NULL) AND ${
          policyConditions.length === 1
            ? policyConditions[0]
            : or(...policyConditions)
        }`
      : or(...policyConditions) ?? sql`1=1`;

    const policies = await db
      .select()
      .from(hotelPolicies)
      .where(whereClause)
      .limit(6)
      .then((ps) => ps.filter((p, i, arr) => arr.findIndex((x) => x.content === p.content) === i).slice(0, 2));

    for (const p of policies) {
      parts.push(p.content);
    }
  }

  // ── Rooms ─────────────────────────────────────────────────────────
  if (queryRooms) {
    const whereClause = hotel
      ? eq(roomTypes.hotelId, hotel.id)
      : sql`1=1`;

    const rooms = await db
      .select()
      .from(roomTypes)
      .where(whereClause)
      .limit(6)
      // Deduplicate by name in case of stale duplicate rows
      .then((rs) => rs.filter((r, i, arr) => arr.findIndex((x) => x.name === r.name) === i));

    if (rooms.length > 0) {
      const summary = rooms
        .map(
          (r) =>
            `${r.name} (from €${r.priceFromEur ?? "–"}/night, max ${r.maxOccupancy ?? "?"} guest(s))`
        )
        .join(", ");
      parts.push(`Available room types: ${summary}.`);
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────
  if (parts.length === 0) {
    const hotelLabel = hotel ? hotel.name : "our hotel";
    console.warn(`[knowledge] FALLBACK – no data found: hotel="${hotelLabel}", topic="${topic}"`);
    return `I'm sorry, I don't have specific information about "${topic}" for ${hotelLabel}. Please contact the front desk directly for assistance.`;
  }

  // Deduplicate identical parts (guard against duplicate DB rows), cap at 3 for voice brevity
  const uniqueParts = parts.filter((p, i, arr) => arr.indexOf(p) === i);
  const answer = uniqueParts.slice(0, 3).join(" ").trim();
  console.log(`[knowledge] OK – hotel="${hotel?.name ?? "any"}", topic="${topic}", answer="${answer}"`);
  return answer;
}
