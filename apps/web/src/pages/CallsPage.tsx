import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, Phone, Clock, ChevronRight, Wifi, ChevronUp, ChevronDown, ChevronsUpDown, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { api, type Call } from "@/lib/api";
import { useCallsStream } from "@/hooks/useCallsStream";
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

type SortKey = "startTime" | "duration" | "callSuccessful" | "summary" | "rating" | "messageCount";

function SortIcon({ col, sortBy, sortDir }: { col: SortKey; sortBy: SortKey; sortDir: "asc" | "desc" }) {
  if (col !== sortBy) return <ChevronsUpDown size={12} className="ml-1 text-gray-300 inline-block" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="ml-1 text-dormero-600 inline-block" />
    : <ChevronDown size={12} className="ml-1 text-dormero-600 inline-block" />;
}

export function CallsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("startTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const PAGE_SIZE = 20;

  function handleSort(col: SortKey) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  }

  // Subscribe to SSE for live updates
  useCallsStream();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["calls", page, search, statusFilter, fromDate, toDate, sortBy, sortDir],
    placeholderData: keepPreviousData,
    queryFn: () => api.getCalls({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      status: statusFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      sortBy,
      sortDir,
    }),
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
      <div className="flex flex-wrap items-center gap-3">
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
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s
                  ? "bg-dormero-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">From</span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="h-9 w-36 text-xs"
          />
          <span className="font-medium">To</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="h-9 w-36 text-xs"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
              className="text-dormero-700 hover:text-dormero-800 font-medium underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {(
                  [
                    { col: "startTime" as SortKey, label: "Date & Time" },
                    { col: "duration" as SortKey, label: "Duration" },
                    { col: "callSuccessful" as SortKey, label: "Status" },
                    { col: "summary" as SortKey, label: "Summary" },
                    { col: "rating" as SortKey, label: "Rating" },
                    { col: "messageCount" as SortKey, label: "Messages" },
                  ] as const
                ).map(({ col, label }) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    {label}
                    <SortIcon col={col} sortBy={sortBy} sortDir={sortDir} />
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Flag</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
              {isError && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Failed to load calls. Make sure the server is running.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.calls.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Phone size={24} />
                      <p className="text-sm">No calls yet. Wait for new calls or click "Sync from ElevenLabs" to pull recent conversations.</p>
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
                    {call.flag ? (
                      call.flag.positive
                        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-0.5"><ThumbsUp size={11} />Positive</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-0.5"><ThumbsDown size={11} />Negative</span>
                    ) : (
                      <span className="text-gray-300 text-xs italic">No flag</span>
                    )}
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
