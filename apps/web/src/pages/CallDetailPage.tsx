import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Calendar, Hash, DollarSign, Save, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
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
import { cn, formatDuration } from "@/lib/utils";


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

  // Flag editor state — only holds pending edits; server data is used when not dirty
  const [flagPositive, setFlagPositive] = useState<boolean | null>(null);
  const [flagComment, setFlagComment] = useState("");
  const [isFlagDirty, setIsFlagDirty] = useState(false);

  const displayFlagPositive = isFlagDirty ? flagPositive : (data?.flag?.positive ?? null);
  const displayFlagComment = isFlagDirty ? flagComment : (data?.flag?.comment ?? "");

  const flagMutation = useMutation({
    mutationFn: (payload: { positive: boolean; comment?: string }) =>
      api.saveFlag(id!, payload),
    onSuccess: () => {
      toast.success("Flag saved");
      setIsFlagDirty(false);
      queryClient.invalidateQueries({ queryKey: ["call", id] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["flags"] });
    },
    onError: (err: Error) => toast.error(`Failed to save flag: ${err.message}`),
  });

  const deleteFlagMutation = useMutation({
    mutationFn: () => api.deleteFlag(id!),
    onSuccess: () => {
      toast.success("Flag removed");
      setFlagPositive(null);
      setFlagComment("");
      setIsFlagDirty(false);
      queryClient.invalidateQueries({ queryKey: ["call", id] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["flags"] });
    },
    onError: (err: Error) => toast.error(`Failed to remove flag: ${err.message}`),
  });

  const handleSaveFlag = () => {
    if (displayFlagPositive === null) return;
    flagMutation.mutate({ positive: displayFlagPositive, comment: displayFlagComment || undefined });
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
  const hasExistingFlag = !!data?.flag;

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

        {/* Side panels */}
        <div className="space-y-5">
          {/* Customer Feedback — read-only */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Customer Feedback</h2>
            <Card className="p-5 border border-gray-200 space-y-4">
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : data?.feedback ? (
                <>
                  {data.feedback.source === "voice" && (
                    <div className="bg-blue-50 text-blue-700 text-xs rounded-md px-3 py-2 border border-blue-100">
                      ✦ Collected automatically during call
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rating</Label>
                    <StarRating value={data.feedback.rating} readonly size="lg" />
                  </div>
                  {data.feedback.comment && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comment</Label>
                        <p className="text-sm text-gray-700">{data.feedback.comment}</p>
                      </div>
                    </>
                  )}
                  <div className="text-xs text-gray-400">
                    Received {new Date(data.feedback.updatedAt * 1000).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">No customer feedback for this call.</p>
              )}
            </Card>
          </div>

          {/* Admin Flag */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Admin Flag</h2>
            <Card className="p-5 border border-gray-200 space-y-4">
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Sentiment</Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setFlagPositive(true); setIsFlagDirty(true); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium border transition-colors",
                          displayFlagPositive === true
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                        )}
                      >
                        <ThumbsUp size={14} />
                        Positive
                      </button>
                      <button
                        onClick={() => { setFlagPositive(false); setIsFlagDirty(true); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium border transition-colors",
                          displayFlagPositive === false
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        )}
                      >
                        <ThumbsDown size={14} />
                        Negative
                      </button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="flag-comment" className="text-sm font-medium text-gray-700">
                      Note <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="flag-comment"
                      placeholder="Add a note about this flag…"
                      value={displayFlagComment}
                      onChange={(e) => { setFlagComment(e.target.value); setIsFlagDirty(true); }}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveFlag}
                      disabled={!isFlagDirty || displayFlagPositive === null || flagMutation.isPending}
                      className={cn(
                        "flex-1",
                        isFlagDirty && displayFlagPositive !== null
                          ? "bg-dormero-700 hover:bg-dormero-800 text-white"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      <Save size={14} className="mr-2" />
                      {flagMutation.isPending ? "Saving…" : "Save Flag"}
                    </Button>
                    {hasExistingFlag && (
                      <Button
                        variant="outline"
                        onClick={() => deleteFlagMutation.mutate()}
                        disabled={deleteFlagMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>

                  {data?.flag && (
                    <div className="text-xs text-gray-400 text-center">
                      Last updated {new Date(data.flag.updatedAt * 1000).toLocaleDateString()}
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
