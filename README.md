# Dormero Viktoria – Control Center

Voice AI control centre for Dormero Hotels. Viktoria handles Tier-1 guest inquiries; this repo provides the knowledge base, call log dashboard, and feedback loop.

---

## Quick Start

### Prerequisites
- Node.js 20+
- An [ElevenLabs](https://elevenlabs.io) account (free tier)
- [ngrok](https://ngrok.com) (only needed to connect ElevenLabs agent tools to your local server)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=./data/clarai.db
ELEVENLABS_API_KEY=<your key from elevenlabs.io/api-key>
ELEVENLABS_AGENT_ID=<agent id from ElevenLabs dashboard>
PORT=3001
```

### 3. Seed the database

Populates one hotel (Dormero Hotel Coburg) with facilities, room types, and chain-wide policies. Idempotent – safe to run multiple times.

```bash
npm run db:seed
```

### 4. Start the backend

```bash
npm run dev:server
```

Server starts at `http://localhost:3001`.

### 5. Start the frontend

```bash
npm run dev:web
```

UI available at `http://localhost:5173`.

---

## ElevenLabs Integration

### Expose the backend via ngrok

ElevenLabs needs a public URL to call your webhook tool and receive post-call webhooks.

```bash
ngrok http 3001
```

Copy the `https://...ngrok-free.app` URL.

### Configure the agent

In the ElevenLabs dashboard (or via API), configure the agent with:

**System prompt:**
```
You are Viktoria, the helpful virtual assistant for Dormero Hotels. You are the fancy, direct and helpful customer service agent handling inbound requests, reservations and complaints from customers. You use the tools at your disposal to access general Dormero knowledge and hotel details to provide factual answers. You keep your answers short to around 2-3 sentences max.
```

**Server tool – `get_hotel_info`:**
- Type: `webhook`
- Method: `POST`
- URL: `https://<your-ngrok-url>/api/knowledge/query`
- Description: "Look up hotel information, facilities, room types, or policies for a Dormero hotel"
- Request body schema:
  ```json
  {
    "type": "object",
    "properties": {
      "hotel_name": {
        "type": "string",
        "description": "Name or city of the hotel (e.g. 'Coburg', 'Dormero Hotel Berlin')"
      },
      "topic": {
        "type": "string",
        "description": "Topic to look up: parking, breakfast, pets, cancellation, check-in, wellness, wifi, rooms"
      }
    },
    "required": ["topic"]
  }
  ```

**Post-call webhook** (in agent settings → Workflows):
- URL: `https://<your-ngrok-url>/api/elevenlabs/webhook`
- This fires after every call and automatically persists call logs + any voice-collected feedback.

**Data Collection** (in agent settings → Analysis):
- Add field: `customer_rating` (Integer) – "Extract the customer's satisfaction rating on a 1–5 scale. Return null if not given."
- Add field: `customer_comment` (String) – "Extract the customer's feedback comment. Return null if not given."

---

## Running Tests

```bash
npm test --workspace=apps/server
```

42 tests across 4 suites:
- `knowledge.test.ts` – query logic (parking, policies, rooms, check-in, fallback)
- `calls.test.ts` – GET /api/calls (pagination, filters, sort) + GET /api/calls/:id
- `feedback.test.ts` – POST feedback (create, upsert, validation, 404)
- `webhook.test.ts` – ElevenLabs post-call webhook (persistence, transcripts, voice feedback, idempotency)

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/calls` | List calls. Params: `page`, `pageSize`, `status`, `search` |
| `GET` | `/api/calls/:id` | Call detail with transcript + feedback |
| `POST` | `/api/calls/:id/feedback` | Save rating (1–5) and/or comment |
| `POST` | `/api/sync` | Pull latest conversations from ElevenLabs |
| `POST` | `/api/knowledge/query` | Agent webhook tool – hotel knowledge lookup |
| `POST` | `/api/elevenlabs/webhook` | ElevenLabs post-call webhook receiver |

---

## Architecture Decisions

### Why a webhook tool instead of ElevenLabs' built-in Knowledge Base?

The built-in KB uses vector similarity search over documents — good for unstructured content, but imprecise for structured hotel data. A webhook tool lets the agent query our local SQLite database with exact matching, giving factual answers (e.g. exact parking price, height limit) rather than inferred ones.

For 60+ hotels, the pipeline would be: DB → generate per-hotel markdown docs → upload to ElevenLabs KB (for the static layer) + keep the webhook tool for live/dynamic facts (current offers, room availability, maintenance notices).

### Why local sync over live proxy for call logs?

Storing calls locally means:
- Feedback can be persisted without ElevenLabs knowing about it
- The dashboard is fast even if the ElevenLabs API is slow or rate-limited
- We can run full-text search and custom filters without API limitations

The primary path is the **post-call webhook** (near real-time), with **on-demand sync** as a fallback if the ngrok tunnel was down.

### Why SQLite?

Zero infrastructure for a POC. Drizzle ORM makes the migration to Postgres trivial — just change the dialect in `drizzle.config.ts` and swap the driver. The schema design (nullable `hotel_id` on policies, `metadata` JSON column on facilities) works identically in both databases.

### Stack summary

| Layer | Choice | Reason |
|-------|--------|--------|
| DB | SQLite + Drizzle ORM | Zero infra, type-safe, trivially portable |
| Backend | Fastify | Fastest Node HTTP framework, great TypeScript support |
| Validation | Zod | Schema-first, works at runtime and compile time |
| Frontend | React + Vite + Tailwind + shadcn/ui | Fast iteration, consistent design system |
| Data fetching | TanStack Query | Caching, background refetch, mutation state |
| Testing | Vitest + Fastify inject() | In-process HTTP tests, no network overhead |
