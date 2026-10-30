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

function SectionHeading({ icon: Icon, title, description, action }) {
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-indigo-600 sm:h-10 sm:w-10">
          <Icon size={19} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
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
    <article className="min-w-0 rounded border border-slate-200 bg-white p-3 transition-colors duration-200  sm:p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{title}</p>

          <p className="mt-2 break-words text-xl font-semibold tracking-tight text-slate-900 sm:mt-3 sm:text-2xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded sm:h-11 sm:w-11 ${
            accentClasses[accent] || accentClasses.indigo
          }`}
        >
          <Icon size={21} />
        </div>
      </div>

      {description && (
        <p className="mt-2 text-[11px] leading-4 text-slate-500 sm:mt-3 sm:text-xs sm:leading-5">{description}</p>
      )}
    </article>
  );
}

function EmptyState({ icon: Icon = Activity, title, description }) {
  return (
    <div className="flex min-h-32 min-w-0 flex-col items-center justify-center rounded border border-dashed border-slate-300 px-3 py-6 text-center sm:min-h-36 sm:px-5 sm:py-8">
      <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-500 sm:h-11 sm:w-11">
        <Icon size={21} />
      </div>

      <h3 className="mt-3 text-xs font-semibold text-slate-800 sm:text-sm">{title}</h3>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded border border-slate-200 bg-white px-3 py-6 sm:min-h-52">
      <RefreshCw size={25} className="animate-spin text-indigo-600" />

      <p className="mt-3 text-sm font-medium text-slate-700">
        Loading hotel intelligence...
      </p>

      <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
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
      className="flex min-w-0 flex-col gap-3 rounded border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
      role="alert"
    >
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
        <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-600" />

        <div>
          <p className="text-sm font-semibold text-red-800">
            Unable to load some hotel information
          </p>

          <p className="mt-1 break-words text-sm text-red-700">{message}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-colors  sm:text-sm"
      >
        <RefreshCw size={15} />
        Retry
      </button>
    </div>
  );
}

export default function AIManagerPage() {
  const [overview, setOverview] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [departmentInsights, setDepartmentInsights] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [selectedDate, setSelectedDate] = useState(getCurrentDate);

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
          `${failureCount} request(s) failed. Check the backend API and authentication, then retry.`,
        );
      }

      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [selectedDate],
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
      value: formatNumber(getMetric(overview, "pendingHousekeepingTasks")),
      description: "Pending housekeeping tasks",
      icon: ClipboardList,
      accent: "rose",
    },
    {
      title: "Maintenance Tasks",
      value: formatNumber(getMetric(overview, "pendingMaintenanceTasks")),
      description: "Pending maintenance issues",
      icon: Wrench,
      accent: "amber",
    },
  ];

  const occupancyRate = getMetric(overview, "occupancyRate");

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

  const recommendations = Array.isArray(dailyReport?.recommendations)
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
    <main className="min-h-screen w-full min-w-0 ">
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 sm:space-y-6 lg:space-y-7">
        <header className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-indigo-100 bg-indigo-50 text-indigo-600 sm:h-12 sm:w-12 lg:h-14 lg:w-14">
              <Sparkles size={27} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                  Dashboard
                </h1>

                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 sm:px-2.5 sm:text-xs">
                  Intelligence Center
                </span>
              </div>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                Monitor hotel operations, review daily insights, identify
                operational risks, and ask your AI assistant for guidance.
              </p>

              <p className="mt-2 text-[11px] font-medium text-slate-500 sm:text-xs">
                {formatDate(selectedDate)}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto">
            <div className="flex min-w-0 items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 sm:w-auto">
              <CalendarClock size={17} className="text-slate-500" />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-w-0 flex-1 rounded border-0 bg-transparent text-xs text-slate-700 outline-none focus:ring-0 sm:flex-none sm:text-sm"
                aria-label="Select report date"
              />
            </div>

            <button
              type="button"
              onClick={() => loadDashboard({ showLoader: false })}
              disabled={refreshing || loading}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors  disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <ErrorBanner message={error} onRetry={() => loadDashboard()} />
        )}

        <section className="flex min-w-0 flex-col gap-3 rounded border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600 sm:h-10 sm:w-10">
              <Activity size={19} />
            </div>

            <div>
              <h2 className="text-xs font-semibold text-slate-900 sm:text-sm">
                AI Manager Service
              </h2>

              <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                {serviceStatus?.message ||
                  "Checking service availability and integrations."}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 sm:px-3 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500" />

            {getStatusLabel(
              serviceStatus?.status || overview?.status || "checking",
            )}
          </span>
        </section>

        {integrationPending && (
          <section className="rounded border border-amber-200 bg-amber-50 p-3 sm:p-4 lg:p-5">
            <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <h2 className="text-sm font-semibold text-amber-900">
                  Database integration required
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  The AI Manager backend currently returns integration status
                  placeholders. Connect the hotel database models and AI service
                  to display real operational metrics and recommendations.
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <SectionHeading
            icon={TrendingUp}
            title="Hotel Overview"
            description="Key operational metrics for the selected date."
          />

          {loading ? (
            <LoadingState />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.title} {...metric} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            icon={TrendingUp}
            title="Operational Analytics"
            description="Visual snapshots generated from the selected date's available hotel metrics."
          />

          {loading ? (
            <LoadingState />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 sm:gap-4 lg:gap-5">
              <article className="min-w-0 rounded border border-slate-200 bg-white p-3 transition-colors duration-200  sm:p-4 lg:p-5">
                <div className="mb-2 min-w-0">
                  <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">
                    Room Distribution
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                    Occupied and available room counts.
                  </p>
                </div>
                {roomChartData.length ? (
                  <div className="h-56 w-full min-w-0 sm:h-60 lg:h-64">
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
                              fill={
                                ["#4f46e5", "#10b981", "#94a3b8"][index % 3]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            formatNumber(value),
                            name,
                          ]}
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

              <article className="min-w-0 rounded border border-slate-200 bg-white p-3 transition-colors duration-200  sm:p-4 lg:p-5">
                <div className="mb-2 min-w-0">
                  <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">
                    Guest Movement
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                    Today's expected arrivals compared with departures.
                  </p>
                </div>
                {movementChartData.length ? (
                  <div className="h-56 w-full min-w-0 sm:h-60 lg:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={movementChartData}
                        margin={{ top: 12, right: 8, left: -18, bottom: 4 }}
                      >
                        <CartesianGrid
                          stroke="#e2e8f0"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="activity"
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [formatNumber(value), "Guests"]}
                          contentStyle={chartTooltipStyle}
                        />
                        <Bar
                          dataKey="guests"
                          name="Guests"
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={54}
                        />
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

              <article className="min-w-0 rounded border border-slate-200 bg-white p-3 transition-colors duration-200  sm:p-4 lg:p-5">
                <div className="mb-2 min-w-0">
                  <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">
                    Pending Workload
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                    Outstanding housekeeping and maintenance tasks.
                  </p>
                </div>
                {workloadChartData.length ? (
                  <div className="h-56 w-full min-w-0 sm:h-60 lg:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={workloadChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid
                          stroke="#e2e8f0"
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="department"
                          width={104}
                          tick={{ fill: "#64748b", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [formatNumber(value), "Tasks"]}
                          contentStyle={chartTooltipStyle}
                        />
                        <Bar
                          dataKey="tasks"
                          name="Pending tasks"
                          fill="#0d9488"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={32}
                        />
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

        <section className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4 lg:gap-5">
          <article className="min-w-0 rounded border border-slate-200 bg-white p-3 sm:p-4 lg:p-6">
            <SectionHeading
              icon={BedDouble}
              title="Room Occupancy"
              description="Current room utilization."
            />

            {loading ? (
              <div className="flex min-h-24 items-center justify-center">
                <RefreshCw size={20} className="animate-spin text-indigo-600" />
              </div>
            ) : validOccupancy ? (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                      {formatNumber(occupancyRate)}%
                    </p>

                    <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">
                      Occupancy rate
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 sm:text-sm">
                    {formatNumber(getMetric(overview, "occupiedRooms"))} of{" "}
                    {formatNumber(getMetric(overview, "totalRooms"))} rooms
                  </p>
                </div>

                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 sm:mt-5 sm:h-3"
                  role="progressbar"
                  aria-label="Room occupancy rate"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(
                    100,
                    Math.max(0, Number(occupancyRate)),
                  )}
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, Number(occupancyRate)),
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

          <article className="min-w-0 rounded border border-slate-200 bg-white p-3 sm:p-4 lg:p-6">
            <SectionHeading
              icon={CalendarCheck}
              title="Daily Operations"
              description="Guest movement and outstanding work."
            />

            {loading ? (
              <div className="flex min-h-24 items-center justify-center">
                <RefreshCw size={20} className="animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
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
                    value: getMetric(overview, "pendingHousekeepingTasks"),
                    icon: ClipboardList,
                    color: "text-amber-600",
                  },
                  {
                    label: "Outstanding payments",
                    value: getMetric(overview, "outstandingPayments"),
                    icon: Wallet,
                    color: "text-rose-600",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex min-w-0 items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <Icon size={18} className={item.color} />

                        <span className="min-w-0 break-words text-xs text-slate-600 sm:text-sm">
                          {item.label}
                        </span>
                      </div>

                      <span className="shrink-0 text-xs font-semibold text-slate-900 sm:text-sm">
                        {item.value === null || item.value === undefined
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
            <div className="space-y-3 sm:space-y-5">
              {dailyReport?.summary && (
                <div className="rounded border border-indigo-200 bg-indigo-50 p-3 sm:p-4 lg:p-5">
                  <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                    <Sparkles
                      size={20}
                      className="mt-0.5 shrink-0 text-indigo-600"
                    />

                    <div>
                      <h3 className="text-sm font-semibold text-indigo-950">
                        Executive Summary
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-indigo-900 sm:text-sm sm:leading-6">
                        {dailyReport.summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 sm:gap-4 lg:gap-5">
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

        <section>
          <SectionHeading
            icon={Users}
            title="Department Insights"
            description="Operational status across hotel departments."
          />

          {loading ? (
            <LoadingState />
          ) : departmentData ? (
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
              {Object.entries(departmentData).map(([department, data]) => (
                <DepartmentCard
                  key={department}
                  department={department}
                  data={data}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Department insights unavailable"
              description="Connect the hotel department services to display their operational status."
            />
          )}
        </section>

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

function ReportList({ title, items, icon: Icon, tone, emptyMessage }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };

  return (
    <article className="min-w-0 rounded border border-slate-200 bg-white p-3 transition-colors duration-200  sm:p-4 lg:p-5">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded ${
            toneClasses[tone] || toneClasses.indigo
          }`}
        >
          <Icon size={18} />
        </div>

        <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">{title}</h3>
      </div>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
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
                className="flex min-w-0 items-start gap-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />

                <span className="min-w-0 break-words">{text}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500 sm:mt-4 sm:text-sm sm:leading-6">{emptyMessage}</p>
      )}
    </article>
  );
}

function AlertCard({ alert }) {
  const severity = String(alert?.severity || "low").toLowerCase();

  const severityClasses = {
    critical: "border-red-200 bg-red-50 text-red-800",
    high: "border-orange-200 bg-orange-50 text-orange-800",
    medium: "border-amber-200 bg-amber-50 text-amber-800",
    low: "border-blue-200 bg-blue-50 text-blue-800",
  };

  const severityClass = severityClasses[severity] || severityClasses.low;

  return (
    <div className="">
      <article className="flex min-w-0 flex-col gap-3 rounded border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${severityClass}`}
          >
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-xs font-semibold text-slate-900 sm:text-sm">
              {alert?.title || "Operational alert"}
            </h3>
            <p className="mt-1 break-words text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
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
    departmentLabels[department] || department.replace(/([A-Z])/g, " $1");

  const isConnected = data !== null && data !== undefined;

  const status =
    typeof data === "object" && data !== null
      ? data.status || "Available"
      : isConnected
        ? String(data)
        : "Not connected";

  return (
    <article className="min-w-0 rounded border border-slate-200 bg-white p-3 transition-colors duration-200  sm:p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600 sm:h-10 sm:w-10">
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

      <h3 className="mt-3 text-xs font-semibold text-slate-900 sm:mt-4 sm:text-sm">{label}</h3>

      <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
        {isConnected
          ? "Department information is available."
          : "Connect this department to view its insights."}
      </p>
    </article>
  );
}

function MessageCircleIcon(props) {
  return <Activity {...props} />;
}
