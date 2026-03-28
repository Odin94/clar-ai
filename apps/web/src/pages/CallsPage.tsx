import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, Phone, Clock, ChevronRight, Wifi } from "lucide-react";
import { toast } from "sonner";
import { api, type Call } from "@/lib/api";
import { useCallsStream } from "@/hooks/useCallsStream";
import { StatsBar } from "@/components/StatsBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CallsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Subscribe to SSE for live updates
  useCallsStream();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["calls", page, search, statusFilter],
    queryFn: () => api.getCalls({ page, pageSize: PAGE_SIZE, search: search || undefined, status: statusFilter || undefined }),
  });

  const syncMutation = useMutation({
    mutationFn: api.sync,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
    onError: (err: Error) => toast.error(`Sync failed: ${err.message}`),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <StatsBar />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Call Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data ? `${data.total} total conversations` : "Recent Viktoria conversations"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5">
            <Wifi size={12} />
            Live
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-dormero-700 hover:bg-dormero-800 text-white"
          >
            <RefreshCw size={14} className={syncMutation.isPending ? "animate-spin mr-2" : "mr-2"} />
            {syncMutation.isPending ? "Syncing…" : "Sync from ElevenLabs"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1">
          {["", "success", "failure", "unknown"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-dormero-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date &amp; Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Messages</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Failed to load calls. Make sure the server is running.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.calls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Phone size={24} />
                      <p className="text-sm">No calls yet. Click "Sync from ElevenLabs" to pull recent conversations.</p>
                    </div>
                  </td>
                </tr>
              )}
              {data?.calls.map((call: Call) => (
                <tr
                  key={call.id}
                  onClick={() => navigate(`/calls/${call.id}`)}
                  className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {formatDate(call.startTime)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" />
                      {formatDuration(call.duration)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={call.callSuccessful} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {call.summary ?? <span className="text-gray-300 italic">No summary</span>}
                  </td>
                  <td className="px-4 py-3">
                    {call.feedback?.rating
                      ? <StarRating value={call.feedback.rating} readonly size="sm" />
                      : <span className="text-gray-300 text-xs italic">Not rated</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {call.messageCount ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-dormero-600 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages} · {data.total} calls
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
