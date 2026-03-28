import { useQuery } from "@tanstack/react-query";
import { PhoneCall, CheckCircle, Star, Clock, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: "good" | "bad" | "neutral";
  loading: boolean;
}) {
  const textColor = highlight === "good"
    ? "text-green-700"
    : highlight === "bad"
    ? "text-red-600"
    : "text-gray-900";

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 bg-white border border-gray-200 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-dormero-50 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-dormero-700" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        {loading ? (
          <Skeleton className="h-5 w-12 mt-0.5" />
        ) : (
          <div className={cn("text-base font-semibold leading-tight", textColor)}>
            {value}
            {sub && <span className="text-xs text-gray-400 font-normal ml-1">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function fmtDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function StatsBar() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Stat
        icon={PhoneCall}
        label="Total calls"
        value={isLoading ? "" : String(data?.totalCalls ?? 0)}
        sub={isLoading ? "" : `${data?.callsToday ?? 0} today`}
        loading={isLoading}
      />
      <Stat
        icon={TrendingUp}
        label="This week"
        value={isLoading ? "" : String(data?.callsThisWeek ?? 0)}
        sub="calls"
        loading={isLoading}
      />
      <Stat
        icon={CheckCircle}
        label="Success rate"
        value={isLoading ? "" : pct(data?.successRate ?? 0)}
        highlight={
          !isLoading && data
            ? data.successRate >= 0.8 ? "good" : data.successRate < 0.5 ? "bad" : "neutral"
            : "neutral"
        }
        loading={isLoading}
      />
      <Stat
        icon={Star}
        label="Avg rating"
        value={isLoading ? "" : data?.avgRating != null ? `${data.avgRating} / 5` : "—"}
        sub={isLoading ? "" : data?.ratedCount ? `${data.ratedCount} rated` : undefined}
        highlight={
          !isLoading && data?.avgRating != null
            ? data.avgRating >= 4 ? "good" : data.avgRating < 3 ? "bad" : "neutral"
            : "neutral"
        }
        loading={isLoading}
      />
      <Stat
        icon={Clock}
        label="Avg duration"
        value={isLoading ? "" : fmtDuration(data?.avgDurationSecs ?? null)}
        loading={isLoading}
      />
    </div>
  );
}
