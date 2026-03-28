import { env } from "../env.js";

const BASE = "https://api.elevenlabs.io";

export interface ConversationSummary {
  conversation_id: string;
  agent_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count: number;
  status: string;
  call_successful: string;
  transcript_summary?: string;
  termination_reason?: string;
}

export interface ConversationDetail extends ConversationSummary {
  transcript: Array<{
    role: "agent" | "user";
    message: string;
    time_in_call_secs: number;
  }>;
  cost?: { credits: number };
}

class ElevenLabsClient {
  constructor(private apiKey: string) {}

  private async request<T>(path: string): Promise<T> {
    const url = `${BASE}${path}`;
    const res = await fetch(url, {
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `ElevenLabs API error ${res.status} ${res.statusText} at ${path}: ${body}`
      );
    }

    return res.json() as Promise<T>;
  }

  async listConversations(
    agentId: string,
    pageSize = 50
  ): Promise<ConversationSummary[]> {
    const data = await this.request<{
      conversations: ConversationSummary[];
      next_cursor?: string;
    }>(
      `/v1/convai/conversations?agent_id=${encodeURIComponent(agentId)}&page_size=${pageSize}`
    );
    return data.conversations ?? [];
  }

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    return this.request<ConversationDetail>(
      `/v1/convai/conversations/${encodeURIComponent(conversationId)}`
    );
  }
}

export const elevenLabsClient = new ElevenLabsClient(
  env.ELEVENLABS_API_KEY ?? ""
);
