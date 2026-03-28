import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Calendar, Hash, DollarSign, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { cn } from "@/lib/utils";

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(secs: number | null): string {
  if (secs == null) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["call", id],
    queryFn: () => api.getCall(id!),
    enabled: !!id,
  });

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.feedback) {
      setRating(data.feedback.rating);
      setComment(data.feedback.comment ?? "");
      setIsDirty(false);
    }
  }, [data?.feedback]);

  const feedbackMutation = useMutation({
    mutationFn: (payload: { rating?: number; comment?: string }) =>
      api.saveFeedback(id!, payload),
    onSuccess: () => {
      toast.success("Feedback saved");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["call", id] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
    onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
  });

  const handleSave = () => {
    feedbackMutation.mutate({ rating: rating ?? undefined, comment: comment || undefined });
  };

  if (isError) {
    return (
      <div className="text-center py-20 text-gray-500">
        Call not found.
        <Button variant="link" onClick={() => navigate("/")}>Go back</Button>
      </div>
    );
  }

  const call = data?.call;
  const transcript = data?.transcript ?? [];

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Call Logs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-64 mb-2" />
              <Skeleton className="h-4 w-40" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-gray-900">
                Call with Viktoria
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {call && formatDate(call.startTime)}
              </p>
            </>
          )}
        </div>
        {call && <StatusBadge value={call.callSuccessful} />}
      </div>

      {/* Metadata strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: "Duration", value: isLoading ? null : formatDuration(call?.duration ?? null) },
          { icon: Hash, label: "Messages", value: isLoading ? null : String(call?.messageCount ?? "—") },
          { icon: DollarSign, label: "Credits", value: isLoading ? null : call?.costCredits != null ? call.costCredits.toFixed(2) : "—" },
          { icon: Calendar, label: "ID", value: isLoading ? null : call ? call.id.slice(0, 12) + "…" : "—" },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Icon size={12} />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            {value == null
              ? <Skeleton className="h-5 w-16" />
              : <div className="text-sm font-semibold text-gray-800">{value}</div>
            }
          </Card>
        ))}
      </div>

      {/* Summary */}
      {(isLoading || call?.summary) && (
        <Card className="p-4 border border-gray-200 bg-amber-50/50">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">AI Summary</div>
          {isLoading
            ? <Skeleton className="h-10 w-full" />
            : <p className="text-sm text-gray-700">{call?.summary}</p>
          }
        </Card>
      )}

      {/* Data Collection results */}
      {!isLoading && (call?.hotelMentioned || call?.complaintCategory) && (
        <div className="flex flex-wrap gap-3">
          {call.hotelMentioned && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-md px-3 py-1.5 text-xs text-blue-700">
              <span className="font-semibold">Hotel:</span>
              <span>{call.hotelMentioned}</span>
            </div>
          )}
          {call.complaintCategory && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-md px-3 py-1.5 text-xs text-red-700">
              <span className="font-semibold">Complaint:</span>
              <span>{call.complaintCategory}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transcript */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Transcript</h2>

          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 ? "flex-row-reverse" : ""}`}>
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <Skeleton className="h-16 flex-1 rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && transcript.length === 0 && (
            <div className="text-sm text-gray-400 py-8 text-center">No transcript available</div>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "flex gap-3 items-end",
                  entry.role === "agent" ? "flex-row" : "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold",
                    entry.role === "agent"
                      ? "bg-dormero-700 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {entry.role === "agent" ? "V" : "C"}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    entry.role === "agent"
                      ? "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                      : "bg-gray-100 text-gray-800 rounded-br-sm"
                  )}
                >
                  <p>{entry.message}</p>
                  {entry.timeInCallSecs != null && (
                    <span className="text-xs text-gray-400 mt-1 block">
                      {formatTime(entry.timeInCallSecs)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback panel */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Feedback</h2>
          <Card className="p-5 border border-gray-200 space-y-5">
            {data?.feedback?.source === "voice" && (
              <div className="bg-blue-50 text-blue-700 text-xs rounded-md px-3 py-2 border border-blue-100">
                ✦ Collected automatically during call
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Rating</Label>
              <StarRating
                value={rating}
                onChange={(r) => { setRating(r); setIsDirty(true); }}
                size="lg"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium text-gray-700">
                Comment
              </Label>
              <Textarea
                id="comment"
                placeholder="Add a note about this call…"
                value={comment}
                onChange={(e) => { setComment(e.target.value); setIsDirty(true); }}
                rows={4}
                className="text-sm resize-none"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!isDirty || feedbackMutation.isPending}
              className={cn(
                "w-full",
                isDirty
                  ? "bg-dormero-700 hover:bg-dormero-800 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Save size={14} className="mr-2" />
              {feedbackMutation.isPending ? "Saving…" : "Save Feedback"}
            </Button>

            {data?.feedback && (
              <div className="text-xs text-gray-400 text-center">
                Last updated {new Date(data.feedback.updatedAt * 1000).toLocaleDateString()}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
