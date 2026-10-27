
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  ClipboardList,
  Building2,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AIManagerChat from "../components/ai-manager/AIManagerChat";

import {
  getAIManagerStatus,
  getHotelOverview,
  getDailyHotelReport,
  getAIManagerAlerts,
  getDepartmentInsights,
} from "../services/ai-manager.service";

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN").format(number);
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatDate = (value = new Date()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getCurrentDate = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getErrorMessage = (error) =>
  error?.message || "Unable to load hotel information.";

const getMetric = (overview, key) =>
  overview?.metrics?.[key] ?? overview?.[key] ?? null;

const getStatusLabel = (status) => {
  if (!status) {
    return "Not connected";
  }

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/* -------------------------------------------------------
   Reusable UI Components
------------------------------------------------------- */

function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-indigo-600">
          <Icon size={19} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "indigo",
}) {
  const accentClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <article className="rounded border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${
            accentClasses[accent] || accentClasses.indigo
          }`}
        >
          <Icon size={21} />
        </div>
      </div>

      {description && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </article>
  );
}

function EmptyState({
  icon: Icon = Activity,
  title,
  description,
}) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded border border-dashed border-slate-300 px-5 py-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded bg-slate-100 text-slate-500">
        <Icon size={21} />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded border border-slate-200 bg-white">
      <RefreshCw
        size={25}
        className="animate-spin text-indigo-600"
      />

      <p className="mt-3 text-sm font-medium text-slate-700">
        Loading hotel intelligence...
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Retrieving available hotel information.
      </p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 rounded border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          size={19}
          className="mt-0.5 shrink-0 text-red-600"
        />

        <div>
          <p className="text-sm font-semibold text-red-800">
            Unable to load some hotel information
          </p>

          <p className="mt-1 break-words text-sm text-red-700">
            {message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        <RefreshCw size={15} />
        Retry
      </button>
    </div>
  );
}

/* -------------------------------------------------------
   Main Page
------------------------------------------------------- */

export default function AIManagerPage() {
  const [overview, setOverview] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [departmentInsights, setDepartmentInsights] =
    useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [selectedDate, setSelectedDate] =
    useState(getCurrentDate);

  const loadDashboard = useCallback(
    async ({ showLoader = true } = {}) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const params = {
        date: selectedDate,
      };

      const requests = await Promise.allSettled([
        getAIManagerStatus(),
        getHotelOverview(params),
        getDailyHotelReport(params),
        getAIManagerAlerts(),
        getDepartmentInsights(params),
      ]);

      const [
        statusResult,
        overviewResult,
        reportResult,
        alertsResult,
        departmentsResult,
      ] = requests;

      let failureCount = 0;

      if (statusResult.status === "fulfilled") {
        setServiceStatus(statusResult.value);
      } else {
        failureCount += 1;
      }

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
      } else {
        failureCount += 1;
      }

      if (reportResult.status === "fulfilled") {
        setDailyReport(reportResult.value);
      } else {
        failureCount += 1;
      }

      if (alertsResult.status === "fulfilled") {
        setAlerts(alertsResult.value);
      } else {
        failureCount += 1;
      }

      if (departmentsResult.status === "fulfilled") {
        setDepartmentInsights(departmentsResult.value);
      } else {
        failureCount += 1;
      }

      if (failureCount > 0) {
        setError(
          `${failureCount} request(s) failed. Check the backend API and authentication, then retry.`
        );
      }

      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [selectedDate]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = [
    {
      title: "Total Rooms",
      value: formatNumber(getMetric(overview, "totalRooms")),
      description: "Registered hotel rooms",
      icon: Building2,
      accent: "indigo",
    },
    {
      title: "Occupied Rooms",
      value: formatNumber(getMetric(overview, "occupiedRooms")),
      description: "Rooms currently occupied",
      icon: BedDouble,
      accent: "blue",
    },
    {
      title: "Available Rooms",
      value: formatNumber(getMetric(overview, "availableRooms")),
      description: "Rooms available for booking",
      icon: CheckCircle2,
      accent: "emerald",
    },
    {
      title: "Today's Arrivals",
      value: formatNumber(getMetric(overview, "arrivalsToday")),
      description: "Expected guest arrivals",
      icon: ArrowDownRight,
      accent: "violet",
    },
    {
      title: "Today's Departures",
      value: formatNumber(getMetric(overview, "departuresToday")),
      description: "Expected guest departures",
      icon: ArrowUpRight,
      accent: "amber",
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(getMetric(overview, "revenueToday")),
      description: "Revenue from actual financial records",
      icon: Wallet,
      accent: "emerald",
    },
    {
      title: "Housekeeping Tasks",
      value: formatNumber(
        getMetric(overview, "pendingHousekeepingTasks")
      ),
      description: "Pending housekeeping tasks",
      icon: ClipboardList,
      accent: "rose",
    },
    {
      title: "Maintenance Tasks",
      value: formatNumber(
        getMetric(overview, "pendingMaintenanceTasks")
      ),
      description: "Pending maintenance issues",
      icon: Wrench,
      accent: "amber",
    },
  ];

  const occupancyRate = getMetric(
    overview,
    "occupancyRate"
  );

  const validOccupancy =
    occupancyRate !== null &&
    occupancyRate !== undefined &&
    Number.isFinite(Number(occupancyRate));

  const reportHighlights = Array.isArray(dailyReport?.highlights)
    ? dailyReport.highlights
    : [];

  const reportRisks = Array.isArray(dailyReport?.risks)
    ? dailyReport.risks
    : [];

  const recommendations = Array.isArray(
    dailyReport?.recommendations
  )
    ? dailyReport.recommendations
    : [];

  const alertItems = Array.isArray(alerts?.alerts)
    ? alerts.alerts
    : Array.isArray(alerts?.data?.alerts)
      ? alerts.data.alerts
      : [];

  const departmentData =
    departmentInsights?.departments ||
    departmentInsights?.data?.departments ||
    null;

  const integrationPending =
    overview?.status === "integration_pending" ||
    dailyReport?.status === "integration_pending";

  const roomChartData = useMemo(() => {
    const rawTotal = getMetric(overview, "totalRooms");
    const rawOccupied = getMetric(overview, "occupiedRooms");
    const rawAvailable = getMetric(overview, "availableRooms");

    if (rawTotal == null || rawOccupied == null || rawAvailable == null) {
      return [];
    }

    const total = Number(rawTotal);
    const occupied = Number(rawOccupied);
    const available = Number(rawAvailable);

    if (
      !Number.isFinite(total) ||
      !Number.isFinite(occupied) ||
      !Number.isFinite(available) ||
      total < 0 ||
      occupied < 0 ||
      available < 0
    ) {
      return [];
    }

    const other = Math.max(0, total - occupied - available);
    return [
      { name: "Occupied", value: occupied },
      { name: "Available", value: available },
      ...(other > 0 ? [{ name: "Other", value: other }] : []),
    ].filter((item) => item.value > 0);
  }, [overview]);

  const movementChartData = useMemo(() => {
    const rawArrivals = getMetric(overview, "arrivalsToday");
    const rawDepartures = getMetric(overview, "departuresToday");

    if (rawArrivals == null || rawDepartures == null) {
      return [];
    }

    const arrivals = Number(rawArrivals);
    const departures = Number(rawDepartures);

    if (!Number.isFinite(arrivals) || !Number.isFinite(departures)) {
      return [];
    }

    return [
      { activity: "Arrivals", guests: arrivals },
      { activity: "Departures", guests: departures },
    ];
  }, [overview]);

  const workloadChartData = useMemo(() => {
    const rawHousekeeping = getMetric(overview, "pendingHousekeepingTasks");
    const rawMaintenance = getMetric(overview, "pendingMaintenanceTasks");

    if (rawHousekeeping == null || rawMaintenance == null) {
      return [];
    }

    const housekeeping = Number(rawHousekeeping);
    const maintenance = Number(rawMaintenance);

    if (!Number.isFinite(housekeeping) || !Number.isFinite(maintenance)) {
      return [];
    }

    return [
      { department: "Housekeeping", tasks: housekeeping },
      { department: "Maintenance", tasks: maintenance },
    ];
  }, [overview]);

  const chartTooltipStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <main className="min-h-screen ">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Page Header */}
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-indigo-100 bg-indigo-50 text-indigo-600">
              <Sparkles size={27} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Dashboard
                </h1>

                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  Intelligence Center
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor hotel operations, review daily insights,
                identify operational risks, and ask your AI
                assistant for guidance.
              </p>

              <p className="mt-2 text-xs font-medium text-slate-500">
                {formatDate(selectedDate)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2">
              <CalendarClock
                size={17}
                className="text-slate-500"
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                className="min-w-0 rounded border-0 bg-transparent text-sm text-slate-700 outline-none focus:ring-0"
                aria-label="Select report date"
              />
            </div>

            <button
              type="button"
              onClick={() => loadDashboard({ showLoader: false })}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => loadDashboard()}
          />
        )}

        {/* Service Status */}
        <section className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
              <Activity size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                AI Manager Service
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {serviceStatus?.message ||
                  "Checking service availability and integrations."}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />

            {getStatusLabel(
              serviceStatus?.status ||
                overview?.status ||
                "checking"
            )}
          </span>
        </section>

        {/* Integration Notice */}
        {integrationPending && (
          <section className="rounded border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <h2 className="text-sm font-semibold text-amber-900">
                  Database integration required
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  The AI Manager backend currently returns
                  integration status placeholders. Connect the
                  hotel database models and AI service to display
                  real operational metrics and recommendations.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Overview Metrics */}
        <section>
          <SectionHeading
            icon={TrendingUp}
            title="Hotel Overview"
            description="Key operational metrics for the selected date."
          />

          {loading ? (
            <LoadingState />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.title}
                  {...metric}
                />
              ))}
            </div>
          )}
        </section>

        {/* Operational Charts */}
        <section>
          <SectionHeading
            icon={TrendingUp}
            title="Operational Analytics"
            description="Visual snapshots generated from the selected date's available hotel metrics."
          />

          {loading ? (
            <LoadingState />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <article className="min-w-0 rounded border border-slate-200 bg-white p-5">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Room Distribution</h3>
                  <p className="mt-1 text-xs text-slate-500">Occupied and available room counts.</p>
                </div>
                {roomChartData.length ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roomChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="46%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                        >
                          {roomChartData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={["#4f46e5", "#10b981", "#94a3b8"][index % 3]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [formatNumber(value), name]}
                          contentStyle={chartTooltipStyle}
                        />
                        <Legend verticalAlign="bottom" height={30} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={BedDouble}
                    title="Room data unavailable"
                    description="Room distribution will appear when valid room counts are returned by the backend."
                  />
                )}
              </article>

              <article className="min-w-0 rounded border border-slate-200 bg-white p-5">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Guest Movement</h3>
                  <p className="mt-1 text-xs text-slate-500">Today's expected arrivals compared with departures.</p>
                </div>
                {movementChartData.length ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={movementChartData} margin={{ top: 12, right: 8, left: -18, bottom: 4 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="activity" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value) => [formatNumber(value), "Guests"]}
                          contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey="guests" name="Guests" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={54} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="Guest movement unavailable"
                    description="Arrival and departure counts will appear when the backend provides them."
                  />
                )}
              </article>

              <article className="min-w-0 rounded border border-slate-200 bg-white p-5">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Pending Workload</h3>
                  <p className="mt-1 text-xs text-slate-500">Outstanding housekeeping and maintenance tasks.</p>
                </div>
                {workloadChartData.length ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workloadChartData} layout="vertical" margin={{ top: 8, right: 12, left: 6, bottom: 4 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="department" width={104} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value) => [formatNumber(value), "Tasks"]}
                          contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey="tasks" name="Pending tasks" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={ClipboardList}
                    title="Workload data unavailable"
                    description="Task counts will appear when the backend provides valid values."
                  />
                )}
              </article>
            </div>
          )}
        </section>

        {/* Occupancy */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <article className="rounded border border-slate-200 bg-white p-5 sm:p-6">
            <SectionHeading
              icon={BedDouble}
              title="Room Occupancy"
              description="Current room utilization."
            />

            {loading ? (
              <div className="flex min-h-24 items-center justify-center">
                <RefreshCw
                  size={20}
                  className="animate-spin text-indigo-600"
                />
              </div>
            ) : validOccupancy ? (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-bold tracking-tight text-slate-900">
                      {formatNumber(occupancyRate)}%
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Occupancy rate
                    </p>
                  </div>

                  <p className="text-sm text-slate-500">
                    {formatNumber(
                      getMetric(overview, "occupiedRooms")
                    )}{" "}
                    of{" "}
                    {formatNumber(
                      getMetric(overview, "totalRooms")
                    )}{" "}
                    rooms
                  </p>
                </div>

                <div
                  className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Room occupancy rate"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(
                    100,
                    Math.max(0, Number(occupancyRate))
                  )}
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, Number(occupancyRate))
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                icon={BedDouble}
                title="Occupancy data unavailable"
                description="Connect the room and booking models to calculate the actual occupancy rate."
              />
            )}
          </article>

          <article className="rounded border border-slate-200 bg-white p-5 sm:p-6">
            <SectionHeading
              icon={CalendarCheck}
              title="Daily Operations"
              description="Guest movement and outstanding work."
            />

            {loading ? (
              <div className="flex min-h-24 items-center justify-center">
                <RefreshCw
                  size={20}
                  className="animate-spin text-indigo-600"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: "Guest arrivals",
                    value: getMetric(overview, "arrivalsToday"),
                    icon: ArrowDownRight,
                    color: "text-emerald-600",
                  },
                  {
                    label: "Guest departures",
                    value: getMetric(overview, "departuresToday"),
                    icon: ArrowUpRight,
                    color: "text-blue-600",
                  },
                  {
                    label: "Pending tasks",
                    value: getMetric(
                      overview,
                      "pendingHousekeepingTasks"
                    ),
                    icon: ClipboardList,
                    color: "text-amber-600",
                  },
                  {
                    label: "Outstanding payments",
                    value: getMetric(
                      overview,
                      "outstandingPayments"
                    ),
                    icon: Wallet,
                    color: "text-rose-600",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon
                          size={18}
                          className={item.color}
                        />

                        <span className="text-sm text-slate-600">
                          {item.label}
                        </span>
                      </div>

                      <span className="shrink-0 text-sm font-semibold text-slate-900">
                        {item.value === null ||
                        item.value === undefined
                          ? "—"
                          : formatNumber(item.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        {/* Daily Intelligence Report */}
        <section>
          <SectionHeading
            icon={Sparkles}
            title="Daily Intelligence Report"
            description="Highlights, risks, and recommended next steps."
          />

          {loading ? (
            <LoadingState />
          ) : dailyReport?.summary ||
            reportHighlights.length > 0 ||
            reportRisks.length > 0 ||
            recommendations.length > 0 ? (
            <div className="space-y-5">
              {dailyReport?.summary && (
                <div className="rounded border border-indigo-200 bg-indigo-50 p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles
                      size={20}
                      className="mt-0.5 shrink-0 text-indigo-600"
                    />

                    <div>
                      <h3 className="text-sm font-semibold text-indigo-950">
                        Executive Summary
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-indigo-900">
                        {dailyReport.summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <ReportList
                  title="Key Highlights"
                  items={reportHighlights}
                  icon={CheckCircle2}
                  tone="emerald"
                  emptyMessage="No verified highlights are available."
                />

                <ReportList
                  title="Risks and Issues"
                  items={reportRisks}
                  icon={AlertCircle}
                  tone="rose"
                  emptyMessage="No verified risks are available."
                />

                <ReportList
                  title="Recommended Actions"
                  items={recommendations}
                  icon={Sparkles}
                  tone="indigo"
                  emptyMessage="No recommendations are available."
                />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Daily report unavailable"
              description="A report will appear here when the backend generates verified hotel intelligence."
            />
          )}
        </section>

        {/* Operational Alerts */}
        <section>
          <SectionHeading
            icon={AlertCircle}
            title="Operational Alerts"
            description="Issues that may require management attention."
          />

          {loading ? (
            <LoadingState />
          ) : alertItems.length > 0 ? (
            <div className=" grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-2">
              {alertItems.map((alert, index) => (
                <AlertCard
                  key={
                    alert.id ||
                    alert._id ||
                    `${alert.title}-${index}`
                  }
                  alert={alert}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No operational alerts available"
              description={
                alerts?.status === "integration_pending"
                  ? "Connect housekeeping, maintenance, and booking data to detect real operational issues."
                  : "There are currently no alerts to display."
              }
            />
          )}
          
        </section>

        {/* Department Insights */}
        <section>
          <SectionHeading
            icon={Users}
            title="Department Insights"
            description="Operational status across hotel departments."
          />

          {loading ? (
            <LoadingState />
          ) : departmentData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(departmentData).map(
                ([department, data]) => (
                  <DepartmentCard
                    key={department}
                    department={department}
                    data={data}
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Department insights unavailable"
              description="Connect the hotel department services to display their operational status."
            />
          )}
        </section>

        {/* AI Chat */}
        <section id="ai-manager-chat">
          <SectionHeading
            icon={MessageCircleIcon}
            title="Ask AI Hotel Manager"
            description="Ask questions about your hotel's operations."
          />

          <AIManagerChat />
        </section>

     
      </div>
    </main>
  );
}

/* -------------------------------------------------------
   Report List
------------------------------------------------------- */

function ReportList({
  title,
  items,
  icon: Icon,
  tone,
  emptyMessage,
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };

  return (
    <article className="rounded border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded ${
            toneClasses[tone] || toneClasses.indigo
          }`}
        >
          <Icon size={18} />
        </div>

        <h3 className="text-sm font-semibold text-slate-900">
          {title}
        </h3>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item, index) => {
            const text =
              typeof item === "string"
                ? item
                : item?.message ||
                  item?.description ||
                  item?.title ||
                  JSON.stringify(item);

            return (
              <li
                key={`${title}-${index}`}
                className="flex items-start gap-2 text-sm leading-6 text-slate-600"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />

                <span className="break-words">{text}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          {emptyMessage}
        </p>
      )}
    </article>
  );
}

/* -------------------------------------------------------
   Operational Alert Card
------------------------------------------------------- */

function AlertCard({ alert }) {
  const severity = String(
    alert?.severity || "low"
  ).toLowerCase();

  const severityClasses = {
    critical: "border-red-200 bg-red-50 text-red-800",
    high: "border-orange-200 bg-orange-50 text-orange-800",
    medium: "border-amber-200 bg-amber-50 text-amber-800",
    low: "border-blue-200 bg-blue-50 text-blue-800",
  };

  const severityClass =
    severityClasses[severity] || severityClasses.low;

  return (
    <div className="">
        <article className="  gap-3 rounded border border-slate-200 bg-white p-4  sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${severityClass}`}
            >
              <AlertCircle size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold text-slate-900">
                {alert?.title || "Operational alert"}
              </h3>
              <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                {alert?.message ||
                  alert?.description ||
                  "Additional information is unavailable."}
              </p>
              {alert?.department && (
                <p className="mt-2 text-xs text-slate-500">
                  Department: {alert.department}
                </p>
              )}
            </div>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${severityClass}`}
          >
            {severity}
          </span>
        </article>
    </div>
  );
}

/* -------------------------------------------------------
   Department Card
------------------------------------------------------- */

function DepartmentCard({ department, data }) {
  const departmentLabels = {
    frontDesk: "Front Desk",
    housekeeping: "Housekeeping",
    maintenance: "Maintenance",
    billing: "Billing",
    foodAndBeverage: "Food & Beverage",
    banquet: "Banquet",
    cab: "Cab Services",
    inventory: "Inventory",
  };

  const label =
    departmentLabels[department] ||
    department.replace(/([A-Z])/g, " $1");

  const isConnected =
    data !== null && data !== undefined;

  const status =
    typeof data === "object" && data !== null
      ? data.status || "Available"
      : isConnected
        ? String(data)
        : "Not connected";

  return (
    <article className="rounded border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-600">
          <Building2 size={19} />
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            isConnected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        {label}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {isConnected
          ? "Department information is available."
          : "Connect this department to view its insights."}
      </p>
    </article>
  );
}

/* -------------------------------------------------------
   Chat section icon adapter
------------------------------------------------------- */

function MessageCircleIcon(props) {
  return <Activity {...props} />;
}
