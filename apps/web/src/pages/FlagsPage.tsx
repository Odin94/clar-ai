import { useState } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ThumbsUp, ThumbsDown, ChevronRight, Flag, FileJson } from "lucide-react";
import { toast } from "sonner";
import { api, type FlagEntry, type Call } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function downloadJson(calls: Call[]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    calls: calls.map((c) => ({
      id: c.id,
      agentId: c.agentId,
      startTime: new Date(c.startTime * 1000).toISOString(),
      duration: c.duration,
      status: c.status,
      callSuccessful: c.callSuccessful,
      messageCount: c.messageCount,
      costCredits: c.costCredits,
      terminationReason: c.terminationReason,
      hotelMentioned: c.hotelMentioned,
      complaintCategory: c.complaintCategory,
      summary: c.summary,
      flag: c.flag ? {
        positive: c.flag.positive,
        comment: c.flag.comment,
        createdAt: new Date(c.flag.createdAt).toISOString(),
      } : null,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flags-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}


export function FlagsPage() {
  const navigate = useNavigate();
  const [positiveFilter, setPositiveFilter] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const exportMutation = useMutation({
    mutationFn: () => api.getAllCalls(),
    onSuccess: (callsRes) => {
      const flaggedCalls = callsRes.calls.filter((c) => c.flag !== null);
      downloadJson(flaggedCalls);
      toast.success(`Exported ${flaggedCalls.length} flagged calls.`);
    },
    onError: (err: Error) => toast.error(`Export failed: ${err.message}`),
  });

  function handleSentimentFilter(val: boolean) {
    setPositiveFilter((prev) => (prev === val ? undefined : val));
    setPage(1);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["flags", page, positiveFilter],
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.getFlags({
        page,
        pageSize: PAGE_SIZE,
        positive: positiveFilter,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Flags</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data ? `${data.total} flagged call${data.total === 1 ? "" : "s"}` : "Admin-flagged calls"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="gap-2"
        >
          <FileJson size={14} />
          {exportMutation.isPending ? "Exporting…" : "Export JSON"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sentiment</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setPositiveFilter(undefined); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              positiveFilter === undefined
                ? "bg-dormero-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleSentimentFilter(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              positiveFilter === true
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
            }`}
          >
            <ThumbsUp size={11} />
            Positive
          </button>
          <button
            onClick={() => handleSentimentFilter(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              positiveFilter === false
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            }`}
          >
            <ThumbsDown size={11} />
            Negative
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hotel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sentiment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Failed to load flags. Make sure the server is running.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.flags.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Flag size={24} />
                      <p className="text-sm">No flags match the current filters.</p>
                    </div>
                  </td>
                </tr>
              )}
              {data?.flags.map((entry: FlagEntry) => (
                <tr
                  key={entry.id}
                  onClick={() => navigate(`/calls/${entry.callId}`)}
                  className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap font-medium">
                    {formatDate(entry.call.startTime)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {entry.call.hotelMentioned ?? <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {entry.positive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-0.5">
                        <ThumbsUp size={11} />
                        Positive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-0.5">
                        <ThumbsDown size={11} />
                        Negative
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-sm">
                    {entry.comment ? (
                      <span className="line-clamp-2">{entry.comment}</span>
                    ) : (
                      <span className="text-gray-300 text-xs italic">No note</span>
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
              Page {page} of {totalPages} · {data.total} flags
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
