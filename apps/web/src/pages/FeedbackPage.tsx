import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Star, MessageSquare, ChevronRight } from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { api, type FeedbackEntry } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackPage() {
  const navigate = useNavigate();
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const [commentFilter, setCommentFilter] = useState<"yes" | "no" | undefined>();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  function handleRating(star: number) {
    setRatingFilter((prev) => (prev === star ? undefined : star));
    setPage(1);
  }

  function handleComment(val: "yes" | "no") {
    setCommentFilter((prev) => (prev === val ? undefined : val));
    setPage(1);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["feedback", page, ratingFilter, commentFilter],
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.getFeedback({
        page,
        pageSize: PAGE_SIZE,
        rating: ratingFilter,
        hasComment: commentFilter,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data ? `${data.total} feedback entr${data.total === 1 ? "y" : "ies"}` : "Guest feedback from voice calls"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Star filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rating</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setRatingFilter(undefined); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                ratingFilter === undefined
                  ? "bg-dormero-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              All
            </button>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  ratingFilter === star
                    ? "bg-dormero-700 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Star size={11} className={ratingFilter === star ? "fill-white text-white" : "fill-amber-400 text-amber-400"} />
                {star}
              </button>
            ))}
          </div>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Comment filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comment</span>
          <div className="flex items-center gap-1">
            {(["yes", "no"] as const).map((val) => (
              <button
                key={val}
                onClick={() => handleComment(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  commentFilter === val
                    ? "bg-dormero-700 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MessageSquare size={11} />
                {val === "yes" ? "Has comment" : "No comment"}
              </button>
            ))}
          </div>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Failed to load feedback. Make sure the server is running.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.feedback.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Star size={24} />
                      <p className="text-sm">No feedback entries match the current filters.</p>
                    </div>
                  </td>
                </tr>
              )}
              {data?.feedback.map((entry: FeedbackEntry) => (
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
                    {entry.rating != null ? (
                      <StarRating value={entry.rating} readonly size="sm" />
                    ) : (
                      <span className="text-gray-300 text-xs italic">Not rated</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-sm">
                    {entry.comment ? (
                      <span className="line-clamp-2">{entry.comment}</span>
                    ) : (
                      <span className="text-gray-300 text-xs italic">No comment</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      entry.source === "voice"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {entry.source}
                    </span>
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
              Page {page} of {totalPages} · {data.total} entries
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
