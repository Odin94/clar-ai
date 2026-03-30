const BASE = "/api";
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY as string | undefined;

// Types
export interface Flag {
  id: string;
  callId: string;
  positive: boolean;
  comment: string | null;
  createdAt: number;
  updatedAt: number;
}

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
  flag: Flag | null;
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
  flag: Flag | null;
}

export interface FlagEntry {
  id: string;
  callId: string;
  positive: boolean;
  comment: string | null;
  createdAt: number;
  updatedAt: number;
  call: {
    startTime: number;
    hotelMentioned: string | null;
    summary: string | null;
  };
}

export interface FlagsResponse {
  flags: FlagEntry[];
  total: number;
  page: number;
  pageSize: number;
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

export type DailyStatPoint = {
  date: string;
  calls: number;
  successRate: number;
  avgRating: number | null;
  avgDurationSecs: number | null;
  ratedCount: number;
  commentCount: number;
};

export type TrendsResponse = {
  trends: DailyStatPoint[];
};

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
  getFlags: (params?: { page?: number; pageSize?: number; positive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    if (params?.positive !== undefined) q.set("positive", String(params.positive));
    return request<FlagsResponse>(`/flags?${q}`);
  },
  saveFlag: (id: string, data: { positive: boolean; comment?: string }) =>
    request<{ flag: Flag }>(`/calls/${id}/flag`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteFlag: (id: string) =>
    request<{ success: boolean }>(`/calls/${id}/flag`, { method: "DELETE" }),
  getAllFlags: () => {
    const q = new URLSearchParams({ pageSize: "1000" });
    return request<FlagsResponse>(`/flags?${q}`);
  },
  sync: () => request<SyncResponse>("/sync", { method: "POST" }),
  getStats: () => request<StatsResponse>("/stats"),
  getStatsTrends: () => request<TrendsResponse>("/stats/trends"),
  getAllFeedback: () => {
    const q = new URLSearchParams({ pageSize: "1000" });
    return request<FeedbackResponse>(`/feedback?${q}`);
  },
  getAllCalls: () => {
    const q = new URLSearchParams({ pageSize: "1000" });
    return request<CallsResponse>(`/calls?${q}`);
  },
};
