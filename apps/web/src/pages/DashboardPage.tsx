import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { PhoneCall, CheckCircle, Star, Clock, TrendingUp, MessageSquare } from "lucide-react";
import { api, type DailyStatPoint } from "@/lib/api";
import { StatsBar } from "@/components/StatsBar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DORMERO = "#8b2032";

// Placeholder — will be driven by real agent version history in future
const AGENT_UPDATE_DAY = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
})();

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function fmtDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

type ChartConfig = {
  title: string;
  icon: React.ElementType;
  dataKey: keyof DailyStatPoint;
  color: string;
  formatValue: (v: number | null) => string;
  formatTick: (v: number) => string;
  domain?: [number | string, number | string];
};

const CHART_CONFIGS: ChartConfig[] = [
  {
    title: "Calls per day",
    icon: PhoneCall,
    dataKey: "calls",
    color: DORMERO,
    formatValue: (v) => (v == null ? "0" : String(v)),
    formatTick: (v) => String(v),
  },
  {
    title: "Success rate",
    icon: CheckCircle,
    dataKey: "successRate",
    color: "#16a34a",
    formatValue: (v) => (v == null ? "—" : pct(v)),
    formatTick: (v) => `${Math.round(v * 100)}%`,
    domain: [0, 1],
  },
  {
    title: "Avg rating",
    icon: Star,
    dataKey: "avgRating",
    color: "#d97706",
    formatValue: (v) => (v == null ? "—" : `${v} / 5`),
    formatTick: (v) => String(v),
    domain: [0, 5],
  },
  {
    title: "Avg duration",
    icon: Clock,
    dataKey: "avgDurationSecs",
    color: "#6366f1",
    formatValue: (v) => fmtDuration(v),
    formatTick: (v) => (v >= 60 ? `${Math.round(v / 60)}m` : `${v}s`),
  },
];

type TrendCardProps = {
  config: ChartConfig;
  data: DailyStatPoint[];
  loading: boolean;
};

const TrendCard = ({ config, data, loading }: TrendCardProps) => {
  const Icon = config.icon;

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const latestValue = latest ? (latest[config.dataKey] as number | null) : null;

  const chartData = data.map((d) => ({
    day: shortDate(d.date),
    value: d[config.dataKey] as number | null,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-dormero-50 flex items-center justify-center flex-shrink-0">
          <Icon size={13} className="text-dormero-700" />
        </div>
        <span className="text-sm font-medium text-gray-700">{config.title}</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <div className={cn("text-2xl font-bold tabular-nums", "text-gray-900")}>
            {config.formatValue(latestValue)}
            <span className="text-xs font-normal text-gray-400 ml-1">today</span>
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${config.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={config.formatTick}
                  domain={config.domain}
                  width={38}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                  formatter={(value: number | null) => [
                    config.formatValue(value),
                    config.title,
                  ]}
                  labelStyle={{ color: "#6b7280", fontWeight: 500 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2}
                  fill={`url(#grad-${config.dataKey})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: config.color }}
                  connectNulls
                />
                <ReferenceLine
                  x={AGENT_UPDATE_DAY}
                  stroke="#94a3b8"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: "Agent updated", position: "insideTopLeft", fontSize: 9, fill: "#94a3b8", dy: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

type FeedbackBreakdownChartProps = {
  data: DailyStatPoint[];
  loading: boolean;
};

const LEGEND_ITEMS = [
  { key: "ratedWithComment", label: "Rating + comment", color: "#8b2032" },
  { key: "ratedOnly",        label: "Rating only",      color: "#d97706" },
  { key: "noFeedback",       label: "No feedback",      color: "#e5e7eb" },
];

const FeedbackBreakdownChart = ({ data, loading }: FeedbackBreakdownChartProps) => {
  const chartData = data.map((d) => ({
    day: shortDate(d.date),
    ratedWithComment: d.commentCount,
    ratedOnly:        Math.max(0, d.ratedCount - d.commentCount),
    noFeedback:       Math.max(0, d.calls - d.ratedCount),
  }));

  const totalRated   = data.reduce((s, d) => s + d.ratedCount, 0);
  const totalComment = data.reduce((s, d) => s + d.commentCount, 0);
  const totalCalls   = data.reduce((s, d) => s + d.calls, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-dormero-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={13} className="text-dormero-700" />
          </div>
          <span className="text-sm font-medium text-gray-700">Feedback breakdown (last 7 days)</span>
        </div>

        {!loading && (
          <div className="flex items-center gap-5 text-right shrink-0">
            <div>
              <div className="text-xs text-gray-400">Rated</div>
              <div className="text-base font-semibold text-gray-900 tabular-nums">
                {totalRated}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  / {totalCalls}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">With comment</div>
              <div className="text-base font-semibold text-gray-900 tabular-nums">
                {totalComment}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  / {totalRated}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                labelStyle={{ color: "#6b7280", fontWeight: 500 }}
                cursor={{ fill: "#f9fafb" }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) =>
                  LEGEND_ITEMS.find((l) => l.key === value)?.label ?? value
                }
              />
              {LEGEND_ITEMS.map(({ key, color, label }) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={label}
                  stackId="feedback"
                  fill={color}
                  radius={key === "ratedWithComment" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
              <ReferenceLine
                x={AGENT_UPDATE_DAY}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: "Agent updated", position: "insideTopLeft", fontSize: 10, fill: "#94a3b8", dy: 4 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const DashboardPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "trends"],
    queryFn: api.getStatsTrends,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const trends = data?.trends ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of Viktoria's performance</p>
      </div>

      <StatsBar />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-dormero-700" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            7-day trends
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {CHART_CONFIGS.map((cfg) => (
            <TrendCard key={cfg.dataKey} config={cfg} data={trends} loading={isLoading} />
          ))}
        </div>

        <div className="mt-4">
          <FeedbackBreakdownChart data={trends} loading={isLoading} />
        </div>
      </div>
    </div>
  );
};
