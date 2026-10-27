
import {
  Package,
  AlertTriangle,
  Wrench,
  Ban,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
} from "lucide-react";

const STAT_CONFIG = [
  {
    key: "totalEquipment",
    title: "Total Equipment",
    description: "Registered equipment",
    icon: Package,
    iconClass: "bg-blue-100 text-blue-700",
    accentClass: "border-l-blue-500",
  },
  {
    key: "activeIssues",
    title: "Active Issues",
    description: "Issues requiring attention",
    icon: AlertTriangle,
    iconClass: "bg-amber-50 text-amber-700",
    accentClass: "border-l-amber-500",
  },
  {
    key: "underMaintenance",
    title: "Under Maintenance",
    description: "Currently being serviced",
    icon: Wrench,
    iconClass: "bg-violet-50 text-violet-700",
    accentClass: "border-l-violet-500",
  },
  {
    key: "outOfOrder",
    title: "Out of Order",
    description: "Not operational",
    icon: Ban,
    iconClass: "bg-red-50 text-red-700",
    accentClass: "border-l-red-500",
  },
];

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(number);
}

function getTrendIcon(trend) {
  if (trend === "up") return TrendingUp;
  if (trend === "down") return TrendingDown;

  return Activity;
}

function getTrendClass(trend, inverse = false) {
  if (trend === "neutral" || !trend) {
    return "bg-slate-100 text-slate-600";
  }

  const isPositive = trend === "up";

  if (inverse) {
    return isPositive
      ? "bg-red-50 text-red-700"
      : "bg-emerald-50 text-emerald-700";
  }

  return isPositive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-red-50 text-red-700";
}

function StatCard({ config, stats, loading }) {
  const Icon = config.icon;
  const value = stats?.[config.key];

  const trend = stats?.trends?.[config.key];
  const TrendIcon = trend ? getTrendIcon(trend.direction) : null;

  return (
    <article
      className={`min-w-0 rounded border border-slate-200 border-l-4 ${config.accentClass} bg-white p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {config.title}
          </p>

          {loading ? (
            <div className="mt-4 h-8 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {formatNumber(value)}
            </p>
          )}

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {config.description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${config.iconClass}`}
        >
          <Icon size={21} strokeWidth={1.8} />
        </div>
      </div>

      {!loading && trend && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${getTrendClass(
              trend.direction,
              trend.inverse
            )}`}
          >
            {TrendIcon && <TrendIcon size={14} />}

            {trend.label || "Compared with previous period"}
          </span>
        </div>
      )}
    </article>
  );
}

export default function MaintenanceStats({
  stats = {},
  loading = false,
  error = "",
  onRetry,
}) {
  const hasStats = stats && typeof stats === "object";

  return (
    <section aria-label="Maintenance Statistics">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Maintenance Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current equipment status and maintenance activity.
          </p>
        </div>

        {loading && (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <RefreshCw size={14} className="animate-spin" />
            Updating statistics
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-red-200 bg-red-50 p-4"
        >
          <div className="flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />

            <span>{error}</span>
          </div>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CONFIG.map((config) => (
          <StatCard
            key={config.key}
            config={config}
            stats={hasStats ? stats : {}}
            loading={loading}
          />
        ))}
      </div>
    </section>
  );
}
