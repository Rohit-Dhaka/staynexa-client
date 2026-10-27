import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Bell,
  CalendarCheck,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  PartyPopper,
  Receipt,
  RefreshCw,
  Star,
  TicketPercent,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wallet,
  Wrench,
} from "lucide-react";

import { getDashboardData } from "../services/dashboard.service";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const number = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const readValue = (data, paths) => {
  for (const path of paths) {
    const value = path.split(".").reduce((obj, key) => obj?.[key], data);

    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return null;
};

const readText = (data, paths, fallback = "—") => {
  for (const path of paths) {
    const value = path.split(".").reduce((obj, key) => obj?.[key], data);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const readItems = (module) => module?.data?.items || [];

const readCount = (module) => {
  if (!module?.ok) return null;

  if (module.data?.total !== null && module.data?.total !== undefined) {
    return module.data.total;
  }

  return readItems(module).length;
};

const dateLabel = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const show = (value, formatter = number) =>
  value === null || value === undefined ? "—" : formatter(value);

const statusStyle = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    ["confirmed", "checked_in", "active", "paid", "completed", "approved"].includes(value)
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    ["pending", "hold", "on_hold", "requested", "in_progress", "assigned"].includes(value)
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    ["cancelled", "canceled", "failed", "inactive", "rejected", "void"].includes(value)
  ) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
};

const TONES = {
  blue: "bg-blue-50 text-blue-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  teal: "bg-teal-50 text-teal-600",
  violet: "bg-violet-50 text-violet-600",
  purple: "bg-purple-50 text-purple-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  rose: "bg-rose-50 text-rose-600",
  pink: "bg-pink-50 text-pink-600",
  yellow: "bg-yellow-50 text-yellow-600",
  slate: "bg-slate-100 text-slate-600",
};

/* -------------------------------------------------------------------------- */
/* Reusable UI                                                                 */
/* -------------------------------------------------------------------------- */

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-900 text-white">
        <Icon size={16} />
      </div>
      <div>
        <h2 className="font-bold leading-tight text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, hint, icon: Icon, tone = "blue" }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className={`shrink-0 rounded p-2.5 ${TONES[tone] || TONES.blue}`}>
          <Icon size={19} />
        </div>
      </div>

      {hint && <p className="mt-2 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone = "slate" }) {
  return (
    <div className="flex items-center gap-3 rounded border border-slate-100 bg-slate-50/70 p-3">
      {Icon && (
        <div className={`rounded p-2 ${TONES[tone] || TONES.slate}`}>
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-base font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ value, tone = "bg-indigo-600" }) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function ModuleChip({ name, module }) {
  const ok = Boolean(module?.ok);

  return (
    <div
      title={ok ? "Loaded" : module?.error || "Request failed"}
      className={`flex items-center justify-between gap-2 rounded border px-3 py-2 ${
        ok
          ? "border-emerald-100 bg-emerald-50/50"
          : "border-rose-200 bg-rose-50"
      }`}
    >
      <span className="truncate text-xs font-medium capitalize text-slate-700">
        {name.replace(/([A-Z])/g, " $1")}
      </span>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          ok ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent lists                                                                */
/* -------------------------------------------------------------------------- */

function RecentBookings({ bookings }) {
  const items = readItems(bookings);

  return (
    <Panel
      title="Recent Bookings"
      subtitle="Latest booking records returned by the API"
    >
      {items.length === 0 ? (
        <EmptyState
          message={
            bookings?.ok
              ? "No booking records were returned."
              : "Booking data is currently unavailable."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Booking</th>
                <th className="px-5 py-3 font-semibold">Guest</th>
                <th className="px-5 py-3 font-semibold">Check-in</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.slice(0, 8).map((booking, index) => (
                <tr
                  key={booking._id || booking.id || index}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-800">
                    {readText(booking, ["bookingNumber", "_id", "id"])}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {readText(
                      booking,
                      ["guestDetails.name", "guest.name", "guestName"],
                      "Guest",
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {dateLabel(booking.checkIn)}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {money(booking.totalAmount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle(booking.status)}`}
                    >
                      {String(booking.status || "Unknown").replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function RecentGuests({ guests }) {
  const items = readItems(guests);

  return (
    <Panel title="Recent Guests" subtitle="Newest guest records">
      {items.length === 0 ? (
        <EmptyState
          message={
            guests?.ok
              ? "No guest records were returned."
              : "Guest data is currently unavailable."
          }
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {items.slice(0, 6).map((guest, index) => (
            <div
              key={guest._id || guest.id || index}
              className="flex items-center gap-3 px-5 py-3.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                {String(guest.name || guest.guestDetails?.name || "G")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {readText(guest, ["name", "guestDetails.name"], "Guest")}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {readText(
                    guest,
                    ["phone", "guestDetails.phone"],
                    "No phone number",
                  )}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {dateLabel(guest.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function SuperAdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError("");

    try {
      const result = await getDashboardData();
      setDashboard(result);
    } catch (error) {
      setPageError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load the dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600">
        <RefreshCw size={20} className="animate-spin" />
        <span className="text-sm font-medium">Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboard && pageError) {
    return (
      <main className="min-h-[60vh] p-6">
        <div className="mx-auto max-w-xl rounded border border-rose-200 bg-white p-6">
          <AlertCircle className="text-rose-600" size={28} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Dashboard Unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-600">{pageError}</p>
          <button
            onClick={() => loadDashboard()}
            className="mt-5 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const d = dashboard || {};

  const rooms = d.rooms?.data;
  const frontDesk = d.frontDesk?.data;
  const payments = d.payments?.data;
  const revenue = d.revenue?.data;
  const payroll = d.payroll?.data;
  const banquet = d.banquet?.data;
  const housekeeping = d.housekeeping?.data;
  const guestRequests = d.guestRequests?.data;
  const reviews = d.reviews?.data;

  /* ------------------------------ Rooms ------------------------------ */

  const totalRooms = readValue(rooms, [
    "totalRooms", "total", "stats.totalRooms", "summary.totalRooms",
  ]);

  const availableRooms = readValue(rooms, [
    "availableRooms", "available", "stats.availableRooms", "summary.availableRooms",
  ]);

  const occupiedRooms = readValue(rooms, [
    "occupiedRooms", "occupied", "stats.occupiedRooms", "summary.occupiedRooms",
  ]);

  const occupancyRate =
    readValue(rooms, [
      "occupancyRate", "stats.occupancyRate", "summary.occupancyRate",
    ]) ??
    (totalRooms > 0 && occupiedRooms !== null
      ? Math.round((occupiedRooms / totalRooms) * 100)
      : null);

  /* -------------------------- Front desk today -------------------------- */

  const arrivals = readValue(frontDesk, [
    "counts.arrivals", "arrivals", "arrivalsToday", "summary.arrivals",
  ]);

  const departures = readValue(frontDesk, [
    "counts.departures", "departures", "departuresToday", "summary.departures",
  ]);

  const inHouse = readValue(frontDesk, [
    "counts.inHouse", "inHouse", "inHouseGuests", "summary.inHouse",
  ]);

  /* ------------------------------ Counts ------------------------------ */

  const bookingsCount = readCount(d.bookings);
  const guestsCount = readCount(d.guests);
  const staffCount = readCount(d.staff);
  const attendanceCount = readCount(d.attendance);
  const billsCount = readCount(d.bills);
  const offerCount = readCount(d.offers);
  const expenseCount = readCount(d.expenses);

  const banquetCount = readValue(banquet, [
    "totalBookings", "bookingsCount", "summary.totalBookings",
  ]);

  const housekeepingCount =
    readValue(housekeeping, ["total", "totalTasks", "summary.total"]) ??
    readCount(d.housekeeping);

  const guestRequestCount = readValue(guestRequests, [
    "total", "totalRequests", "summary.totalRequests",
  ]);

  const reviewCount = readValue(reviews, [
    "total", "totalReviews", "summary.totalReviews",
  ]);

  const averageRating = readValue(reviews, [
    "averageRating", "avgRating", "average", "summary.averageRating",
  ]);

  const pendingRequests = readValue(guestRequests, [
    "pending", "byStatus.pending", "counts.pending", "summary.pending",
  ]);

  const pendingHousekeeping = readValue(housekeeping, [
    "pending", "byStatus.pending", "counts.pending", "summary.pending",
  ]);

  /* ------------------------------ Money ------------------------------- */

  const revenueAmount = readValue(revenue, [
    "totalRevenue", "revenue", "total", "summary.totalRevenue", "collectedAmount",
  ]);

  const collectedAmount = readValue(payments, [
    "totalCollected", "collectedAmount", "totalPaid", "summary.totalCollected",
  ]);

  const outstandingAmount = readValue(payments, [
    "outstandingAmount", "totalOutstanding", "balanceAmount", "summary.outstandingAmount",
  ]);

  const payrollAmount = readValue(payroll, [
    "totalPayable", "netPayable", "totalSalary", "summary.totalPayable",
  ]);

  const billedTotal = (collectedAmount ?? 0) + (outstandingAmount ?? 0);
  const collectionRate =
    collectedAmount !== null && outstandingAmount !== null && billedTotal > 0
      ? Math.round((collectedAmount / billedTotal) * 100)
      : null;

  /* ----------------------------- Modules ------------------------------ */

  const moduleEntries = Object.entries(d).filter(
    ([, value]) =>
      value && typeof value === "object" && "ok" in value,
  );

  const failedCount =
    d.failedModules ?? moduleEntries.filter(([, value]) => !value.ok).length;

  const totalModules = d.totalModules || moduleEntries.length;

  const currentPeriod = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  /* ---------------------- Operations (extra modules) ---------------------- */

  const operations = [
    {
      title: "Staff",
      value: show(staffCount),
      hint: "Staff records",
      icon: Users,
      tone: "blue",
    },
    {
      title: "Attendance",
      value: show(attendanceCount),
      hint: "Attendance records",
      icon: UserCheck,
      tone: "teal",
    },
    {
      title: "Housekeeping",
      value: show(housekeepingCount),
      hint:
        pendingHousekeeping !== null
          ? `${number(pendingHousekeeping)} pending`
          : "Housekeeping tasks",
      icon: ClipboardList,
      tone: "orange",
    },
    {
      title: "Guest Requests",
      value: show(guestRequestCount),
      hint:
        pendingRequests !== null
          ? `${number(pendingRequests)} pending`
          : "Service requests",
      icon: Bell,
      tone: "rose",
    },
    {
      title: "Banquet",
      value: show(banquetCount),
      hint: "Banquet bookings",
      icon: PartyPopper,
      tone: "purple",
    },
    {
      title: "Offers",
      value: show(offerCount),
      hint: "Offer records",
      icon: TicketPercent,
      tone: "pink",
    },
    {
      title: "Reviews",
      value: show(reviewCount),
      hint: averageRating !== null ? `Average ${averageRating} / 5` : "Guest reviews",
      icon: Star,
      tone: "yellow",
    },
    {
      title: "Bills",
      value: show(billsCount),
      hint: "Billing records",
      icon: Receipt,
      tone: "sky",
    },
    {
      title: "Expenses",
      value: show(expenseCount),
      hint: "Expense records",
      icon: Wallet,
      tone: "amber",
    },
    // Shown only when the dashboard service returns these modules.
    {
      title: "Cab Services",
      value: show(readCount(d.cab)),
      hint: "Cab bookings",
      icon: Car,
      tone: "emerald",
      visible: d.cab !== undefined,
    },
    {
      title: "Restaurant",
      value: show(readCount(d.restaurant)),
      hint: "Restaurant records",
      icon: UtensilsCrossed,
      tone: "orange",
      visible: d.restaurant !== undefined,
    },
    {
      title: "Maintenance",
      value: show(readCount(d.maintenance)),
      hint: "Maintenance records",
      icon: Wrench,
      tone: "slate",
      visible: d.maintenance !== undefined,
    },
  ].filter((item) => item.visible !== false);

  /* --------------------------- Needs attention --------------------------- */

  const attention = [];

  if (failedCount > 0) {
    attention.push({
      tone: "amber",
      title: `${failedCount} module(s) failed to load`,
      text: "Check Module Health below for the failed requests.",
    });
  }

  if ((outstandingAmount ?? 0) > 0) {
    attention.push({
      tone: "rose",
      title: `${money(outstandingAmount)} outstanding`,
      text: "Unpaid balance is waiting to be collected.",
    });
  }

  if ((pendingRequests ?? 0) > 0) {
    attention.push({
      tone: "orange",
      title: `${number(pendingRequests)} guest request(s) pending`,
      text: "Open the Front Desk Request tab to reply or update status.",
    });
  }

  if ((pendingHousekeeping ?? 0) > 0) {
    attention.push({
      tone: "amber",
      title: `${number(pendingHousekeeping)} housekeeping task(s) pending`,
      text: "Tasks are waiting to be assigned or completed.",
    });
  }

  if ((occupancyRate ?? 0) >= 90) {
    attention.push({
      tone: "blue",
      title: "Very high occupancy",
      text: `Occupancy is at ${occupancyRate}%. Few rooms are left to sell.`,
    });
  }

  const attentionStyles = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1600px] space-y-8">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <div className="rounded bg-black p-3 text-white">
              <LayoutDashboard size={26} />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-600">
                StayNexa Management
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Super Admin Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Property performance, hotel operations and business overview.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded border border-slate-200 bg-white px-4 py-2.5">
              <p className="text-xs text-slate-500">Reporting period</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {currentPeriod}
              </p>
            </div>
            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded bg-black px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </header>

        {pageError && (
          <div className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {pageError}
          </div>
        )}

        {failedCount > 0 && (
          <div className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                {failedCount} dashboard module(s) could not be loaded.
              </p>
              <p className="mt-1">
                Other available data is displayed below. Check Module Health
                for failed requests.
              </p>
            </div>
          </div>
        )}

        {/* Key metrics */}
        <section>
          <SectionTitle
            icon={Activity}
            title="Key Metrics"
            description="The most important numbers at a glance."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <KpiCard
              title="Occupancy Rate"
              value={occupancyRate === null ? "—" : `${occupancyRate}%`}
              hint={
                occupiedRooms !== null && totalRooms !== null
                  ? `${number(occupiedRooms)} of ${number(totalRooms)} rooms`
                  : "Current room occupancy"
              }
              icon={BedDouble}
              tone="blue"
            />
            <KpiCard
              title="Revenue"
              value={show(revenueAmount, money)}
              hint="Revenue summary"
              icon={Wallet}
              tone="emerald"
            />
            <KpiCard
              title="Outstanding"
              value={show(outstandingAmount, money)}
              hint="Balance to collect"
              icon={DollarSign}
              tone="amber"
            />
            <KpiCard
              title="Bookings"
              value={show(bookingsCount)}
              hint="Total booking records"
              icon={CalendarCheck}
              tone="violet"
            />
            <KpiCard
              title="Guests"
              value={show(guestsCount)}
              hint="Registered guests"
              icon={Users}
              tone="teal"
            />
            <KpiCard
              title="Guest Requests"
              value={show(guestRequestCount)}
              hint={
                pendingRequests !== null
                  ? `${number(pendingRequests)} pending`
                  : "Service requests"
              }
              icon={Clock3}
              tone="rose"
            />
          </div>
        </section>

        {/* Rooms + attention */}
        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            title="Rooms & Front Desk"
            subtitle="Room utilization and today's guest movement"
          >
            <div className="space-y-6 p-5">
              <div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-bold tracking-tight text-slate-900">
                      {occupancyRate === null ? "—" : `${occupancyRate}%`}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Room occupancy
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {show(occupiedRooms)} of {show(totalRooms)} rooms occupied
                  </p>
                </div>

                <div className="mt-4">
                  <ProgressBar value={occupancyRate} tone="bg-indigo-600" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Total rooms"
                  value={show(totalRooms)}
                  icon={BedDouble}
                  tone="blue"
                />
                <MiniStat
                  label="Occupied"
                  value={show(occupiedRooms)}
                  icon={Users}
                  tone="sky"
                />
                <MiniStat
                  label="Available"
                  value={show(availableRooms)}
                  icon={CheckCircle2}
                  tone="emerald"
                />
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Today at the front desk
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="Arrivals"
                    value={show(arrivals)}
                    icon={ArrowDownRight}
                    tone="violet"
                  />
                  <MiniStat
                    label="Departures"
                    value={show(departures)}
                    icon={ArrowUpRight}
                    tone="amber"
                  />
                  <MiniStat
                    label="In-house guests"
                    value={show(inHouse)}
                    icon={Users}
                    tone="teal"
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Needs Attention"
            subtitle="Items that may need your action"
            action={
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                  attention.length === 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {attention.length === 0 ? "All clear" : `${attention.length} item(s)`}
              </span>
            }
          >
            <div className="space-y-3 p-5">
              {attention.length === 0 ? (
                <div className="flex items-center gap-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 size={20} className="shrink-0" />
                  Nothing needs your attention right now.
                </div>
              ) : (
                attention.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded border p-3.5 ${attentionStyles[item.tone] || attentionStyles.amber}`}
                  >
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs opacity-90">{item.text}</p>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        {/* Financial */}
        <section>
          <SectionTitle
            icon={DollarSign}
            title="Financial Overview"
            description="Revenue, collections and payroll."
          />

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard
                title="Revenue"
                value={show(revenueAmount, money)}
                hint="Revenue summary returned by the API"
                icon={Wallet}
                tone="emerald"
              />
              <KpiCard
                title="Payments Collected"
                value={show(collectedAmount, money)}
                hint="Collections received"
                icon={CreditCard}
                tone="sky"
              />
              <KpiCard
                title="Outstanding Balance"
                value={show(outstandingAmount, money)}
                hint="Still to be collected"
                icon={DollarSign}
                tone="amber"
              />
              <KpiCard
                title="Monthly Payroll"
                value={show(payrollAmount, money)}
                hint="Current period payroll"
                icon={Wallet}
                tone="rose"
              />
            </div>

            <Panel
              title="Collection Progress"
              subtitle="Collected vs. outstanding"
            >
              <div className="space-y-4 p-5">
                {collectionRate === null ? (
                  <p className="text-sm text-slate-500">
                    Collection data is not available yet.
                  </p>
                ) : (
                  <>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold text-slate-900">
                        {collectionRate}%
                      </p>
                      <p className="text-xs text-slate-500">collected</p>
                    </div>

                    <ProgressBar value={collectionRate} tone="bg-emerald-500" />

                    <div className="grid grid-cols-2 gap-3">
                      <MiniStat
                        label="Collected"
                        value={money(collectedAmount)}
                      />
                      <MiniStat
                        label="Outstanding"
                        value={money(outstandingAmount)}
                      />
                    </div>
                  </>
                )}
              </div>
            </Panel>
          </div>
        </section>

        {/* Operations */}
        <section>
          <SectionTitle
            icon={ClipboardList}
            title="Operations & Business"
            description="Every hotel module in one place."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {operations.map((item) => (
              <KpiCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        {/* Recent */}
        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <RecentBookings bookings={d.bookings} />
          <RecentGuests guests={d.guests} />
        </section>

        {/* Module health */}
        <Panel
          title="Module Health"
          subtitle={`${totalModules} connected dashboard modules`}
          action={
            failedCount === 0 ? (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} /> All loaded
              </span>
            ) : (
              <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {failedCount} failed
              </span>
            )
          }
        >
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
            {moduleEntries.map(([name, module]) => (
              <ModuleChip key={name} name={name} module={module} />
            ))}
          </div>

          {failedCount > 0 && (
            <div className="space-y-1 border-t border-slate-100 px-5 py-4">
              {moduleEntries
                .filter(([, module]) => !module.ok)
                .map(([name, module]) => (
                  <p key={name} className="break-words text-xs text-rose-600">
                    <span className="font-semibold capitalize">
                      {name.replace(/([A-Z])/g, " $1")}:
                    </span>{" "}
                    {module?.error || "Request failed"}
                  </p>
                ))}
            </div>
          )}
        </Panel>

        <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>StayNexa Super Admin Dashboard</span>
          <span>
            Last updated:{" "}
            {d.generatedAt
              ? new Date(d.generatedAt).toLocaleString("en-IN")
              : "Not available"}
          </span>
        </footer>
      </div>
    </main>
  );
}