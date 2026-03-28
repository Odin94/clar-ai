import { getDb } from "./index.js";
import {
  hotels,
  hotelFacilities,
  roomTypes,
  hotelPolicies,
} from "./schema.js";
import { eq } from "drizzle-orm";

const DDL = `
CREATE TABLE IF NOT EXISTS hotels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS hotel_facilities (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS room_types (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  description TEXT,
  max_occupancy INTEGER,
  price_from_eur REAL,
  amenities TEXT
);

CREATE TABLE IF NOT EXISTS hotel_policies (
  id TEXT PRIMARY KEY,
  hotel_id TEXT,
  topic TEXT NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT,
  start_time INTEGER NOT NULL,
  duration INTEGER,
  summary TEXT,
  call_successful TEXT,
  message_count INTEGER,
  cost_credits REAL,
  termination_reason TEXT,
  synced_at INTEGER,
  hotel_mentioned TEXT,
  complaint_category TEXT
);

CREATE TABLE IF NOT EXISTS call_transcripts (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id),
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  time_in_call_secs REAL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS call_feedback (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) UNIQUE,
  rating INTEGER,
  comment TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

async function seed() {
  const db = await getDb();

  // Run DDL via the underlying sqlite client
  db.$client.exec(DDL);

  const now = Date.now();
  // Use a stable, deterministic ID so re-running the seed is idempotent
  const HOTEL_ID = "hotel-dormero-coburg";
  const HOTEL_SLUG = "dormero-coburg";

  // ─── Hotel ────────────────────────────────────────────────────────
  // Upsert by slug – if a row exists with a different id (from a prior random-id seed),
  // we need to delete it first so we can re-insert with the stable ID.
  const existingHotel = await db
    .select({ id: hotels.id })
    .from(hotels)
    .where(eq(hotels.slug, HOTEL_SLUG))
    .limit(1);

  if (existingHotel.length > 0 && existingHotel[0].id !== HOTEL_ID) {
    // Remove old hotel and its children so we can re-insert with the stable ID
    await db.delete(hotelFacilities).where(eq(hotelFacilities.hotelId, existingHotel[0].id));
    await db.delete(roomTypes).where(eq(roomTypes.hotelId, existingHotel[0].id));
    await db.delete(hotels).where(eq(hotels.id, existingHotel[0].id));
  }

  // Always wipe and re-insert child rows so re-seeding is idempotent.
  // Facilities and rooms may accumulate duplicates if IDs change between runs.
  await db.delete(hotelFacilities).where(eq(hotelFacilities.hotelId, HOTEL_ID));
  await db.delete(roomTypes).where(eq(roomTypes.hotelId, HOTEL_ID));
  // Chain-wide policies have no hotel_id FK – delete all and re-insert
  await db.delete(hotelPolicies);

  const hotelId = HOTEL_ID;
  await db
    .insert(hotels)
    .values({
      id: hotelId,
      name: "Dormero Hotel Coburg",
      slug: HOTEL_SLUG,
      city: "Coburg",
      address: "Ketschendorfer Str. 25, 96450 Coburg, Germany",
      phone: "+49 9561 8760",
      email: "coburg@dormero.de",
      description:
        "The Dormero Hotel Coburg is a modern 4-star hotel in the heart of Coburg, Bavaria. " +
        "Located just minutes from the historic Coburg Fortress (Veste Coburg) and the charming old town, " +
        "the hotel offers comfortable rooms, a renowned restaurant, and comprehensive wellness facilities. " +
        "Ideal for both business and leisure travellers.",
      checkInTime: "15:00",
      checkOutTime: "12:00",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // ─── Chain-wide Policies ──────────────────────────────────────────
  const chainPolicies = [
    {
      id: crypto.randomUUID(),
      hotelId: null as string | null,
      topic: "pets",
      content:
        "Pets are welcome at all Dormero hotels. Small pets (up to 10 kg) are permitted in designated rooms " +
        "for a surcharge of €15 per night. Pets must be kept on a leash in all public areas. " +
        "Please inform the hotel at the time of booking that you will be travelling with a pet.",
    },
    {
      id: crypto.randomUUID(),
      hotelId: null as string | null,
      topic: "cancellation",
      content:
        "Free cancellation is available up to 48 hours before the scheduled arrival date. " +
        "Cancellations made within 48 hours of arrival will be charged one night's accommodation. " +
        "No-shows will be charged the full booking amount. Group bookings (10+ rooms) require 14 days notice " +
        "and may be subject to different cancellation terms.",
    },
    {
      id: crypto.randomUUID(),
      hotelId: null as string | null,
      topic: "breakfast",
      content:
        "A rich buffet breakfast is served daily from 06:30 to 10:30 (weekdays) and 07:00 to 11:00 (weekends). " +
        "The breakfast includes a selection of cold cuts, cheeses, fresh bread and pastries, " +
        "hot dishes, fresh fruit, cereals, and a variety of hot and cold beverages. " +
        "Breakfast is priced at €18 per adult and €9 per child (6-12 years). Children under 6 eat free.",
    },
    {
      id: crypto.randomUUID(),
      hotelId: null as string | null,
      topic: "check-in",
      content:
        "Standard check-in time is 15:00. Early check-in from 12:00 is available upon request, subject to availability, " +
        "and may incur an additional charge of €20. Standard check-out time is 12:00. " +
        "Late check-out until 14:00 is available upon request for €25; until 18:00 for half the daily room rate. " +
        "Express check-out is available via the hotel app or front desk.",
    },
    {
      id: crypto.randomUUID(),
      hotelId: null as string | null,
      topic: "smoking",
      content:
        "All Dormero hotels are strictly non-smoking indoors. Smoking is only permitted in designated outdoor areas. " +
        "A cleaning fee of €150 will be charged if smoking is detected in guest rooms. " +
        "Electronic cigarettes and vaping devices are subject to the same policy as traditional cigarettes.",
    },
  ];

  await db.insert(hotelPolicies).values(chainPolicies).onConflictDoNothing();

  // ─── Facilities ───────────────────────────────────────────────────
  const facilities = [
    {
      id: crypto.randomUUID(),
      hotelId: hotelId,
      category: "parking",
      name: "Underground Car Park",
      description:
        "Secure underground parking garage located directly beneath the hotel. Open 24 hours, 7 days a week.",
      metadata: JSON.stringify({
        price_per_day_eur: 12,
        ev_charging: false,
        height_limit_m: 2.0,
        spaces: 80,
        reservation_required: false,
      }),
    },
    {
      id: crypto.randomUUID(),
      hotelId: hotelId,
      category: "dining",
      name: "Restaurant Vestehof",
      description:
        "Our signature restaurant serves regional Franconian cuisine alongside international dishes. " +
        "Open for lunch (12:00–14:30) and dinner (18:00–22:00). The restaurant seats up to 120 guests " +
        "and features a terrace open in summer. Reservations are recommended for dinner service.",
      metadata: JSON.stringify({
        lunch_hours: "12:00-14:30",
        dinner_hours: "18:00-22:00",
        capacity: 120,
        terrace: true,
        cuisine: "Franconian / International",
      }),
    },
    {
      id: crypto.randomUUID(),
      hotelId: hotelId,
      category: "wellness",
      name: "Wellness & Fitness Area",
      description:
        "The hotel's wellness area includes a 12-metre indoor swimming pool, a Finnish sauna (80°C), " +
        "a steam bath, and a relaxation lounge. The adjoining fitness centre is equipped with modern cardio " +
        "and strength training machines. The wellness area is open daily from 07:00 to 22:00 and is free " +
        "of charge for hotel guests.",
      metadata: JSON.stringify({
        pool_length_m: 12,
        sauna: true,
        steam_bath: true,
        fitness_centre: true,
        open_hours: "07:00-22:00",
        free_for_guests: true,
      }),
    },
    {
      id: crypto.randomUUID(),
      hotelId: hotelId,
      category: "wifi",
      name: "Free High-Speed Wi-Fi",
      description:
        "Complimentary high-speed Wi-Fi (up to 100 Mbit/s) is available throughout the entire hotel, " +
        "including all guest rooms, the restaurant, conference rooms, and public areas. " +
        "No login required – simply connect to the 'Dormero_Guest' network.",
      metadata: JSON.stringify({
        speed_mbit: 100,
        free: true,
        network_name: "Dormero_Guest",
        coverage: "entire hotel",
      }),
    },
  ];

  await db.insert(hotelFacilities).values(facilities).onConflictDoNothing();

  // ─── Room Types ───────────────────────────────────────────────────
  const rooms = [
    {
      id: crypto.randomUUID(),
      hotelId: hotelId,
      name: "Standard Single Room",
      description:
        "Comfortably furnished single room (18–22 m²) with a single bed (90×200 cm) or twin configuration on request. " +
        "Features a work desk, flat-screen TV, minibar, and a modern en-suite bathroom with shower. " +
        "Ideal for solo business travellers.",
      maxOccupancy: 1,
      priceFromEur: 89.0,
      amenities: JSON.stringify([
        "Free Wi-Fi",
        "Flat-screen TV",
        "Minibar",
        "Work desk",
        "En-suite shower",
        "Air conditioning",
        "Safe",
        "Telephone",
        "Daily housekeeping",
      ]),
    },
    {
      id: crypto.randomUUID(),
      hotelId: hotelId,
      name: "Superior Double Room",
      description:
        "Spacious superior room (26–32 m²) with a king-size bed (180×200 cm) or two twin beds on request. " +
        "Elegantly furnished with a seating area, bathtub and separate shower, and views of the hotel garden " +
        "or the Coburg Fortress. Perfect for couples and leisure travellers.",
      maxOccupancy: 2,
      priceFromEur: 129.0,
      amenities: JSON.stringify([
        "Free Wi-Fi",
        "Flat-screen TV",
        "Minibar",
        "Seating area",
        "Bathtub & separate shower",
        "Air conditioning",
        "Safe",
        "Nespresso machine",
        "Bathrobes & slippers",
        "Daily housekeeping",
        "Turndown service",
      ]),
    },
    {
      id: crypto.randomUUID(),
      hotelId: hotelId,
      name: "Dormero Suite",
      description:
        "Luxurious suite (50–60 m²) comprising a separate living room, dining area, and a master bedroom " +
        "with a premium king-size bed. The suite features a whirlpool bathtub, a walk-in rain shower, " +
        "a fully stocked bar, and panoramic views of Coburg. Ideal for honeymooners and VIP guests. " +
        "Complimentary airport transfer and welcome amenity included.",
      maxOccupancy: 2,
      priceFromEur: 249.0,
      amenities: JSON.stringify([
        "Free Wi-Fi",
        "65-inch flat-screen TV",
        "Fully stocked minibar",
        "Separate living room",
        "Whirlpool bathtub",
        "Walk-in rain shower",
        "Air conditioning",
        "In-room safe",
        "Nespresso machine",
        "Premium bathrobes & slippers",
        "Daily housekeeping",
        "Turndown service",
        "Complimentary airport transfer",
        "Welcome amenity",
        "Panoramic views",
      ]),
    },
  ];

  await db.insert(roomTypes).values(rooms).onConflictDoNothing();

  console.log("Seed completed successfully.");
  console.log(`  Hotel: Dormero Hotel Coburg (id: ${hotelId})`);
  console.log(`  Policies: ${chainPolicies.length} chain-wide`);
  console.log(`  Facilities: ${facilities.length}`);
  console.log(`  Room types: ${rooms.length}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
