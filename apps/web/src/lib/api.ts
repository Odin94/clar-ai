const BASE = "/api";

// Types
export interface Call {
  id: string;
  agentId: string;
  status: string | null;
  startTime: number;
  duration: number | null;
  summary: string | null;
  callSuccessful: string | null;
  messageCount: number | null;
  costCredits: number | null;
  terminationReason: string | null;
  syncedAt: number | null;
  feedback?: Feedback | null;
}

export interface TranscriptEntry {
  id: string;
  callId: string;
  role: "agent" | "user";
  message: string;
  timeInCallSecs: number | null;
  sortOrder: number;
}

export interface Feedback {
  id: string;
  callId: string;
  rating: number | null;
  comment: string | null;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export interface CallsResponse {
  calls: Call[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CallDetailResponse {
  call: Call;
  transcript: TranscriptEntry[];
  feedback: Feedback | null;
}

export interface SyncResponse {
  synced: number;
  message: string;
}

export interface StatsResponse {
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  successRate: number;
  failureRate: number;
  avgDurationSecs: number | null;
  avgRating: number | null;
  ratedCount: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCalls: (params?: { page?: number; pageSize?: number; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    return request<CallsResponse>(`/calls?${q}`);
  },
  getCall: (id: string) => request<CallDetailResponse>(`/calls/${id}`),
  saveFeedback: (id: string, data: { rating?: number; comment?: string }) =>
    request<{ feedback: Feedback }>(`/calls/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  sync: () => request<SyncResponse>("/sync", { method: "POST" }),
  getStats: () => request<StatsResponse>("/stats"),
};
