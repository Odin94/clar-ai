# Dormero Viktoria – Control Center

Voice AI control centre for Dormero Hotels. Viktoria handles Tier-1 guest inquiries; this repo provides the knowledge base, call log dashboard, and feedback loop.

---

## Quick Start

### Prerequisites
- Node.js 22.22.2+ (developed on Node.js 24.12.0 on Windows, tested with Node.js 22.22.2 on Ubuntu)
- An [ElevenLabs](https://elevenlabs.io) account (free tier)
- [ngrok](https://ngrok.com) (only needed to connect ElevenLabs agent tools to your local server)

### 1. Configure env
* Create `.env` from `.env.example` in `apps/server` and `apps/web`
* Fill in your configuration. Make sure `VITE_BACKEND_API_KEY` and `BACKEND_API_KEY` have the same value; you can pick any value of your choice.

### 2. Setup
* `npm install`
* `npm run db:generate`
* `npm run db:migrate`
* `npm run db:seed` - this is optional and creates sample data
* `npm run dev:server` to run the backend
* `npm run dev:web` to run the frontend
* `npm test --workspace=apps/server` to run tests

---

### 3. Elevenlabs setup
* After running backend, expose with `ngrok http 3001` (assuming you didn't change the port)
* Create `backend_api_key` and `base_url` env vars in https://elevenlabs.io/app/developers/environment-variables
  * `backend_api_key` you have defined yourself in `./apps/server/.env`
  * `base_url` you get from `ngrok`. Note that this env var should NOT include `https://`
* Create an agent with the "customer support" preset, use system prompt from `./elevenlabs-tools/SystemPrompt.txt`
* Create webhook tools from `./elevenlabs-tools` json files
* Add the tools to your agent in the agent settings
* (optional) Upload `./dormero-facts/all_hotels.md` to the agent's knowledge base

---


## Decision Summary
* Typescript because it's what I'm most familiar with, because it gives rigid type support where I want it and is flexible where I don't want rigidity, and it allows us to use the same language for backend and frontend, which is nice
* React + tailwind + shadcn because it's what I'm most familiar with, it has a great eco system and it works well with LLMs
* Fastify because it works well with typescript and is easy to set up and configure, has no overhead
* SQLite + Drizzle because it provides a smooth, low overhead development experience and allows us to easily switch to a "real" database down the line
* Storing calls in our DB (instead of eg. live fetching them from ElevenLabs every time) so we can interact / rate / flag independently
* Single backend service because complexity is too low to split into "CallLogService", "RatingService", "FlaggingService" etc.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/calls` | List calls. Params: `page`, `pageSize`, `status`, `search`, `from`, `to`, `sortBy`, `sortDir` |
| `GET` | `/api/calls/:id` | Call detail with transcript, feedback, and flag |
| `POST` | `/api/calls/:id/feedback` | Save customer rating (1–5) and/or comment |
| `GET` | `/api/feedback` | List feedback entries. Params: `page`, `pageSize`, `rating`, `hasComment` |
| `POST` | `/api/calls/:id/flag` | Create or update an admin flag (`positive`, `comment`) |
| `DELETE` | `/api/calls/:id/flag` | Remove an admin flag |
| `GET` | `/api/flags` | List flagged calls. Params: `page`, `pageSize`, `positive` |
| `GET` | `/api/stats` | Aggregate dashboard metrics |
| `GET` | `/api/stats/trends` | 7-day daily trend breakdown |
| `POST` | `/api/sync` | Pull latest conversations from ElevenLabs |
| `POST` | `/api/knowledge/query` | Agent webhook tool – hotel knowledge lookup |
| `POST` | `/api/webhook/callLogEntry` | ElevenLabs post-call webhook receiver |
