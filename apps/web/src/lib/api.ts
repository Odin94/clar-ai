const BASE = "/api";
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY as string | undefined;

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
  hotelMentioned: string | null;
  complaintCategory: string | null;
  feedback: Feedback | null;
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

export interface FeedbackEntry {
  id: string;
  callId: string;
  rating: number | null;
  comment: string | null;
  source: string;
  createdAt: number;
  updatedAt: number;
  call: {
    startTime: number;
    hotelMentioned: string | null;
    summary: string | null;
  };
}

export interface FeedbackResponse {
  feedback: FeedbackEntry[];
  total: number;
  page: number;
  pageSize: number;
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
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
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
  getCalls: (params?: { page?: number; pageSize?: number; status?: string; search?: string; from?: string; to?: string; sortBy?: string; sortDir?: "asc" | "desc" }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    return request<CallsResponse>(`/calls?${q}`);
  },
  getCall: (id: string) => request<CallDetailResponse>(`/calls/${id}`),
  saveFeedback: (id: string, data: { rating?: number; comment?: string }) =>
    request<{ feedback: Feedback }>(`/calls/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getFeedback: (params?: { page?: number; pageSize?: number; rating?: number; hasComment?: "yes" | "no" }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    if (params?.rating) q.set("rating", String(params.rating));
    if (params?.hasComment) q.set("hasComment", params.hasComment);
    return request<FeedbackResponse>(`/feedback?${q}`);
  },
  sync: () => request<SyncResponse>("/sync", { method: "POST" }),
  getStats: () => request<StatsResponse>("/stats"),
};
