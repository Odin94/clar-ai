import { getDb } from "./index.js";
import { hotels, knowledgeEntries, calls, callTranscripts, callFeedback } from "./schema.js";

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

  // ═══════════════════════════════════════════════════════════════════
  // SAMPLE CALL LOGS
  // ═══════════════════════════════════════════════════════════════════

  await db.delete(callFeedback);
  await db.delete(callTranscripts);
  await db.delete(calls);

  const AGENT_ID = "agent-viktoria-prod";

  // Helper: timestamp relative to now (negative = past)
  const hoursAgo = (h: number) => Math.floor((Date.now() - h * 3600_000) / 1000);

  const sampleCalls = [
    // ── Call 1: Parking question Coburg – successful, high rating ───
    {
      call: {
        id: "conv_sample_001",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(2),
        duration: 95,
        summary: "Gast fragte nach Parkmöglichkeiten am DORMERO Hotel Coburg. Informationen zu 8 Parkplätzen (20 EUR/Tag) und Parkhaus Mauer bereitgestellt. Hinweis auf aktuelle Vollsperrung gegeben.",
        callSuccessful: "success",
        messageCount: 8,
        costCredits: 0.12,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(1.9),
        hotelMentioned: "DORMERO Hotel Coburg",
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Hallo, ich wollte fragen, wie das mit dem Parken in Coburg aussieht?", time: 4 },
        { role: "agent", message: "Einen Moment bitte, ich schaue das gerne für Sie nach.", time: 9 },
        { role: "agent", message: "Das DORMERO Hotel Coburg bietet 8 Parkplätze hinter dem Haus mit einer Einfahrtshöhe von 3,2 Metern. Das Parkticket kostet 20 Euro am Tag, eine Reservierung ist leider nicht möglich. Alternativ gibt es das Parkhaus Mauer in etwa 100 Metern Entfernung.", time: 15 },
        { role: "user", message: "Gut zu wissen. Gibt es da gerade irgendwelche Einschränkungen?", time: 30 },
        { role: "agent", message: "Ja, wichtiger Hinweis: Vom 23. März bis voraussichtlich 10. April 2026 ist der Bereich Am Viktoriabrunnen vollständig gesperrt. Das Parkhaus Mauer bleibt aber erreichbar, die Zufahrt erfolgt über die Umleitung Mohrenstraße, Webergasse und Judengasse.", time: 35 },
        { role: "user", message: "Super, vielen Dank für die Info!", time: 55 },
        { role: "agent", message: "Sehr gerne! Auf einer Skala von 1 bis 5, wie zufrieden waren Sie mit unserem Gespräch heute?", time: 58 },
        { role: "user", message: "Ich würde eine 5 geben, sehr hilfreich!", time: 65 },
        { role: "agent", message: "Vielen Dank für die tolle Bewertung! Ich wünsche Ihnen eine angenehme Anreise. Auf Wiederhören!", time: 70 },
      ],
      feedback: { rating: 5, comment: "Sehr hilfreich, alle Fragen direkt beantwortet.", source: "voice" as const },
    },

    // ── Call 2: Room inquiry Dessau – successful, good rating ────────
    {
      call: {
        id: "conv_sample_002",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(5),
        duration: 120,
        summary: "Gast erkundigte sich nach Zimmertypen im DORMERO Hotel Dessau. Standard- und Komfort-Zimmer vorgestellt. Gast wurde an die Online-Buchung verwiesen.",
        callSuccessful: "success",
        messageCount: 10,
        costCredits: 0.15,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(4.9),
        hotelMentioned: "DORMERO Hotel Dessau-Rosslau",
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Guten Tag, ich interessiere mich für ein Zimmer in Dessau. Was gibt es denn da für Möglichkeiten?", time: 5 },
        { role: "agent", message: "Gerne schaue ich das für Sie nach.", time: 12 },
        { role: "agent", message: "Das DORMERO Hotel Dessau bietet zwei Zimmerkategorien: Das DORMERO Zimmer mit 23 bis 33 Quadratmetern, wahlweise mit Französischem-, Twin- oder Queensize-Bett. Und das DORMERO Komfort Zimmer mit 24 Quadratmetern und Kingsize-Bett. Alle Zimmer haben Badewanne, 55-Zoll-Flatscreen, kostenfreie Minibar und WLAN.", time: 18 },
        { role: "user", message: "Das Komfort-Zimmer klingt gut. Was kostet das denn?", time: 40 },
        { role: "agent", message: "Die tagesaktuellen Zimmerpreise können Sie auf unserer Website dormero.de über die Suchen-und-Buchen-Funktion einsehen. Die Preise richten sich nach Auslastung und sind pro Zimmer, exklusive Frühstück.", time: 45 },
        { role: "user", message: "Okay, und kann man Frühstück dazu buchen?", time: 60 },
        { role: "agent", message: "Ja, das Frühstück kostet 19,90 Euro pro Person und wird täglich von 6:30 bis 10:30 Uhr angeboten. Es ist ein vielfältiges Buffet mit Heißgetränken, Wasser und Säften inklusive.", time: 65 },
        { role: "user", message: "Perfekt, dann buche ich online. Danke!", time: 80 },
        { role: "agent", message: "Sehr gerne! Bevor wir auflegen — auf einer Skala von 1 bis 5, wie zufrieden waren Sie?", time: 85 },
        { role: "user", message: "Eine 4, war gut!", time: 90 },
        { role: "agent", message: "Vielen Dank! Ich wünsche Ihnen einen wunderbaren Aufenthalt in Dessau. Auf Wiederhören!", time: 93 },
      ],
      feedback: { rating: 4, comment: null, source: "voice" as const },
    },

    // ── Call 3: Pet policy – chain-wide, no specific hotel ──────────
    {
      call: {
        id: "conv_sample_003",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(8),
        duration: 75,
        summary: "Gast fragte, ob Haustiere in DORMERO Hotels erlaubt sind. Kostenfreie Haustier-Mitnahme bestätigt. Gast war sehr erfreut.",
        callSuccessful: "success",
        messageCount: 6,
        costCredits: 0.09,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(7.8),
        hotelMentioned: null,
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Hallo, ich habe einen kleinen Hund. Darf ich den mitbringen ins Hotel?", time: 4 },
        { role: "agent", message: "Aber natürlich! Bei DORMERO checkt Ihr Haustier gratis mit ein. Geben Sie diese Information einfach bei der Reservierung an und checken Sie gemeinsam ein.", time: 10 },
        { role: "user", message: "Oh toll, das ist ja super! Das gibt es nicht überall.", time: 25 },
        { role: "agent", message: "Das freut mich! DORMERO ist bekannt dafür, tierfreundlich zu sein. Jedes unserer Hotels hat sogar ein eigenes Haustier, das aus schwierigen Situationen gerettet wurde. Darf ich sonst noch etwas für Sie tun?", time: 30 },
        { role: "user", message: "Nein, das war alles, vielen Dank!", time: 45 },
        { role: "agent", message: "Wie zufrieden waren Sie mit unserem Gespräch auf einer Skala von 1 bis 5?", time: 48 },
        { role: "user", message: "5! Sehr freundlich.", time: 52 },
        { role: "agent", message: "Herzlichen Dank! Wir freuen uns auf Sie und Ihren Vierbeiner. Auf Wiederhören!", time: 55 },
      ],
      feedback: { rating: 5, comment: "Sehr freundlich und tierlieb!", source: "voice" as const },
    },

    // ── Call 4: Complaint about noise – Coburg ──────────────────────
    {
      call: {
        id: "conv_sample_004",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(12),
        duration: 180,
        summary: "Gast beschwerte sich über Lärm durch Bauarbeiten vor dem DORMERO Hotel Coburg. Hinweis auf die aktuelle Vollsperrung gegeben und Entschuldigung ausgesprochen. Gast wurde an das Hotel direkt verwiesen.",
        callSuccessful: "failure",
        messageCount: 12,
        costCredits: 0.22,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(11.8),
        hotelMentioned: "DORMERO Hotel Coburg",
        complaintCategory: "Lärm",
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Ja hallo, ich bin gerade im Hotel in Coburg und es ist unglaublich laut hier wegen der Baustelle draußen. Ich kann nicht schlafen!", time: 4 },
        { role: "agent", message: "Das tut mir sehr leid zu hören! Ich verstehe Ihre Frustration. Lassen Sie mich kurz nachschauen, was dort aktuell passiert.", time: 15 },
        { role: "agent", message: "Tatsächlich gibt es aktuell eine Vollsperrung im Bereich Hauptstraße und Am Viktoriabrunnen für Bauarbeiten, vom 23. März bis voraussichtlich 10. April 2026. Ich entschuldige mich vielmals für die Unannehmlichkeiten.", time: 22 },
        { role: "user", message: "Das ist ja schön und gut, aber ich habe 20 Euro für den Parkplatz bezahlt und kann nicht mal richtig schlafen. Das hätte man bei der Buchung sagen können!", time: 45 },
        { role: "agent", message: "Sie haben völlig recht, und ich verstehe Ihren Ärger. Leider kann ich von hier aus keine Kompensation veranlassen, aber ich empfehle Ihnen dringend, sich direkt an die Rezeption zu wenden. Das Team vor Ort kann Ihnen sicher eine Lösung anbieten.", time: 55 },
        { role: "user", message: "Können die mir ein anderes Zimmer geben, weiter weg von der Straße?", time: 75 },
        { role: "agent", message: "Das wäre sicherlich eine Möglichkeit — die Rezeption kann prüfen, ob ein Zimmer mit Hofblick verfügbar ist. Sprechen Sie das Team direkt darauf an, die sind von 13 bis 23 Uhr vor Ort oder telefonisch unter 09561-8760 erreichbar.", time: 80 },
        { role: "user", message: "Na gut, mache ich. Danke.", time: 100 },
        { role: "agent", message: "Nochmals, es tut mir wirklich leid. Darf ich Sie noch kurz fragen — auf einer Skala von 1 bis 5, wie zufrieden waren Sie mit diesem Gespräch?", time: 105 },
        { role: "user", message: "Na ja, Sie können ja nichts dafür. Ich gebe eine 3.", time: 115 },
        { role: "agent", message: "Vielen Dank für Ihre Rückmeldung. Ich hoffe, die Rezeption kann Ihnen schnell weiterhelfen. Auf Wiederhören!", time: 120 },
      ],
      feedback: { rating: 3, comment: "Baulärm ist unerträglich. Viktoria war nett, konnte aber nicht direkt helfen.", source: "voice" as const },
    },

    // ── Call 5: Meeting rooms Dessau – successful ───────────────────
    {
      call: {
        id: "conv_sample_005",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(24),
        duration: 150,
        summary: "Firmenkunde erkundigte sich nach Tagungsräumen im DORMERO Hotel Dessau für 50 Personen. Räume Seya und Cerda vorgestellt, Ganztagespauschale (79 EUR) erklärt. An event@dormero.de verwiesen.",
        callSuccessful: "success",
        messageCount: 10,
        costCredits: 0.18,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(23.8),
        hotelMentioned: "DORMERO Hotel Dessau-Rosslau",
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Guten Tag, ich plane eine Firmenveranstaltung für circa 50 Personen in Dessau. Haben Sie da passende Räume?", time: 5 },
        { role: "agent", message: "Selbstverständlich! Lassen Sie mich die Tagungsmöglichkeiten in Dessau für Sie nachschlagen.", time: 13 },
        { role: "agent", message: "Das DORMERO Hotel Dessau verfügt über 9 Tagungsräume. Für 50 Personen eignen sich besonders die Räume Seya mit 84 Quadratmetern oder Cerda mit 85 Quadratmetern, beide für bis zu 70 Personen. Falls Sie mehr Platz benötigen, können Seya und Cerda zu einem Raum mit 169 Quadratmetern kombiniert werden.", time: 20 },
        { role: "user", message: "Das klingt gut. Was kostet das mit Verpflegung?", time: 45 },
        { role: "agent", message: "Die Ganztagespauschale beträgt 79 Euro pro Person ab 10 Personen. Darin enthalten sind Tagungsraum, Equipment, Kaffeepausen vormittags und nachmittags, ein internationales Lunchbuffet oder 3-Gang-Menü und 2 Tagungsgetränke. Für unlimitierte Getränke kommt ein Aufschlag von 6 Euro pro Person hinzu.", time: 50 },
        { role: "user", message: "Sehr gut. An wen wende ich mich da am besten?", time: 75 },
        { role: "agent", message: "Für ein persönliches Angebot schicken Sie bitte eine E-Mail an event@dormero.de und nennen Sie dabei das DORMERO Hotel Dessau sowie Ihre Wünsche. Das Event-Team erstellt Ihnen dann ein maßgeschneidertes Angebot.", time: 80 },
        { role: "user", message: "Perfekt, das mache ich. Herzlichen Dank!", time: 100 },
        { role: "agent", message: "Gerne! Kurze Frage noch — wie zufrieden waren Sie mit unserem Gespräch, von 1 bis 5?", time: 103 },
        { role: "user", message: "Ganz klar eine 5!", time: 108 },
        { role: "agent", message: "Wunderbar, vielen Dank! Ich wünsche Ihnen eine erfolgreiche Veranstaltung. Auf Wiederhören!", time: 111 },
      ],
      feedback: { rating: 5, comment: "Sehr kompetente Auskunft zu den Tagungsräumen.", source: "voice" as const },
    },

    // ── Call 6: Check-in times – quick call, no rating given ────────
    {
      call: {
        id: "conv_sample_006",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(30),
        duration: 45,
        summary: "Gast fragte nach Check-in- und Check-out-Zeiten. Allgemeine Zeiten mitgeteilt. Gast hat kein Feedback gegeben.",
        callSuccessful: "success",
        messageCount: 6,
        costCredits: 0.06,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(29.5),
        hotelMentioned: null,
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Kurze Frage: Ab wann kann ich einchecken und bis wann muss ich auschecken?", time: 4 },
        { role: "agent", message: "Check-in ist ab 15 Uhr bis 23 Uhr möglich. Check-out bis 12 Uhr. Sonntags und an Feiertagen gibt es einen kostenfreien Late Check-out bis 14 Uhr.", time: 10 },
        { role: "user", message: "Und wenn ich erst nach 23 Uhr ankomme?", time: 22 },
        { role: "agent", message: "Bei Anreise nach 23 Uhr wenden Sie sich bitte frühzeitig per E-Mail an reservierung@dormero.de, damit alles für Sie vorbereitet werden kann.", time: 26 },
        { role: "user", message: "Alles klar, danke. Tschüss!", time: 35 },
        { role: "agent", message: "Gerne! Auf Wiederhören!", time: 37 },
      ],
      feedback: null,
    },

    // ── Call 7: Wellness Coburg – successful ────────────────────────
    {
      call: {
        id: "conv_sample_007",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(36),
        duration: 110,
        summary: "Gast erkundigte sich nach dem Wellnessbereich und Massageangebot im DORMERO Hotel Coburg. Spa-Details und Kontakt der Masseurin weitergegeben.",
        callSuccessful: "success",
        messageCount: 8,
        costCredits: 0.14,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(35.5),
        hotelMentioned: "DORMERO Hotel Coburg",
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Hallo, ich komme nächste Woche nach Coburg und wollte wissen, ob es dort einen Wellness-Bereich gibt.", time: 4 },
        { role: "agent", message: "Aber natürlich! Lassen Sie mich die Details nachschlagen.", time: 12 },
        { role: "agent", message: "Der Wellnessbereich im DORMERO Hotel Coburg umfasst circa 300 Quadratmeter mit Finnischer Sauna, Bio-Sauna, Dampfbad, Erlebnisduschen und einem Loungebereich. Bitte beachten Sie, dass die Sauna nicht durchgängig läuft und auf Nachfrage angeschaltet wird, mit circa 30 Minuten Vorlaufzeit.", time: 18 },
        { role: "user", message: "Gibt es auch Massagen?", time: 40 },
        { role: "agent", message: "Ja! Die Masseurin Qinghua Rödiger verwöhnt Sie mit hochwertigen Bio-Massageölen. Sie können telefonisch einen Termin vereinbaren unter 0151-72505690 oder direkt an der Rezeption unter 09561-8760.", time: 45 },
        { role: "user", message: "Wunderbar, da freue ich mich drauf. Danke schön!", time: 65 },
        { role: "agent", message: "Sehr gerne! Wie zufrieden waren Sie mit unserem Gespräch, auf einer Skala von 1 bis 5?", time: 68 },
        { role: "user", message: "4, sehr informativ!", time: 75 },
        { role: "agent", message: "Vielen Dank! Ich wünsche Ihnen einen erholsamen Aufenthalt in Coburg. Auf Wiederhören!", time: 78 },
      ],
      feedback: { rating: 4, comment: "Gute Infos zum Wellness, hätte mir noch Preise gewünscht.", source: "voice" as const },
    },

    // ── Call 8: Cancellation policy – quick, somewhat unhappy ───────
    {
      call: {
        id: "conv_sample_008",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(48),
        duration: 90,
        summary: "Gast wollte eine Fancy-Saver-Buchung stornieren. Wurde informiert, dass diese Rate nicht stornierbar ist. Gast war enttäuscht, wurde an Reservierung verwiesen.",
        callSuccessful: "failure",
        messageCount: 8,
        costCredits: 0.11,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(47.5),
        hotelMentioned: null,
        complaintCategory: "Stornierung",
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Hallo, ich muss leider meine Buchung stornieren. Geht das noch?", time: 5 },
        { role: "agent", message: "Das kommt auf Ihren gebuchten Tarif an. Wissen Sie, welchen Tarif Sie gebucht haben?", time: 10 },
        { role: "user", message: "Ich glaube, das war der günstige Tarif, Fancy irgendwas.", time: 18 },
        { role: "agent", message: "Die Fancy Saver Rate ist leider nicht änder- oder stornierbar. Die Smart Rate hingegen wäre flexibel stornierbar bis 24 Stunden vor Anreise gewesen.", time: 23 },
        { role: "user", message: "Das ist ärgerlich. Kann man da gar nichts machen?", time: 38 },
        { role: "agent", message: "Ich verstehe Ihren Ärger. Leider kann ich von hier aus keine Ausnahmen machen, aber ich empfehle Ihnen, sich direkt an unsere Reservierungsabteilung zu wenden unter +49 30 20213300 oder per E-Mail an reservierung@dormero.de. Vielleicht lässt sich im Einzelfall eine Lösung finden.", time: 42 },
        { role: "user", message: "Na gut, versuche ich mal. Danke trotzdem.", time: 60 },
        { role: "agent", message: "Wie zufrieden waren Sie mit unserem Gespräch, von 1 bis 5?", time: 63 },
        { role: "user", message: "Hmm, eine 2. Ist nicht Ihre Schuld, aber das Ergebnis ist enttäuschend.", time: 68 },
        { role: "agent", message: "Das verstehe ich. Vielen Dank für Ihre ehrliche Rückmeldung. Ich drücke Ihnen die Daumen bei der Reservierungsabteilung. Auf Wiederhören!", time: 72 },
      ],
      feedback: { rating: 2, comment: "Konnte meine Buchung nicht stornieren. Fancy Saver ist eine Falle.", source: "voice" as const },
    },

    // ── Call 9: Breakfast Dessau with brunch question – successful ───
    {
      call: {
        id: "conv_sample_009",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(60),
        duration: 85,
        summary: "Gast erkundigte sich nach Frühstück und FeiertagsFRUNCH im DORMERO Hotel Dessau. Preise und Termine für Osterbrunch mitgeteilt.",
        callSuccessful: "success",
        messageCount: 8,
        costCredits: 0.10,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(59.5),
        hotelMentioned: "DORMERO Hotel Dessau-Rosslau",
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Hallo, wir überlegen, über Ostern nach Dessau zu fahren. Gibt es da was Besonderes zum Frühstück?", time: 5 },
        { role: "agent", message: "Oh ja! Lassen Sie mich nachschauen, was Dessau zu Ostern anbietet.", time: 13 },
        { role: "agent", message: "An Ostern bietet das DORMERO Hotel Dessau den FeiertagsFRUNCH an — eine Kombination aus Frühstück und Lunch. Von 10:30 bis 14 Uhr mit vielseitigem Frühstücksbuffet und warmen Mittagsspeisen, inklusive Kaffeespezialitäten, Sekt, Tee und Säfte. Der Preis beträgt 24,90 Euro, Kinder unter 6 Jahren sind kostenlos, bis 12 Jahre zahlen die Hälfte.", time: 20 },
        { role: "user", message: "Das klingt toll! An welchen Tagen genau?", time: 45 },
        { role: "agent", message: "Am 5. April, Ostersonntag, und am 6. April, Ostermontag. Reservierung unter fo.dessau@dormero.de.", time: 50 },
        { role: "user", message: "Super, das werden wir buchen! Vielen Dank!", time: 62 },
        { role: "agent", message: "Sehr schön! Wie zufrieden waren Sie mit unserem Gespräch, von 1 bis 5?", time: 65 },
        { role: "user", message: "5, absolut!", time: 70 },
        { role: "agent", message: "Wunderbar! Frohe Ostern und auf Wiederhören!", time: 73 },
      ],
      feedback: { rating: 5, comment: "Toller Tipp mit dem Osterbrunch!", source: "voice" as const },
    },

    // ── Call 10: Failed call – connection issues ────────────────────
    {
      call: {
        id: "conv_sample_010",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(72),
        duration: 15,
        summary: "Anruf mit Verbindungsproblemen. Gast war kaum verständlich, Gespräch wurde abgebrochen.",
        callSuccessful: "failure",
        messageCount: 3,
        costCredits: 0.02,
        terminationReason: "unknown",
        syncedAt: hoursAgo(71.5),
        hotelMentioned: null,
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Hallo... ich... [unverständlich]... Hotel...", time: 5 },
        { role: "agent", message: "Leider kann ich Sie sehr schlecht verstehen. Könnten Sie das bitte wiederholen?", time: 10 },
      ],
      feedback: null,
    },

    // ── Call 11: Elvis the cat – fun inquiry ────────────────────────
    {
      call: {
        id: "conv_sample_011",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(96),
        duration: 70,
        summary: "Gast fragte nach dem Hotelkater Elvis im DORMERO Hotel Dessau. Geschichte des adoptierten Katers erzählt. Gast war begeistert.",
        callSuccessful: "success",
        messageCount: 6,
        costCredits: 0.08,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(95.5),
        hotelMentioned: "DORMERO Hotel Dessau-Rosslau",
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Hi! Ich habe gehört, dass im DORMERO Dessau eine Katze lebt. Stimmt das?", time: 4 },
        { role: "agent", message: "Ja, das stimmt! Lassen Sie mich Ihnen von unserem Elvis erzählen.", time: 10 },
        { role: "agent", message: "Im DORMERO Hotel Dessau lebt Kater Elvis. Er musste von einem Stammgast ins Tierheim, und wir haben ihn direkt adoptiert und in unsere DORMERO Familie aufgenommen. Er ist ein richtig stattlicher Kater, der gern die Gäste umgarnt, um sich Streicheleinheiten abzuholen.", time: 15 },
        { role: "user", message: "Ach wie süß! Das ist ja eine tolle Geschichte. Dann freue ich mich, ihn kennenzulernen!", time: 35 },
        { role: "agent", message: "Elvis freut sich bestimmt auch! Kann ich Ihnen sonst noch weiterhelfen?", time: 40 },
        { role: "user", message: "Nein, das war alles. Danke und tschüss!", time: 48 },
        { role: "agent", message: "Auf Wiederhören und bis bald!", time: 50 },
      ],
      feedback: { rating: 5, comment: null, source: "voice" as const },
    },

    // ── Call 12: Group reservation inquiry ──────────────────────────
    {
      call: {
        id: "conv_sample_012",
        agentId: AGENT_ID,
        status: "done",
        startTime: hoursAgo(120),
        duration: 60,
        summary: "Gast fragte nach Gruppenreservierung für 15 Zimmer. An groups@dormero.de verwiesen.",
        callSuccessful: "success",
        messageCount: 6,
        costCredits: 0.07,
        terminationReason: "user_hangup",
        syncedAt: hoursAgo(119),
        hotelMentioned: null,
        complaintCategory: null,
      },
      transcript: [
        { role: "agent", message: "Guten Tag und willkommen bei DORMERO Hotels! Mein Name ist Viktoria. Wie kann ich Ihnen behilflich sein?", time: 0 },
        { role: "user", message: "Guten Tag, wir brauchen 15 Zimmer für eine Firmenreise. Wie läuft das?", time: 5 },
        { role: "agent", message: "Für Gruppenreservierungen ab 10 Zimmern wenden Sie sich bitte per E-Mail an groups@dormero.de. Nennen Sie dabei bitte das gewünschte Hotel und Ihre Wunschtermine. Unser Gruppenteam erstellt Ihnen dann ein individuelles Angebot.", time: 12 },
        { role: "user", message: "Gibt es da Gruppenrabatte?", time: 28 },
        { role: "agent", message: "Die genauen Konditionen hängen von Hotel, Zeitraum und Zimmerzahl ab. Das Gruppenteam kann Ihnen da ein maßgeschneidertes Angebot machen. Schreiben Sie einfach Ihre Anforderungen in die E-Mail.", time: 32 },
        { role: "user", message: "Okay, mache ich. Danke!", time: 42 },
        { role: "agent", message: "Wie zufrieden waren Sie mit diesem Gespräch, von 1 bis 5?", time: 45 },
        { role: "user", message: "4, danke!", time: 48 },
        { role: "agent", message: "Vielen Dank! Viel Erfolg bei der Planung. Auf Wiederhören!", time: 50 },
      ],
      feedback: { rating: 4, comment: null, source: "voice" as const },
    },
  ];

  // Insert calls, transcripts, and feedback
  for (const sample of sampleCalls) {
    await db.insert(calls).values(sample.call);

    if (sample.transcript.length > 0) {
      await db.insert(callTranscripts).values(
        sample.transcript.map((t, i) => ({
          id: `${sample.call.id}-msg-${String(i).padStart(3, "0")}`,
          callId: sample.call.id,
          role: t.role,
          message: t.message,
          timeInCallSecs: t.time,
          sortOrder: i,
        }))
      );
    }

    if (sample.feedback) {
      await db.insert(callFeedback).values({
        id: `${sample.call.id}-fb`,
        callId: sample.call.id,
        rating: sample.feedback.rating,
        comment: sample.feedback.comment,
        source: sample.feedback.source,
        createdAt: (sample.call.startTime + sample.call.duration) * 1000,
        updatedAt: (sample.call.startTime + sample.call.duration) * 1000,
      });
    }
  }

  const ratedCalls = sampleCalls.filter(s => s.feedback?.rating).length;
  const totalMessages = sampleCalls.reduce((sum, s) => sum + s.transcript.length, 0);

  console.log("Seed completed successfully.");
  console.log(`  Hotels: 2 (Coburg, Dessau)`);
  console.log(`  Knowledge entries: ${allEntries.length} total`);
  console.log(`    Chain-wide: ${chainEntries.length}`);
  console.log(`    Coburg: ${coburgEntries.length}`);
  console.log(`    Dessau: ${dessauEntries.length}`);
  console.log(`  Calls: ${sampleCalls.length} (${ratedCalls} with ratings, ${totalMessages} transcript messages)`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
