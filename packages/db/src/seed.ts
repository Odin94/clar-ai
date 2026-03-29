import { getDb } from "./index.js";
import { hotels, knowledgeEntries } from "./schema.js";

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
  reception_hours TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  total_rooms INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,
  hotel_id TEXT REFERENCES hotels(id),
  topic TEXT NOT NULL,
  subtopic TEXT,
  content TEXT NOT NULL,
  keywords TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ke_hotel_topic ON knowledge_entries(hotel_id, topic);
CREATE INDEX IF NOT EXISTS idx_ke_topic ON knowledge_entries(topic);

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

// ─── Helper ─────────────────────────────────────────────────────────
let entryCounter = 0;
function entry(
  hotelId: string | null,
  topic: string,
  content: string,
  keywords: string,
  subtopic?: string,
  sortOrder = 0
) {
  entryCounter++;
  return {
    id: `ke-${hotelId ?? "chain"}-${topic}-${subtopic ?? entryCounter}`,
    hotelId,
    topic,
    subtopic: subtopic ?? null,
    content,
    keywords,
    sortOrder,
  };
}

// ─── Hotel IDs ──────────────────────────────────────────────────────
const COBURG_ID = "hotel-dormero-coburg";
const DESSAU_ID = "hotel-dormero-dessau";

async function seed() {
  const db = await getDb();
  db.$client.exec(DDL);

  const now = Date.now();

  // Clean slate for knowledge data
  await db.delete(knowledgeEntries);
  await db.delete(hotels);

  // ═══════════════════════════════════════════════════════════════════
  // HOTELS
  // ═══════════════════════════════════════════════════════════════════

  await db.insert(hotels).values([
    {
      id: COBURG_ID,
      name: "DORMERO Hotel Coburg",
      slug: "dormero-coburg",
      city: "Coburg",
      address: "Am Viktoriabrunnen 2, 96450 Coburg",
      phone: "+49 9561 8760",
      email: "coburg@dormero.de",
      description:
        "Anmutig. Einzigartig. Sinnlich. In bester zentraler Lage nur wenige Minuten vom historischen Marktplatz und vom Schloss Ehrenburg entfernt. 68 Zimmer in modern-elegantem Ambiente, drei Tagungsräume, eine Bar und ein großer Wellnessbereich.",
      receptionHours: "13:00–23:00 Uhr",
      checkInTime: "15:00",
      checkOutTime: "12:00",
      totalRooms: 68,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DESSAU_ID,
      name: "DORMERO Hotel Dessau-Roßlau",
      slug: "dormero-dessau",
      city: "Dessau-Roßlau",
      address: "Zerbster Straße 29, 06844 Dessau-Roßlau",
      phone: "+49 340 25140",
      email: "dessau@dormero.de",
      description:
        "Attraktiv. Überraschend. Poetisch. Unweit der lebhaften Fußgängerzone liegt das DORMERO Hotel Dessau-Roßlau, mit 152 Zimmern und 9 Tagungsräumen. Die Stadt liegt inmitten einer ausgedehnten Auenlandschaft neben Elbe und Mulde, mit zwei UNESCO-Welterbestätten.",
      receptionHours: "13:00–23:00 Uhr",
      checkInTime: "15:00",
      checkOutTime: "12:00",
      totalRooms: 152,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // CHAIN-WIDE KNOWLEDGE (hotelId = null)
  // ═══════════════════════════════════════════════════════════════════

  const chainEntries = [
    // ── Reservation ───────────────────────────────────────────────
    entry(
      null, "reservation",
      "Sie können direkt auf unserer Website www.dormero.de buchen oder über unsere Zimmerreservierung. Telefonisch erreichen Sie uns Montag bis Freitag von 7:00 bis 19:00 Uhr sowie Samstag/Sonntag und an Feiertagen von 10:00 bis 18:00 Uhr unter +49 30 20213300 oder per E-Mail an reservierung@dormero.de.",
      "buchen,buchung,reservierung,reservieren,telefon,website,zimmer buchen",
      "booking"
    ),
    entry(
      null, "reservation",
      "Für die Buchung brauchen Sie eine Kreditkarte nur zur Garantie bei Anreise nach 18:00 Uhr. Bei der Fancy Saver Rate, bei der Sie 15% sparen, ist eine volle Vorauszahlung bei Buchung mit Kreditkarte erforderlich.",
      "kreditkarte,garantie,fancy saver,vorauszahlung",
      "credit_card"
    ),

    // ── Payment ───────────────────────────────────────────────────
    entry(
      null, "payment",
      "DORMERO hat vollständig auf digitalen Zahlungsverkehr umgestellt: daher werden nur Karten zur Zahlung akzeptiert. Barzahlung ist nicht möglich.",
      "zahlung,bezahlen,karte,bargeld,bar,kreditkarte,ec-karte,digital",
      "methods"
    ),
    entry(
      null, "payment",
      "Kostenübernahmen akzeptieren wir nur in Form einer Kreditkartenabbuchung auf Firmenpapier. Privatkunden senden wir ein entsprechendes Formular zu – wenden Sie sich hierfür an reservierung@dormero.de.",
      "kostenübernahme,firma,firmenpapier,formular",
      "cost_coverage"
    ),

    // ── Cancellation ──────────────────────────────────────────────
    entry(
      null, "cancellation",
      "Die Stornierungsbedingungen richten sich nach dem gewählten Tarif. Die Fancy Saver Rate ist nicht änder- oder stornierbar. Die Smart Rate ist flexibel änder- und stornierbar bis 24 Stunden vor Anreise.",
      "stornierung,stornieren,absagen,ändern,umbuchung,fancy saver,smart rate",
      "conditions"
    ),
    entry(
      null, "cancellation",
      "Wurde eine Übernachtung über einen Drittanbieter (z.B. Booking, Expedia, HRS) getätigt, müssen Änderungen oder Stornierungen auf dem jeweiligen Buchungsportal vorgenommen werden. Es gelten die Buchungskonditionen der jeweiligen Portale.",
      "drittanbieter,booking,expedia,hrs,portal,stornieren",
      "third_party"
    ),

    // ── Check-in / Check-out ──────────────────────────────────────
    entry(
      null, "checkin",
      "Check-in ab 15:00 Uhr (auf Rügen, in Lüneburg und an der Zugspitze ab 16:00 Uhr) bis 23:00 Uhr. Sollten Sie außerhalb dieser Zeiten anreisen, wenden Sie sich bitte frühzeitig an reservierung@dormero.de.",
      "check-in,einchecken,anreise,anreisezeit",
      "checkin_time"
    ),
    entry(
      null, "checkin",
      "Check-out bis 12:00 Uhr. Late Check-out bis 14:00 Uhr ist sonntags und an Feiertagen kostenfrei möglich.",
      "check-out,auschecken,abreise,late checkout,spät abreisen",
      "checkout_time"
    ),

    // ── Reception ─────────────────────────────────────────────────
    entry(
      null, "reception",
      "Unsere Rezeptionen sind von 13:00 bis 23:00 Uhr für Sie besetzt. In Frankfurt, Hannover, Lüneburg, Stuttgart, Wien und Budapest sind wir rund um die Uhr für Sie da.",
      "rezeption,rezeptionszeiten,empfang,öffnungszeiten",
    ),

    // ── Breakfast ─────────────────────────────────────────────────
    entry(
      null, "breakfast",
      "Unser schmackhaftes Frühstücksbuffet können Sie täglich von 06:30 bis 10:30 Uhr genießen. Das Frühstück kann über unsere Website, bei telefonischer Buchung oder vor Ort im Hotel dazu gebucht werden. Die aktuellen Frühstückspreise entnehmen Sie bitte der jeweiligen Hotelwebsite.",
      "frühstück,breakfast,buffet,morgens,frühstücken",
      "general"
    ),

    // ── Pricing ───────────────────────────────────────────────────
    entry(
      null, "rooms",
      "Die tagesaktuellen Zimmerpreise können Sie auf unserer Website www.dormero.de nach Auswahl des Hotels über die 'Suchen & Buchen' Funktion einsehen. Die Preise sind pro Zimmer und exklusive Frühstück. Der tagesaktuelle Preis richtet sich nach Auslastung, Rabattaktionen sowie Messezeiten.",
      "preis,preise,kosten,zimmerpreis,pro person,pro zimmer,was kostet",
      "pricing"
    ),

    // ── Pets ──────────────────────────────────────────────────────
    entry(
      null, "pets",
      "Wir sind tierisch fancy! Bei DORMERO checkt Ihr Haustier gratis mit ein. Während Ihres Aufenthaltes können Sie Ihren liebsten Vierbeiner einfach kostenfrei mitbringen. Geben Sie diese Information bei der Reservierung mit an und checken Sie gemeinsam ein.",
      "haustier,hund,katze,tier,vierbeiner,pet,haustiere,hunde",
      "policy"
    ),
    entry(
      null, "pets",
      "DORMERO ist bekannt dafür nahbar und offen zu sein. Unsere besondere Philosophie ist es, geretteten und schwer vermittelbaren Tieren eine zweite Chance zu geben. Jedes Tier, das in einem unserer Hotels lebt, wurde aus schwierigen Situationen gerettet. Wir arbeiten eng mit Tierschutzorganisationen zusammen. Haben Sie Fragen zur Unterbringung Ihres Tieres oder möchten sich erkundigen, welches Tier im Hotel auf Sie wartet, schreiben Sie uns an marketing@dormero.de oder rufen uns unter +49 30 20213223 an.",
      "tier,philosophie,gerettet,tierschutz,hotel-tier,maskottchen",
      "philosophy"
    ),

    // ── Free Standards ────────────────────────────────────────────
    entry(
      null, "free_standards",
      "Unsere Free Standards umfassen: exklusiv für DORMERO entwickelte Betten der Spitzenklasse, kostenfreies WLAN im ganzen Haus, eine kostenfreie Minibar am Anreisetag und professionelle Fitnessgeräte. Dazu leichtes Einchecken, schnelles Auschecken und Late Check-out bis 14:00 Uhr sonntags und an Feiertagen.",
      "kostenlos,gratis,inklusive,free,minibar,wlan,bett,standard",
    ),

    // ── Bed System ────────────────────────────────────────────────
    entry(
      null, "bed_system",
      "Unser exklusives DORMERO Schlafsystem besteht aus vier Lagen: 1. Molton-Auflage, 2. Unterbett, 3. Spezial-Matratze, 4. Massivholzkorpus. In diesen Betten fühlt sich auch eine kurze Nacht an wie ein ausgiebiger 8-Stunden-Schlaf.",
      "bett,matratze,schlafen,schlafsystem,betten",
    ),

    // ── WiFi ──────────────────────────────────────────────────────
    entry(
      null, "wifi",
      "Alle unsere Hotels sind mit kostenfreiem WLAN ausgestattet. Die Nutzung des Hotel-WLANs ist gratis und im ganzen Haus verfügbar.",
      "wlan,wifi,internet,online",
    ),

    // ── Smoking ───────────────────────────────────────────────────
    entry(
      null, "smoking",
      "Alle unsere Hotels sind Nichtraucherhotels. Rauchen ist in den Zimmern und im gesamten Gebäude verboten.",
      "rauchen,raucherzimmer,nichtraucher,smoking",
    ),

    // ── Groups & Events ───────────────────────────────────────────
    entry(
      null, "groups",
      "Für Gruppenreservierungen ab 10 Zimmern wenden Sie sich bitte mit Nennung des gewünschten Hotels per E-Mail an groups@dormero.de. Tagungs- und Eventanfragen schicken Sie bitte mit Nennung des gewünschten Hotels per E-Mail an event@dormero.de.",
      "gruppe,gruppen,gruppenreservierung,event,tagung,veranstaltung,10 zimmer",
    ),

    // ── Restaurant ────────────────────────────────────────────────
    entry(
      null, "restaurant",
      "Die Öffnungszeiten der Restaurants sowie die Kontaktdaten zur Tischreservierung (ausschließlich per Mail) entnehmen Sie der jeweiligen Hotelwebsite.",
      "restaurant,essen,abendessen,mittagessen,tisch,reservierung",
    ),

    // ── Wellness ──────────────────────────────────────────────────
    entry(
      null, "wellness",
      "Fast alle DORMERO Hotels verfügen über einen kostenfreien Wellness- und Fitnessbereich. Details entnehmen Sie gern der jeweiligen Hotelwebsite.",
      "wellness,spa,sauna,fitness,sport,schwimmen",
      "general"
    ),

    // ── Parking ───────────────────────────────────────────────────
    entry(
      null, "parking",
      "Auf der Seite des jeweiligen Hotels unter dem Menüpunkt ANFAHRT finden Sie alle wichtigen Informationen über die Parkmöglichkeiten und Kosten. Die Reservierung eines Parkplatzes bieten wir leider nicht an.",
      "parken,parkplatz,auto,garage,parkhaus,reservierung parkplatz",
      "general"
    ),

    // ── Lost & Found ──────────────────────────────────────────────
    entry(
      null, "lost_found",
      "Wenn Sie im Hotel etwas vergessen oder verloren haben, wenden Sie sich bitte an logis@dormero.de.",
      "vergessen,verloren,fundbüro,lost,found,gegenstand",
    ),
  ];

  // ═══════════════════════════════════════════════════════════════════
  // COBURG-SPECIFIC KNOWLEDGE
  // ═══════════════════════════════════════════════════════════════════

  const coburgEntries = [
    // ── Hotel Info ────────────────────────────────────────────────
    entry(
      COBURG_ID, "hotel_info",
      "Das DORMERO Hotel Coburg liegt in bester zentraler Lage nur wenige Minuten vom historischen Marktplatz und vom Schloss Ehrenburg entfernt. Schon Martin Luther sagte, dass Coburg ein 'überaus reizender Ort' sei. Das Hotel bietet 68 Zimmer in modern-elegantem Ambiente, drei Tagungsräume, eine Bar und einen großen Wellnessbereich. Entdecken Sie die Altstadt mit ihren historischen Gassen, Türmen, Kirchen und Schlössern. Die Veste Coburg gehört zu einer der größten Burganlagen Deutschlands.",
      "coburg,hotel,info,information,über,beschreibung,lage",
    ),

    // ── Contact ───────────────────────────────────────────────────
    entry(
      COBURG_ID, "contact",
      "DORMERO Hotel Coburg, Am Viktoriabrunnen 2, 96450 Coburg. Telefon: +49 9561 8760. E-Mail: coburg@dormero.de. Rezeptionszeiten: 13:00 bis 23:00 Uhr.",
      "kontakt,adresse,telefon,email,telefonnummer,coburg",
    ),

    // ── Ausstattung ───────────────────────────────────────────────
    entry(
      COBURG_ID, "hotel_info",
      "Ausstattung: 68 Zimmer, Frühstücksrestaurant, 3 Tagungsräume, 1 Bar (Victoria Bar), Wellness. Bitte beachten Sie: Das Hotel Coburg hat KEINEN Fitnessbereich.",
      "ausstattung,einrichtung,angebot,fitness,kein fitness",
      "facilities"
    ),

    // ── Rooms ─────────────────────────────────────────────────────
    entry(
      COBURG_ID, "rooms",
      "Das DORMERO Hotel Coburg bietet folgende Zimmerkategorien: DORMERO Einzelzimmer (18 m², Einzelbett), DORMERO Superior Einzelzimmer (18 m², Einzelbett), DORMERO Zimmer (18 m², Twin-Bett), DORMERO Komfort Zimmer (ca. 22 m², Doppel- oder Twin-Bett), DORMERO Superior Zimmer (ca. 25 m², Doppel- oder Twin-Bett, teilweise mit Balkon), DORMERO Deluxe Zimmer (ca. 25 m², Doppel- oder Twin-Bett, teilweise mit Balkon). Alle Zimmer verfügen über kostenfreies WLAN, Flatscreen TV, Schreibtisch und Minibar.",
      "zimmer,room,übernachtung,einzelzimmer,doppelzimmer,kategorie,zimmertyp",
      "overview"
    ),
    entry(
      COBURG_ID, "rooms",
      "DORMERO Einzelzimmer: 18 m², Einzelbett, Stadt- oder Hofblick, kostenfreies WLAN, Flatscreen TV, Schreibtisch und Stuhl, Bad mit Dusche, Fön und Kosmetikspiegel, Minibar, teilweise mit Safe.",
      "einzelzimmer,single,allein",
      "einzelzimmer", 1
    ),
    entry(
      COBURG_ID, "rooms",
      "DORMERO Komfort Zimmer: ca. 22 m², mit Doppel- oder Twin-Bett, Stadt- oder Hofblick, kostenfreies WLAN, Flatscreen TV, Schreibtisch, Sessel oder Sitzgruppe, Bad mit Dusche oder Badewanne, Fön und Kosmetikspiegel, Minibar, Safe.",
      "komfort,comfort,doppelzimmer",
      "komfort", 2
    ),
    entry(
      COBURG_ID, "rooms",
      "DORMERO Superior Zimmer: ca. 25 m², mit Doppel- oder Twin-Bett, Stadt- oder Hofblick, teilweise mit Balkon, kostenfreies WLAN, Flatscreen TV, großer Schreibtisch und bequeme Sitzgruppe, teilweise Schlafcouch, Bad mit Dusche oder Badewanne, Fön und Kosmetikspiegel, Minibar, Safe.",
      "superior,groß,größer,balkon",
      "superior", 3
    ),
    entry(
      COBURG_ID, "rooms",
      "DORMERO Deluxe Zimmer: ca. 25 m², mit Doppel- oder Twin-Bett, Stadt- oder Hofblick, teilweise mit Balkon, kostenfreies WLAN, Flatscreen TV, großer Schreibtisch und bequeme Sitzgruppe, teilweise Schlafcouch, Bad mit Dusche oder Badewanne, Fön und Kosmetikspiegel, Minibar, Safe.",
      "deluxe,premium,beste,luxus",
      "deluxe", 4
    ),

    // ── Breakfast ─────────────────────────────────────────────────
    entry(
      COBURG_ID, "breakfast",
      "Frühstück im DORMERO Hotel Coburg: 19,90 € pro Person, täglich von 06:30 bis 10:30 Uhr. Inklusive Heißgetränke, Wasser und Säfte. Vielfältiges Frühstücksbuffet von süß bis deftig. Für Frühaufsteher: DORMERO Frühstücksbox 'to go' für 9,90 € p.P. – bestellen Sie diese bequem bei Ihrer Anreise an der Rezeption. Die Frühstücksbox ist nicht zum Verzehr in den Restaurants.",
      "frühstück,breakfast,buffet,morgens,to go,frühstücksbox",
    ),

    // ── Bar ───────────────────────────────────────────────────────
    entry(
      COBURG_ID, "bar",
      "Victoria Bar: Erlesene Weine im entspannten Ambiente. Entdecken Sie das Sortiment in der kleinen, feinen Vinothek der Victoria Bar – ein exklusives Angebot an Weinen, Schaumweinen, Sherrys und Spirituosen. Eine bedachte Selektion von heimischen und internationalen Neuentdeckungen und Raritäten. Individuelle Beratung vor Ort, Geschenkverpackung auf Wunsch möglich. Nur Kartenzahlung.",
      "bar,wein,getränke,victoria bar,vinothek,trinken,abend",
    ),

    // ── Wellness ──────────────────────────────────────────────────
    entry(
      COBURG_ID, "wellness",
      "Der Wellnessbereich im DORMERO Hotel Coburg umfasst ca. 300 m²: Finnische Sauna, Bio Sauna, Dampfbad, Massagen, Fußbecken vor dem Kaminfeuer, Erlebnisduschen, Loungebereich mit Tee und Wasserangebot sowie Sommerterrasse und Raum der Ruhe. Work-Out-Raum mit Laufband, Upright Bike, Crosstrainer (jeweils mit Entertainment und USB-Anschluss), Hanteln und Kraftgeräten. Fitness: 7:00–21:00 Uhr. Die Sauna läuft nicht durchgängig und wird auf Nachfrage angeschaltet (Vorlaufzeit ca. 30 Min.). ACHTUNG: Der Wellnessbereich ist nicht barrierefrei und nur über Treppen erreichbar.",
      "wellness,spa,sauna,dampfbad,fitness,sport,massage,schwimmen,pool",
    ),
    entry(
      COBURG_ID, "wellness",
      "Massagen: Unsere Masseurin Qinghua Rödiger verwöhnt Sie mit hochwertigen Bio-Massageölen. Termin vereinbaren unter 0151-72505690 oder an der Rezeption unter 09561-8760.",
      "massage,masseurin,termin",
      "massage"
    ),

    // ── Parking ───────────────────────────────────────────────────
    entry(
      COBURG_ID, "parking",
      "Das DORMERO Hotel Coburg bietet 8 Parkplätze hinter dem Haus. Einfahrtshöhe: 3,2 m. Das Parkticket kostet 20 € am Tag. Eine Reservierung ist nicht möglich. In ca. 100 m Entfernung (Fußweg) bietet das Parkhaus Mauer weitere Parkplätze.",
      "parken,parkplatz,auto,parkhaus,stellplatz,garage",
    ),
    entry(
      COBURG_ID, "construction",
      "ACHTUNG Vollsperrung ab 23. März 2026: Von Montag, 23. März, bis voraussichtlich Freitag, 10. April 2026 wird der Bereich Hauptstraße/Ernstplatz sowie 'Am Viktoriabrunnen' vollständig gesperrt. Alle Bereiche sind jederzeit zu Fuß erreichbar. Auch während der Vollsperrung bleibt das Parkhaus Mauer erreichbar. Die Zufahrt erfolgt über die ausgeschilderte Umleitung: Mohrenstraße, Webergasse und Judengasse. Das Parkhaus Mauer ist aktuell nur über die Webergasse erreichbar.",
      "sperrung,baustelle,umleitung,gesperrt,vollsperrung,straße,zufahrt",
      "coburg_sperrung"
    ),

    // ── Directions ────────────────────────────────────────────────
    entry(
      COBURG_ID, "directions",
      "Anreise mit dem Auto aus Richtung Nürnberg: A73, Ausfahrt 11-Untersiemau, B289 Richtung Coburg-Süd, ca. 6 km geradeaus auf B4 Richtung Coburg, Ausfahrt CO-Ost/CO-Centrum, Bamberger Str. ca. 1,6 km, weiter Goethestraße, Ernstpl., nach ca. 400 m rechts auf Am Viktoriabrunnen. Hotel nach 70 m links.",
      "anfahrt,auto,navi,navigation,anreise,nürnberg,a73",
      "car_nuernberg"
    ),
    entry(
      COBURG_ID, "directions",
      "Anreise mit dem Zug: Der ICE-Bahnhof Coburg ist nur 750 Meter zu Fuß vom Hotel entfernt.",
      "zug,bahn,bahnhof,ice,öffentliche verkehrsmittel,öpnv",
      "train"
    ),
    entry(
      COBURG_ID, "directions",
      "Anreise mit dem Flugzeug: Der internationale Flughafen Nürnberg (NUE) ist ca. 105 km entfernt. Die Taxifahrt dauert ca. 1:15 Stunden.",
      "flugzeug,flughafen,fliegen,flug,nürnberg,nue",
      "plane"
    ),
    entry(
      COBURG_ID, "directions",
      "Anreise zum Kongresshaus Rosengarten Coburg: Das Kongresshaus ist 600 Meter zu Fuß vom Hotel entfernt. Hotel verlassen, ca. 50 m nach rechts, erste Möglichkeit links auf Ernstpl., nach 200 m rechts auf Ketschengasse, 170 m folgen, an der Kreuzung Schützenstraße liegt das Kongresshaus gegenüber.",
      "kongresshaus,rosengarten,kongress,messe,veranstaltung",
      "kongresshaus"
    ),

    // ── Meeting Rooms ─────────────────────────────────────────────
    entry(
      COBURG_ID, "meeting_rooms",
      "Das DORMERO Hotel Coburg verfügt über 3 Tagungsräume: Queen Victoria (103 m², bis 80 Personen, Tageslicht), Prinz Albert (55 m², bis 40 Personen, Tageslicht) und Lounge der Victoria Bar (20 m², 10–30 Personen). Alle Räume bieten kostenloses WLAN und verschiedene Bestuhlungsarten. Für ein persönliches Angebot: event.coburg@dormero.de.",
      "tagung,tagungsraum,meeting,konferenz,seminar,event,veranstaltung,raum",
      "overview"
    ),
    entry(
      COBURG_ID, "meeting_rooms",
      "Tagungsraum Queen Victoria: 103 m² (Höhe 2,90 m, 11,00 × 9,40 m), Tageslicht, bis 80 Personen, verschiedene Bestuhlungsarten, kostenloses WLAN.",
      "queen victoria,großer raum,80 personen",
      "queen_victoria", 1
    ),
    entry(
      COBURG_ID, "meeting_rooms",
      "Tagungsraum Prinz Albert: 55 m² (Höhe 2,90 m, 10,50 × 5,20 m), Tageslicht, bis 40 Personen, verschiedene Bestuhlungsarten, kostenloses WLAN.",
      "prinz albert,mittlerer raum,40 personen",
      "prinz_albert", 2
    ),
    entry(
      COBURG_ID, "meeting_rooms",
      "Lounge der Victoria Bar: 20 m² (Höhe 2,90 m, 6,90 × 2,90 m), 10–30 Personen, verschiedene Bestuhlungsarten, kostenloses WLAN.",
      "lounge,bar,kleiner raum,victoria bar",
      "lounge", 3
    ),

    // ── Meeting Packages ──────────────────────────────────────────
    entry(
      COBURG_ID, "meeting_packages",
      "Ganztagespauschale Coburg: 69 € pro Person (ab 10 Personen). Inkl. Tagungsraum, Equipment (Leinwand, Beamer, Flipchart, Blöcke & Stifte), Kaffeepause vormittags mit Kaffee, Tee, Obst und herzhaften Snacks, Mittagessen als Imbiss kalt/warm, unlimitiert Wasser und Apfelsaft, Kaffeepause nachmittags mit süßen Snacks, 2 Tagungsgetränke (je 0,2 l). Aufschlag für unlimitierte Tagungsgetränke: 6 € pro Person.",
      "ganztag,ganztagespauschale,tagungspauschale,preis,tagung,konferenz",
      "fullday"
    ),
    entry(
      COBURG_ID, "meeting_packages",
      "Halbtagespauschale Coburg: 54 € pro Person (ab 10 Personen). Inkl. Tagungsraum, Equipment, eine Kaffeepause (vormittags oder nachmittags), Mittagessen als Imbiss, unlimitiert Wasser und Apfelsaft, 2 Tagungsgetränke. Aufschlag für unlimitierte Tagungsgetränke: 6 € pro Person.",
      "halbtag,halbtagespauschale,halbtags",
      "halfday"
    ),

    // ── Hotel Pet ─────────────────────────────────────────────────
    entry(
      COBURG_ID, "hotel_pet",
      "Im DORMERO Hotel Coburg residiert Queen Victoria, eine Streifenköpfige Bartagame. Wie ihre Namensgeberin regiert sie über das Hotel und hat von ihrem Bio-Terrarium aus die gesamte Lobby im Blick. Sie ist wachsam, neugierig, zutraulich und immer gnädig zu ihren Untertanen. Als Bartagame hat sie ihren Ursprung im östlich zentralen Australien und bevorzugt halbtrockene Wälder.",
      "queen victoria,bartagame,tier,haustier,maskottchen,hotel-tier,reptil,lobby",
    ),

    // ── Fun Facts ─────────────────────────────────────────────────
    entry(
      COBURG_ID, "fun_facts",
      "Fun Facts DORMERO Hotel Coburg: Es gibt ein Zimmer mit der Nummer 13, was in Hotels unüblich ist. Zimmer 40 befindet sich im 4. Stock und Zimmer 80 im 2. Stock. Und: Wir hatten schon echte Könige im Haus!",
      "fun fact,lustig,besonders,wissen,interessant,13",
    ),
  ];

  // ═══════════════════════════════════════════════════════════════════
  // DESSAU-SPECIFIC KNOWLEDGE
  // ═══════════════════════════════════════════════════════════════════

  const dessauEntries = [
    // ── Hotel Info ────────────────────────────────────────────────
    entry(
      DESSAU_ID, "hotel_info",
      "Das DORMERO Hotel Dessau-Roßlau liegt unweit der lebhaften Fußgängerzone. Mit 152 Zimmern und 9 Tagungsräumen. Dessau-Roßlau hat zwei UNESCO-Welterbestätten und liegt inmitten einer ausgedehnten Auenlandschaft neben Elbe und Mulde. Das berühmte Bauhaus, die Hochschule für Gestaltung (1919–1933), hatte hier über sieben Jahre seinen Standort.",
      "dessau,hotel,info,information,über,beschreibung,lage,bauhaus",
    ),

    // ── Contact ───────────────────────────────────────────────────
    entry(
      DESSAU_ID, "contact",
      "DORMERO Hotel Dessau-Roßlau, Zerbster Straße 29, 06844 Dessau-Roßlau. E-Mail: dessau@dormero.de. Rezeptionszeiten: 13:00 bis 23:00 Uhr.",
      "kontakt,adresse,telefon,email,dessau",
    ),

    // ── Ausstattung ───────────────────────────────────────────────
    entry(
      DESSAU_ID, "hotel_info",
      "Ausstattung: 152 Zimmer, Frühstücksrestaurant, 9 Tagungsräume, 1 Bar (SONDERBAR), Wellness und Fitness.",
      "ausstattung,einrichtung,angebot",
      "facilities"
    ),

    // ── Rooms ─────────────────────────────────────────────────────
    entry(
      DESSAU_ID, "rooms",
      "Das DORMERO Hotel Dessau-Roßlau bietet zwei Zimmerkategorien: DORMERO Zimmer (23–33 m², wahlweise mit Französischem-, Twin- oder Queensize-Bett, Zimmer mit Verbindungstür verfügbar) und DORMERO Komfort Zimmer (24 m², mit Kingsize-Bett). Alle Zimmer: Bad mit Badewanne und Haartrockner, Nichtraucherzimmer, Schreibtisch, Sessel, kostenfreies WLAN, 55″ Flatscreen TV, kostenfreie Minibar, Safe.",
      "zimmer,room,übernachtung,kategorie,zimmertyp,doppelzimmer,einzelzimmer",
      "overview"
    ),
    entry(
      DESSAU_ID, "rooms",
      "DORMERO Zimmer Dessau: 23–33 m², wahlweise mit Französischem-, Twin- oder Queensize-Bett, Zimmer mit Verbindungstür verfügbar. Bad mit Badewanne und Haartrockner, Nichtraucherzimmer, Schreibtisch, Sessel, kostenfreies WLAN, 55″ Flatscreen TV, kostenfreie Minibar, Safe.",
      "standardzimmer,standard,normal",
      "standard", 1
    ),
    entry(
      DESSAU_ID, "rooms",
      "DORMERO Komfort Zimmer Dessau: 24 m², mit Kingsize-Bett. Bad mit Badewanne und Haartrockner, Nichtraucherzimmer, Schreibtisch, Sessel, kostenfreies WLAN, 55″ Flatscreen TV, kostenfreie Minibar, Safe.",
      "komfort,comfort,kingsize,king",
      "komfort", 2
    ),

    // ── Breakfast ─────────────────────────────────────────────────
    entry(
      DESSAU_ID, "breakfast",
      "Frühstück im DORMERO Hotel Dessau: 19,90 € pro Person, täglich von 06:30 bis 10:30 Uhr. Inklusive Heißgetränke, Wasser und Säfte. Vielfältiges Frühstücksbuffet von süß bis deftig. DORMERO Frühstücksbox 'to go' für 9,90 € p.P. – bestellen an der Rezeption bei Anreise. Die Frühstücksbox ist nicht zum Verzehr in den Restaurants.",
      "frühstück,breakfast,buffet,morgens,to go",
    ),

    // ── Brunch ────────────────────────────────────────────────────
    entry(
      DESSAU_ID, "brunch",
      "FeiertagsFRUNCH im DORMERO Hotel Dessau: Eine Kombination aus Frühstück und Lunch. Vielseitiges Frühstücksbuffet und warme Mittagsspeisen. Kaffeespezialitäten, Sekt, Tee und Säfte inklusive. 10:30–14:00 Uhr. 24,90 € (Kinder unter 6 Jahren kostenlos, Kinder bis 12 Jahre zahlen die Hälfte). Termine 2026: 05.04. Ostersonntag, 06.04. Ostermontag, 24.05. Pfingstsonntag, 25.05. Pfingstmontag, 25.12. 1. Weihnachtsfeiertag, 26.12. 2. Weihnachtsfeiertag. 01.01.2027 Neujahr. Reservierung unter fo.dessau@dormero.de.",
      "brunch,frunch,feiertag,ostern,pfingsten,weihnachten,neujahr,sonntag",
    ),

    // ── Bar ───────────────────────────────────────────────────────
    entry(
      DESSAU_ID, "bar",
      "SONDERBAR im DORMERO Hotel Dessau: Frech und erfrischend anders. Ungezwungene Atmosphäre – einchecken und mitten drin sein oder einfach nur so vorbeischauen. Öffnungszeiten: täglich 14:30–23:00 Uhr. Nur Kartenzahlung.",
      "bar,sonderbar,getränke,trinken,abend",
    ),

    // ── Wellness ──────────────────────────────────────────────────
    entry(
      DESSAU_ID, "wellness",
      "Sauna- und Fitnessbereich im DORMERO Hotel Dessau: Fitness 24 Stunden geöffnet. Sauna läuft nicht durchgängig und wird auf Nachfrage angeschaltet (Vorlaufzeit ca. 30 Min.). Es gibt einen Rooftop-Wellnessbereich mit Dachterrasse. Der Wellnessbereich ist nicht barrierefrei und nur über eine Treppe zu erreichen.",
      "wellness,spa,sauna,fitness,sport,dachterrasse,rooftop",
    ),

    // ── Parking ───────────────────────────────────────────────────
    entry(
      DESSAU_ID, "parking",
      "Das DORMERO Hotel Dessau bietet 36 Parkplätze. Das Parkticket kostet 12 € am Tag. Eine Reservierung ist nicht möglich. Einfahrtshöhe Parkplatz: 2,5 m, Parkhaus: 2,00 m. Sie erreichen das Parkhaus über den Parkplatz.",
      "parken,parkplatz,auto,garage,parkhaus,stellplatz",
    ),

    // ── Directions ────────────────────────────────────────────────
    entry(
      DESSAU_ID, "directions",
      "Anreise mit dem Auto aus Richtung Berlin: A9, Ausfahrt 10-Dessau-Ost, B185/107 Richtung Dessau-Ost/Oranienbaum, links auf Oranienbaumer Chaussee/B185, nach ca. 4,3 km rechts auf Friederikenplatz, weiter über Angerstraße, Reinickenstraße, Rabestraße, rechts auf Zerbster Straße. Hotel auf der linken Seite.",
      "anfahrt,auto,navi,navigation,anreise,berlin,a9",
      "car_berlin"
    ),
    entry(
      DESSAU_ID, "construction",
      "ACHTUNG: Vom 12.03. bis 24.04.2026 gibt es keine Anfahrt über die Zerbster Straße. Bitte nehmen Sie die Poststraße, um das Hotel zu erreichen.",
      "sperrung,baustelle,umleitung,gesperrt,zerbster straße,zufahrt",
      "dessau_sperrung"
    ),
    entry(
      DESSAU_ID, "directions",
      "Anreise mit dem Zug: Vom Hauptbahnhof Dessau rechts in Richtung Hausmannstraße, nach ca. 400 m links auf Hausmannstraße (ca. 210 m), rechts auf Johannisstraße, rechts Richtung Kavalierstraße, links auf Kavalierstraße, rechts auf Poststraße, links bleiben, nach ca. 170 m links auf Zerbster Straße. Hotel auf der linken Seite.",
      "zug,bahn,bahnhof,öffentliche verkehrsmittel,öpnv,hauptbahnhof",
      "train"
    ),
    entry(
      DESSAU_ID, "directions",
      "Anreise mit dem Flugzeug: Der Flughafen Leipzig/Halle (LEJ) ist ca. 60 km entfernt. Die Taxifahrt dauert ca. 40 Minuten.",
      "flugzeug,flughafen,fliegen,flug,leipzig,halle,lej",
      "plane"
    ),

    // ── Meeting Rooms ─────────────────────────────────────────────
    entry(
      DESSAU_ID, "meeting_rooms",
      "Das DORMERO Hotel Dessau verfügt über 9 Tagungsräume. Alle Räume heißen übersetzt 'Sau' in verschiedenen Sprachen: Seya (84 m², bis 70 Pers.), Cerda (85 m², bis 70 Pers.), Scrofa (94 m², bis 70 Pers.), Truie (91 m², bis 70 Pers.), Semear (46 m², bis 40 Pers.), Mu Zhu (48 m², bis 30 Pers.), Beej Bona (41 m², bis 25 Pers.), Svynomatka (41 m², bis 25 Pers.), Choiromitéra (41 m², bis 25 Pers.). Seya + Cerda können kombiniert werden (169 m², bis 180 Pers.), ebenso Scrofa + Truie (185 m², bis 150 Pers.). Alle Räume: kostenloses WLAN, verschiedene Bestuhlungsarten. Kontakt: event@dormero.de.",
      "tagung,tagungsraum,meeting,konferenz,seminar,event,veranstaltung,raum,sau",
      "overview"
    ),

    // ── Meeting Packages ──────────────────────────────────────────
    entry(
      DESSAU_ID, "meeting_packages",
      "Ganztagespauschale Dessau: 79 € pro Person (ab 10 Personen). Inkl. Tagungsraum, Equipment (Leinwand, Beamer, Flipchart, Blöcke & Stifte), Kaffeepause vormittags, internationales Lunchbuffet oder 3-Gang-Menü, unlimitiert Wasser und Apfelsaft, Kaffeepause nachmittags, 2 Tagungsgetränke. Aufschlag für unlimitierte Tagungsgetränke: 6 € pro Person.",
      "ganztag,ganztagespauschale,tagungspauschale,preis,tagung",
      "fullday"
    ),
    entry(
      DESSAU_ID, "meeting_packages",
      "Halbtagespauschale Dessau: 64 € pro Person (ab 10 Personen). Inkl. Tagungsraum, Equipment, eine Kaffeepause, internationales Lunchbuffet oder 3-Gang-Menü, unlimitiert Wasser und Apfelsaft, 2 Tagungsgetränke. Aufschlag für unlimitierte Tagungsgetränke: 6 € pro Person.",
      "halbtag,halbtagespauschale,halbtags",
      "halfday"
    ),

    // ── Hotel Pet ─────────────────────────────────────────────────
    entry(
      DESSAU_ID, "hotel_pet",
      "Im DORMERO Hotel Dessau lebt Kater Elvis. Nachdem wir erfahren haben, dass unser Kumpel Elvis von einem Stammgast ins Tierheim musste, haben wir nicht lange gezögert und ihn direkt adoptiert und in unsere DORMERO Familie aufgenommen. Er ist ein richtig stattlicher Kater, der gern unsere Gäste umgarnt, um sich Streicheleinheiten abzuholen. Der King of Rock'n'Roll lebt!",
      "elvis,kater,katze,tier,haustier,maskottchen,hotel-tier",
    ),

    // ── Fun Facts ─────────────────────────────────────────────────
    entry(
      DESSAU_ID, "fun_facts",
      "Fun Facts DORMERO Hotel Dessau: Es gibt einen Rooftop-Wellnessbereich mit Dachterrasse. Alle 9 Tagungsräume heißen übersetzt 'Sau' in verschiedenen Sprachen. Der King of Rock'n'Roll lebt – Hauskater Elvis begrüßt die Gäste.",
      "fun fact,lustig,besonders,wissen,interessant,sau,dachterrasse",
    ),
  ];

  // ═══════════════════════════════════════════════════════════════════
  // INSERT ALL ENTRIES
  // ═══════════════════════════════════════════════════════════════════

  const allEntries = [...chainEntries, ...coburgEntries, ...dessauEntries];
  // Insert in batches to avoid SQLite variable limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
    await db.insert(knowledgeEntries).values(allEntries.slice(i, i + BATCH_SIZE));
  }

  console.log("Seed completed successfully.");
  console.log(`  Hotels: 2 (Coburg, Dessau)`);
  console.log(`  Knowledge entries: ${allEntries.length} total`);
  console.log(`    Chain-wide: ${chainEntries.length}`);
  console.log(`    Coburg: ${coburgEntries.length}`);
  console.log(`    Dessau: ${dessauEntries.length}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
