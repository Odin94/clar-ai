import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("./data/clarai.db"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_AGENT_ID: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.string().default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn("Environment variable validation issues:", parsed.error.format());
}

// Export with defaults applied even on partial failure
export const env = parsed.success
  ? parsed.data
  : {
      DATABASE_URL: process.env["DATABASE_URL"] ?? "./data/clarai.db",
      ELEVENLABS_API_KEY: process.env["ELEVENLABS_API_KEY"],
      ELEVENLABS_AGENT_ID: process.env["ELEVENLABS_AGENT_ID"],
      PORT: Number(process.env["PORT"] ?? 3001),
      NODE_ENV: process.env["NODE_ENV"] ?? "development",
    };

if (!env.ELEVENLABS_API_KEY) {
  console.warn(
    "Warning: ELEVENLABS_API_KEY is not set. ElevenLabs API calls will fail."
  );
}
if (!env.ELEVENLABS_AGENT_ID) {
  console.warn(
    "Warning: ELEVENLABS_AGENT_ID is not set. Sync will not work."
  );
}
