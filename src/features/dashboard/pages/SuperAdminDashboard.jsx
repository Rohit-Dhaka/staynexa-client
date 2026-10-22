
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BedDouble,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Download,
  LayoutDashboard,
  PartyPopper,
  RefreshCw,
  Star,
  TicketPercent,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import { getDashboardData } from "../services/dashboard.service";

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

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5  transition hover:-translate-y-0.5 hover:">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className={`rounded p-3 ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white ">
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

function ModuleHealth({ name, module }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium capitalize text-slate-800">
          {name.replace(/([A-Z])/g, " $1")}
        </p>
        {!module?.ok && (
          <p className="mt-1 break-words text-xs text-rose-600">
            {module?.error || "Request failed"}
          </p>
        )}
      </div>

      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
          module?.ok
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700"
        }`}
      >
        {module?.ok ? "Loaded" : "Failed"}
      </span>
    </div>
  );
}

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
              {items.slice(0, 10).map((booking, index) => (
                <tr
                  key={booking._id || booking.id || index}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {readText(booking, ["bookingNumber", "_id", "id"])}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {readText(booking, [
                      "guestDetails.name",
                      "guest.name",
                      "guestName",
                    ], "Guest")}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {dateLabel(booking.checkIn)}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {money(booking.totalAmount)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(booking.status)}`}
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
    <Panel title="Recent Guests" subtitle="Guest records from the guest module">
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
          {items.slice(0, 5).map((guest, index) => (
            <div
              key={guest._id || guest.id || index}
              className="flex items-center gap-3 px-5 py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">
                {String(guest.name || guest.guestDetails?.name || "G")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {readText(guest, ["name", "guestDetails.name"], "Guest")}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {readText(guest, ["phone", "guestDetails.phone"], "No phone number")}
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
          "Unable to load the dashboard."
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
      <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-slate-50 text-slate-600">
        <RefreshCw size={20} className="animate-spin" />
        <span className="text-sm font-medium">Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboard && pageError) {
    return (
      <main className="min-h-[60vh] bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded border border-rose-200 bg-white p-6 ">
          <AlertCircle className="text-rose-600" size={28} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Dashboard Unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-600">{pageError}</p>
          <button
            onClick={() => loadDashboard()}
            className="mt-5 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white "
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
  const offers = d.offers?.data;
  const expenses = d.expenses?.data;

  const totalRooms = readValue(rooms, [
    "totalRooms", "total", "stats.totalRooms", "summary.totalRooms",
  ]);

  const availableRooms = readValue(rooms, [
    "availableRooms", "available", "stats.availableRooms", "summary.availableRooms",
  ]);

  const occupiedRooms = readValue(rooms, [
    "occupiedRooms", "occupied", "stats.occupiedRooms", "summary.occupiedRooms",
  ]);

  const bookingsCount = readCount(d.bookings);
  const guestsCount = readCount(d.guests);
  const staffCount = readCount(d.staff);

  const occupancyRate =
    readValue(rooms, ["occupancyRate", "stats.occupancyRate", "summary.occupancyRate"]) ??
    (totalRooms > 0 && occupiedRooms !== null
      ? Math.round((occupiedRooms / totalRooms) * 100)
      : null);

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

  const offerCount = readCount(d.offers);
  const expenseCount = readCount(d.expenses);

  const moduleEntries = [
    ["rooms", d.rooms],
    ["bookings", d.bookings],
    ["guests", d.guests],
    ["frontDesk", d.frontDesk],
    ["payments", d.payments],
    ["revenue", d.revenue],
    ["bills", d.bills],
    ["staff", d.staff],
    ["attendance", d.attendance],
    ["payroll", d.payroll],
    ["banquet", d.banquet],
    ["housekeeping", d.housekeeping],
    ["guestRequests", d.guestRequests],
    ["reviews", d.reviews],
    ["offers", d.offers],
    ["expenses", d.expenses],
  ];

  const failedCount = d.failedModules || 0;
  const currentPeriod = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const displayMetric = (value, formatter = number) =>
    value === null || value === undefined ? "—" : formatter(value);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <div className="rounded bg-black p-3 text-white ">
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
              className="inline-flex items-center gap-2 rounded bg-black px-4 py-3 text-sm font-semibold text-white  transition  disabled:opacity-60"
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
                Other available data is displayed below. Check Module Health for failed requests.
              </p>
            </div>
          </div>
        )}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-900">Property Overview</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Rooms"
              value={displayMetric(totalRooms)}
              subtitle="Registered property rooms"
              icon={BedDouble}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              title="Available Rooms"
              value={displayMetric(availableRooms)}
              subtitle="Availability reported by the API"
              icon={CheckCircle2}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              title="Occupied Rooms"
              value={displayMetric(occupiedRooms)}
              subtitle="Occupancy reported by the API"
              icon={Users}
              color="bg-sky-50 text-sky-600"
            />
            <StatCard
              title="Occupancy Rate"
              value={occupancyRate === null ? "—" : `${occupancyRate}%`}
              subtitle="Current room occupancy"
              icon={Activity}
              color="bg-violet-50 text-violet-600"
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarCheck size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-900">Bookings & Guests</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Bookings"
              value={displayMetric(bookingsCount)}
              subtitle="Count reported by booking API"
              icon={CalendarCheck}
              color="bg-black text-blue-600"
            />
            <StatCard
              title="Registered Guests"
              value={displayMetric(guestsCount)}
              subtitle="Count reported by guest API"
              icon={Users}
              color="bg-teal-50 text-teal-600"
            />
            <StatCard
              title="Banquet Bookings"
              value={displayMetric(banquetCount)}
              subtitle="Banquet module summary"
              icon={PartyPopper}
              color="bg-purple-50 text-purple-600"
            />
            <StatCard
              title="Guest Requests"
              value={displayMetric(guestRequestCount)}
              subtitle="Guest service requests"
              icon={Clock3}
              color="bg-orange-50 text-orange-600"
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-900">Financial Overview</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Revenue"
              value={displayMetric(revenueAmount, money)}
              subtitle="Revenue summary returned by the API"
              icon={Wallet}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              title="Payments Collected"
              value={displayMetric(collectedAmount, money)}
              subtitle="Collection summary returned by the API"
              icon={CreditCard}
              color="bg-sky-50 text-sky-600"
            />
            <StatCard
              title="Outstanding Balance"
              value={displayMetric(outstandingAmount, money)}
              subtitle="Outstanding amount reported by the API"
              icon={DollarSign}
              color="bg-amber-50 text-amber-600"
            />
            <StatCard
              title="Monthly Payroll"
              value={displayMetric(payrollAmount, money)}
              subtitle="Current period payroll summary"
              icon={Wallet}
              color="bg-rose-50 text-rose-600"
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-900">Operations & Business</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Staff Records"
              value={displayMetric(staffCount)}
              subtitle="Count reported by staff API"
              icon={Users}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              title="Housekeeping Tasks"
              value={displayMetric(housekeepingCount)}
              subtitle="Housekeeping module records"
              icon={Wrench}
              color="bg-orange-50 text-orange-600"
            />
            <StatCard
              title="Active Business Offers"
              value={displayMetric(offerCount)}
              subtitle="Offer records returned by the API"
              icon={TicketPercent}
              color="bg-pink-50 text-pink-600"
            />
            <StatCard
              title="Reviews"
              value={displayMetric(reviewCount)}
              subtitle="Review summary returned by the API"
              icon={Star}
              color="bg-yellow-50 text-yellow-600"
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <RecentBookings bookings={d.bookings} />
          <RecentGuests guests={d.guests} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel
            title="Staff & Operational Summary"
            subtitle="Data available from staff, attendance and operations modules"
          >
            <div className="divide-y divide-slate-100 px-5">
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-600">Staff records</span>
                <span className="font-semibold text-slate-900">
                  {displayMetric(staffCount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-600">Housekeeping tasks</span>
                <span className="font-semibold text-slate-900">
                  {displayMetric(housekeepingCount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-600">Guest service requests</span>
                <span className="font-semibold text-slate-900">
                  {displayMetric(guestRequestCount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-600">Business expenses records</span>
                <span className="font-semibold text-slate-900">
                  {displayMetric(expenseCount)}
                </span>
              </div>
            </div>
          </Panel>

          <Panel
            title="Module Health"
            subtitle={`${d.totalModules || moduleEntries.length} connected dashboard modules`}
            action={
              failedCount === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} /> All loaded
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {failedCount} failed
                </span>
              )
            }
          >
            <div className="px-5 py-1">
              {moduleEntries.map(([name, module]) => (
                <ModuleHealth key={name} name={name} module={module} />
              ))}
            </div>
          </Panel>
        </section>

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
