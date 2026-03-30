import { eq, like, or, sql, isNull, inArray } from "drizzle-orm"
import type { getDb } from "@clarai/db"
import { hotels, knowledgeEntries } from "@clarai/db"

type DB = Awaited<ReturnType<typeof getDb>>

/**
 * Maps a free-text topic (from the voice agent) to one or more knowledge
 * entry topics in our DB. Handles both German and English terms since the
 * ElevenLabs agent may formulate in either language.
 */
function resolveTopics(topic: string): string[] {
    const t = topic.toLowerCase()

    const rules: [RegExp, string[]][] = [
        // Parking & directions
        [/park(en|ing|platz|haus|garage)|auto\b|stell/, ["parking", "construction"]],
        [/anfahr|anreis|navi|weg zum|wie komm|direction|route/, ["directions", "construction"]],
        [/sperrung|baustelle|umleitung|gesperrt/, ["construction"]],

        // Rooms
        [/zimmer|room|suite|einzel|doppel|komfort|superior|deluxe|king|queen|twin|bett|übernacht/, ["rooms"]],

        // Breakfast & dining
        [/frühstück|breakfast|morgen/, ["breakfast"]],
        [/brunch|frunch|feiertag.*(essen|buffet)/, ["brunch"]],
        [/restaurant|essen|abendessen|mittag|küche|dining/, ["restaurant"]],
        [/bar\b|wein|cocktail|getränk|trinken|vinothek|sonderbar/, ["bar"]],

        // Wellness & fitness
        [/wellness|spa|sauna|dampf|massage/, ["wellness"]],
        [/fitness|sport|gym|training|workout/, ["wellness", "fitness"]],

        // Meetings & events
        [/tagun|meeting|konferenz|seminar|event|veranstalt/, ["meeting_rooms", "meeting_packages"]],

        // Policies
        [/haustier|hund|katze|tier(?!garten)|pet\b|vierbeiner/, ["pets", "hotel_pet"]],
        [/hotel.?tier|maskott|queen victoria|elvis|bartagame/, ["hotel_pet"]],
        [/storni|cancel|absag|umbuch/, ["cancellation"]],
        [/check.?in|check.?out|anreise.?zeit|abreise|ein.*check|aus.*check|late.*check/, ["checkin"]],
        [/rauch|smok|nichtrauch/, ["smoking"]],
        [/zahl|bezahl|karte|bargeld|kredit|payment|rechnung|kostenübernahm/, ["payment"]],
        [/reservier|buch(en|ung)|book/, ["reservation"]],

        // Facilities & standards
        [/wlan|wifi|internet/, ["wifi"]],
        [/minibar|kostenlos|gratis|inklusiv|free.?standard/, ["free_standards"]],
        [/bett|matratze|schlaf(?!couch)/, ["bed_system"]],

        // Groups
        [/grupp|group|10 zimmer/, ["groups"]],

        // General info
        [/rezeption|empfang|öffnung/, ["reception", "contact"]],
        [/kontakt|adress|telefon|email|erreich/, ["contact"]],
        [/über.*hotel|hotel.*info|beschreib|ausstat|einricht/, ["hotel_info"]],
        [/verloren|vergessen|fundbüro|lost|found/, ["lost_found"]],
        [/fun.?fact|besonder|lustig|interessant|wussten/, ["fun_facts"]],
    ]

    for (const [pattern, topics] of rules) {
        if (pattern.test(t)) return topics
    }

    // Fallback: return broad info topics so the agent gets something useful
    return ["hotel_info", "contact", "reservation"]
}

export async function queryKnowledge(db: DB, hotelName: string | undefined, topic: string): Promise<string> {
    const topics = resolveTopics(topic)

    // ── Find hotel (optional) ─────────────────────────────────────────
    let hotel: typeof hotels.$inferSelect | undefined

    if (hotelName) {
        const pattern = `%${hotelName}%`
        const results = await db
            .select()
            .from(hotels)
            .where(or(like(hotels.name, pattern), like(hotels.city, pattern), like(hotels.slug, pattern)))
            .limit(1)
        hotel = results[0]

        if (!hotel) {
            console.warn(`[knowledge] Hotel nicht gefunden: "${hotelName}", topic="${topic}"`)
            return `Leider habe ich keine Informationen zu "${hotelName}" in unserer Wissensdatenbank. Bitte kontaktieren Sie das Hotel direkt oder unsere Reservierung unter +49 30 20213300.`
        }
    }

    // ── Query knowledge entries ───────────────────────────────────────
    // Fetch hotel-specific entries + chain-wide entries for the resolved topics
    const topicFilter = inArray(knowledgeEntries.topic, topics)
    const whereClause = hotel
        ? sql`(${knowledgeEntries.hotelId} = ${hotel.id} OR ${knowledgeEntries.hotelId} IS NULL) AND ${topicFilter}`
        : sql`${knowledgeEntries.hotelId} IS NULL AND ${topicFilter}`

    const entries = await db.select().from(knowledgeEntries).where(whereClause).orderBy(knowledgeEntries.sortOrder).limit(10)

    if (entries.length === 0) {
        // Try keyword-based fallback search
        const keywordResults = await keywordSearch(db, hotel?.id ?? null, topic)
        if (keywordResults.length > 0) {
            const answer = keywordResults.map((e) => e.content).join(" ")
            console.log(`[knowledge] OK (keyword fallback) – hotel="${hotel?.name ?? "alle"}", topic="${topic}"`)
            return answer
        }

        const hotelLabel = hotel ? hotel.name : "unseren Hotels"
        console.warn(`[knowledge] Keine Daten: hotel="${hotelLabel}", topic="${topic}"`)
        return `Zu "${topic}" habe ich leider keine spezifischen Informationen für ${hotelLabel}. Bitte wenden Sie sich an unsere Reservierung unter +49 30 20213300 oder per E-Mail an reservierung@dormero.de.`
    }

    // Prefer hotel-specific entries over chain-wide ones if both exist
    const hotelSpecific = entries.filter((e) => e.hotelId !== null)
    const chainWide = entries.filter((e) => e.hotelId === null)

    // If we have hotel-specific entries, prioritize them but still include
    // relevant chain-wide info (e.g., pet policy + hotel mascot)
    let selected: typeof entries
    if (hotelSpecific.length > 0) {
        // Include chain-wide entries only if they add different topics
        const coveredTopics = new Set(hotelSpecific.map((e) => e.topic))
        const additionalChain = chainWide.filter((e) => !coveredTopics.has(e.topic))
        selected = [...hotelSpecific, ...additionalChain]
    } else {
        selected = chainWide
    }

    // Deduplicate by content and cap for voice brevity
    const seen = new Set<string>()
    const unique = selected.filter((e) => {
        if (seen.has(e.content)) return false
        seen.add(e.content)
        return true
    })

    // For voice: limit to ~4 entries to keep answers concise
    const answer = unique
        .slice(0, 4)
        .map((e) => e.content)
        .join(" ")

    console.log(`[knowledge] OK – hotel="${hotel?.name ?? "alle"}", topic="${topic}", entries=${unique.length}`)
    return answer
}

/**
 * Keyword-based fallback: searches the keywords field for any word overlap
 * with the user's topic string.
 */
async function keywordSearch(db: DB, hotelId: string | null, topic: string): Promise<{ content: string }[]> {
    // Extract meaningful words (>= 3 chars) from the topic
    const words = topic
        .toLowerCase()
        .split(/[\s,;.!?]+/)
        .filter((w) => w.length >= 3)

    if (words.length === 0) return []

    // Build LIKE conditions for keywords field
    const conditions = words.map((w) => like(knowledgeEntries.keywords, `%${w}%`))

    const whereClause = hotelId
        ? sql`(${knowledgeEntries.hotelId} = ${hotelId} OR ${knowledgeEntries.hotelId} IS NULL) AND (${or(...conditions)})`
        : sql`${knowledgeEntries.hotelId} IS NULL AND (${or(...conditions)})`

    return db.select({ content: knowledgeEntries.content }).from(knowledgeEntries).where(whereClause).limit(3)
}
