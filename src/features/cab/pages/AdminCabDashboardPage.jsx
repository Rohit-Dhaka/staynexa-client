import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  XCircle,
} from "lucide-react";

import {
  getCabBookings,
  getCabDrivers,
  getCabVehicles,
  getCabRates,
} from "../services/cab.service";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const CAB_STATUSES = {
  requested: {
    label: "Requested",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-black text-blue-700 border-blue-200",
  },
  assigned: {
    label: "Assigned",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-black text-indigo-700 border-indigo-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/admin/cab",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Bookings",
    path: "/admin/cab/bookings",
    icon: CarFront,
  },
  {
    label: "Dispatch",
    path: "/admin/cab/dispatch",
    icon: Activity,
  },
  {
    label: "Vehicles",
    path: "/admin/cab/vehicles",
    icon: Truck,
  },
  {
    label: "Drivers",
    path: "/admin/cab/drivers",
    icon: Users,
  },
  {
    label: "Rates",
    path: "/admin/cab/rates",
    icon: Settings2,
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getList(response) {
  if (Array.isArray(response)) return response;

  // Support the API's common response envelopes, including cab service's
  // { cabs, meta } response and axios-style nested data wrappers.
  const candidates = [
    response?.cabs,
    response?.items,
    response?.bookings,
    response?.vehicles,
    response?.drivers,
    response?.rates,
    response?.results,
    response?.data,
    response?.data?.cabs,
    response?.data?.items,
    response?.data?.bookings,
    response?.data?.vehicles,
    response?.data?.drivers,
    response?.data?.results,
    response?.data?.data,
    response?.data?.data?.cabs,
    response?.data?.data?.items,
    response?.data?.data?.bookings,
    response?.data?.data?.results,
  ];

  return candidates.find(Array.isArray) || [];
}

function getId(item) {
  return item?._id || item?.id || "";
}

function getBookingGuest(booking) {
  return (
    booking?.guest?.name ||
    booking?.guest?.fullName ||
    booking?.passenger?.name ||
    booking?.guestName ||
    booking?.guestDetails?.name ||
    booking?.customer?.name ||
    booking?.name ||
    "Guest"
  );
}

function getBookingPhone(booking) {
  return (
    booking?.guest?.phone ||
    booking?.guest?.mobile ||
    booking?.passenger?.phone ||
    booking?.guestPhone ||
    booking?.guestDetails?.phone ||
    booking?.customer?.phone ||
    booking?.phone ||
    ""
  );
}

function getPickupLocation(booking) {
  const pickup = booking?.pickupLocation ?? booking?.pickup;

  if (typeof pickup === "string") return pickup;

  return (
    pickup?.address ||
    pickup?.name ||
    pickup?.location ||
    pickup?.place ||
    booking?.pickupAddress ||
    booking?.pickup?.address ||
    booking?.pickup?.name ||
    "Not specified"
  );
}

function getDropLocation(booking) {
  const drop = booking?.dropLocation ?? booking?.drop;

  if (typeof drop === "string") return drop;

  return (
    drop?.address ||
    drop?.name ||
    drop?.location ||
    drop?.place ||
    booking?.dropAddress ||
    booking?.destination ||
    booking?.drop?.address ||
    booking?.drop?.name ||
    "Not specified"
  );
}

function getBookingDate(booking) {
  return (
    booking?.pickupAt ||
    booking?.pickupDateTime ||
    booking?.pickupDate ||
    booking?.createdAt ||
    booking?.date ||
    null
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getBookingAmount(booking) {
  return (
    booking?.finalFare ??
    booking?.totalFare ??
    booking?.estimatedFare ??
    booking?.fare ??
    booking?.estimate?.total ??
    booking?.estimate?.totalFare ??
    booking?.estimate?.fare ??
    booking?.estimate?.amount ??
    booking?.pricing?.total ??
    booking?.pricing?.totalFare ??
    0
  );
}

function normalizeStatus(status) {
  return String(status || "requested")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isActiveVehicle(vehicle) {
  return vehicle?.isActive === true || vehicle?.status === "active";
}

function isActiveDriver(driver) {
  return driver?.isActive === true || driver?.status === "active";
}

function isSameDay(value) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load cab dashboard data."
  );
}

function getDisplayName(value) {
  if (typeof value === "string") return value;

  return (
    value?.name ||
    value?.fullName ||
    value?.vehicleNumber ||
    value?.registrationNumber ||
    value?.plateNumber ||
    "—"
  );
}

/* -------------------------------------------------------------------------- */
/* Small Components                                                           */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const config = CAB_STATUSES[normalized] || {
    label: normalized.replace(/_/g, " "),
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function SectionHeading({ title, description, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>

        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>

      {action}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass = "bg-black text-blue-700",
  footer,
}) {
  return (
    <div className="rounded border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>

          {description && (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>

      {footer && (
        <div className="mt-4 border-t border-gray-100 pt-3">{footer}</div>
      )}
    </div>
  );
}

function QuickActionCard({ title, description, path, icon: Icon }) {
  return (
    <Link
      to={path}
      className="group flex items-center gap-4 rounded border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-black/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-700 transition-colors group-hover:border-blue-200 group-hover:bg-black group-hover:text-blue-700">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>

      <ArrowRight
        size={18}
        className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700"
      />
    </Link>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 px-5 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <CarFront size={23} />
      </div>

      <p className="mt-4 text-sm font-semibold text-gray-800">
        No bookings found
      </p>

      <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Dashboard                                                             */
/* -------------------------------------------------------------------------- */

export default function AdminCabDashboardPage() {
  const location = useLocation();
  const isCabDashboardHome = location.pathname === "/admin/cab" ||
    location.pathname === "/admin/cab/";
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rates, setRates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const results = await Promise.allSettled([
        getCabBookings(),
        getCabVehicles(),
        getCabDrivers(),
        getCabRates(true),
      ]);

      const [bookingResult, vehicleResult, driverResult, rateResult] =
        results;

      const failures = [];

      if (bookingResult.status === "fulfilled") {
        setBookings(getList(bookingResult.value));
      } else {
        failures.push("bookings");
      }

      if (vehicleResult.status === "fulfilled") {
        setVehicles(getList(vehicleResult.value));
      } else {
        failures.push("vehicles");
      }

      if (driverResult.status === "fulfilled") {
        setDrivers(getList(driverResult.value));
      } else {
        failures.push("drivers");
      }

      if (rateResult.status === "fulfilled") {
        const rateData = rateResult.value;

        setRates(
          Array.isArray(rateData)
            ? rateData
            : Array.isArray(rateData?.items)
              ? rateData.items
              : Array.isArray(rateData?.rates)
                ? rateData.rates
                : rateData && typeof rateData === "object"
                  ? Object.values(rateData).filter(
                      (item) => item && typeof item === "object",
                    )
                  : [],
        );
      } else {
        failures.push("rates");
      }

      if (failures.length === 4) {
        throw bookingResult.status === "rejected"
          ? bookingResult.reason
          : new Error("Unable to load dashboard data.");
      }

      if (failures.length > 0) {
        setError(
          `Some dashboard data could not be loaded: ${failures.join(", ")}. Check your access permissions and API responses.`,
        );
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ------------------------------------------------------------------------ */
  /* Calculated Statistics                                                    */
  /* ------------------------------------------------------------------------ */

  const stats = useMemo(() => {
    const todayBookings = bookings.filter((booking) =>
      isSameDay(getBookingDate(booking)),
    );

    const requested = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "requested",
    );

    const confirmed = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "confirmed",
    );

    const assigned = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "assigned",
    );

    const activeTrips = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "in_progress",
    );

    const completed = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "completed",
    );

    const cancelled = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "cancelled",
    );

    const rejected = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "rejected",
    );

    const pendingDispatch = requested.length + confirmed.length;

    const activeVehicles = vehicles.filter(isActiveVehicle);
    const activeDrivers = drivers.filter(isActiveDriver);

    const completedRevenue = completed.reduce(
      (total, booking) => total + Number(getBookingAmount(booking) || 0),
      0,
    );

    return {
      totalBookings: bookings.length,
      todayBookings: todayBookings.length,
      requested: requested.length,
      confirmed: confirmed.length,
      assigned: assigned.length,
      activeTrips: activeTrips.length,
      completed: completed.length,
      cancelled: cancelled.length,
      rejected: rejected.length,
      pendingDispatch,
      totalVehicles: vehicles.length,
      activeVehicles: activeVehicles.length,
      inactiveVehicles: vehicles.length - activeVehicles.length,
      totalDrivers: drivers.length,
      activeDrivers: activeDrivers.length,
      inactiveDrivers: drivers.length - activeDrivers.length,
      totalRates: rates.length,
      completedRevenue,
    };
  }, [bookings, vehicles, drivers, rates]);

  const recentBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...bookings]
      .sort((a, b) => {
        const dateA = new Date(getBookingDate(a) || 0).getTime();
        const dateB = new Date(getBookingDate(b) || 0).getTime();

        return dateB - dateA;
      })
      .filter((booking) => {
        const matchesStatus =
          statusFilter === "all" ||
          normalizeStatus(booking.status) === statusFilter;

        const searchableText = [
          getId(booking),
          booking?.cabNumber,
          booking?.bookingNumber,
          booking?.bookingCode,
          getBookingGuest(booking),
          getBookingPhone(booking),
          getPickupLocation(booking),
          getDropLocation(booking),
          booking?.vehicle?.vehicleNumber,
          booking?.driver?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query || searchableText.includes(query);

        return matchesStatus && matchesSearch;
      })
      .slice(0, 8);
  }, [bookings, search, statusFilter]);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen ">
      {/* Page Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 pt-5 sm:pt-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CarFront size={17} />
                <span>Transport Management</span>
                <span>/</span>
                <span className="font-medium text-gray-900">Dashboard</span>
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Cab Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Monitor bookings, dispatch operations, vehicles, drivers, and
                cab service performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2.5">
                <p className="text-xs text-gray-500">Today's Date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(new Date())}
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="-mb-px mt-6 flex gap-2 overflow-x-auto pb-px" aria-label="Cab management sections">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.end
                ? isCabDashboardHome
                : location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-blue-600 bg-black/50 text-blue-700"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content: child tab pages render below the shared header and tabs. */}
      {!isCabDashboardHome ? (
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
          
            <Outlet />
          
        </main>
      ) : (
      <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <XCircle
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Dashboard Notice
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-10">
            <div className="flex flex-col items-center justify-center text-center">
              <RefreshCw
                size={28}
                className="animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm font-semibold text-gray-800">
                Loading cab dashboard
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Fetching bookings, vehicles, drivers, and rates.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Primary Statistics */}
            <section>
              <SectionHeading
                title="Overview"
                description="A summary of your cab operations."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Total Bookings"
                  value={stats.totalBookings}
                  description={`${stats.todayBookings} bookings scheduled for today`}
                  icon={CarFront}
                  iconClass="bg-blue-100 text-blue-700"
                  footer={
                    <Link
                      to="/admin/cab/bookings"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      View bookings
                      <ArrowRight size={14} />
                    </Link>
                  }
                />

                <SummaryCard
                  title="Cab Requests Received"
                  value={stats.requested}
                  description="Requests waiting for review or confirmation"
                  icon={Clock3}
                  iconClass="bg-amber-50 text-amber-700"
                  footer={
                    <Link
                      to="/admin/cab/bookings"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Review requests
                      <ArrowRight size={14} />
                    </Link>
                  }
                />

                <SummaryCard
                  title="Pending Dispatch"
                  value={stats.pendingDispatch}
                  description={`${stats.requested} requested · ${stats.confirmed} confirmed`}
                  icon={Clock3}
                  iconClass="bg-amber-50 text-amber-700"
                  footer={
                    <Link
                      to="/admin/cab/dispatch"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Manage dispatch
                      <ArrowRight size={14} />
                    </Link>
                  }
                />

                <SummaryCard
                  title="Active Trips"
                  value={stats.activeTrips}
                  description="Trips currently in progress"
                  icon={MapPin}
                  iconClass="bg-blue-100 text-indigo-700"
                  footer={
                    <Link
                      to="/admin/cab/dispatch"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      View active trips
                      <ArrowRight size={14} />
                    </Link>
                  }
                />

                <SummaryCard
                  title="Completed Trips"
                  value={stats.completed}
                  description="Bookings marked as completed"
                  icon={CheckCircle2}
                  iconClass="bg-emerald-50 text-emerald-700"
                  footer={
                    <span className="text-xs text-gray-500">
                      Based on loaded booking records
                    </span>
                  }
                />
              </div>
            </section>

            {/* Fleet and Drivers */}
            <section>
              <SectionHeading
                title="Fleet and Drivers"
                description="Check the availability of your transport resources."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Total Vehicles"
                  value={stats.totalVehicles}
                  description={`${stats.activeVehicles} active vehicles`}
                  icon={Truck}
                  iconClass="bg-cyan-50 text-cyan-700"
                  footer={
                    <Link
                      to="/admin/cab/vehicles"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Manage vehicles
                      <ArrowRight size={14} />
                    </Link>
                  }
                />

                <SummaryCard
                  title="Inactive Vehicles"
                  value={stats.inactiveVehicles}
                  description="Vehicles not marked active"
                  icon={ShieldCheck}
                  iconClass="bg-gray-100 text-gray-600"
                />

                <SummaryCard
                  title="Total Drivers"
                  value={stats.totalDrivers}
                  description={`${stats.activeDrivers} active drivers`}
                  icon={Users}
                  iconClass="bg-violet-50 text-violet-700"
                  footer={
                    <Link
                      to="/admin/cab/drivers"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Manage drivers
                      <ArrowRight size={14} />
                    </Link>
                  }
                />

                <SummaryCard
                  title="Inactive Drivers"
                  value={stats.inactiveDrivers}
                  description="Drivers not marked active"
                  icon={Users}
                  iconClass="bg-rose-50 text-rose-700"
                />
              </div>
            </section>

            {/* Booking Status and Revenue */}
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded border border-gray-200 bg-white p-5 sm:p-6 xl:col-span-2">
                <SectionHeading
                  title="Booking Status"
                  description="Current distribution of cab bookings."
                  action={
                    <Link
                      to="/admin/cab/bookings"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                      All bookings
                      <ArrowRight size={16} />
                    </Link>
                  }
                />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Requested",
                      value: stats.requested,
                      className: "bg-amber-50 text-amber-700",
                    },
                    {
                      label: "Confirmed",
                      value: stats.confirmed,
                      className: "bg-black text-white",
                    },
                    {
                      label: "Assigned",
                      value: stats.assigned,
                      className: "bg-violet-50 text-violet-700",
                    },
                    {
                      label: "In Progress",
                      value: stats.activeTrips,
                      className: "bg-black text-white",
                    },
                    {
                      label: "Completed",
                      value: stats.completed,
                      className: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      label: "Cancelled",
                      value: stats.cancelled,
                      className: "bg-rose-50 text-rose-700",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded border border-gray-200 p-4"
                    >
                      <p className="text-sm text-gray-500">{item.label}</p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {item.value}
                        </span>

                        <span
                          className={`rounded px-2.5 py-1 text-xs font-semibold ${item.className}`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-gray-200 bg-white p-5 sm:p-6">
                <SectionHeading
                  title="Revenue Overview"
                  description="Revenue from completed bookings."
                />

                <div className="rounded border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded bg-white text-emerald-700">
                    <CircleDollarSign size={23} />
                  </div>

                  <p className="mt-5 text-sm font-medium text-emerald-800">
                    Completed Booking Value
                  </p>

                  <p className="mt-2 break-words text-2xl font-bold text-emerald-950">
                    {formatCurrency(stats.completedRevenue)}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    Calculated from completed bookings currently loaded by the
                    API. This is not an accounting or payment reconciliation
                    total.
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded border border-gray-200 p-4">
                  <div className="rounded bg-gray-100 p-2 text-gray-700">
                    <Settings2 size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Cab Rates
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {stats.totalRates} rate records loaded
                    </p>

                    <Link
                      to="/admin/cab/rates"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Manage rates
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <SectionHeading
                title="Quick Actions"
                description="Navigate directly to frequently used cab management pages."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <QuickActionCard
                  title="Manage Bookings"
                  description="Review, confirm, and track cab reservations."
                  path="/admin/cab/bookings"
                  icon={CarFront}
                />

                <QuickActionCard
                  title="Dispatch Management"
                  description="Assign vehicles and drivers to bookings."
                  path="/admin/cab/dispatch"
                  icon={Activity}
                />

                <QuickActionCard
                  title="Manage Vehicles"
                  description="Add, edit, and manage your cab fleet."
                  path="/admin/cab/vehicles"
                  icon={Truck}
                />

                <QuickActionCard
                  title="Manage Drivers"
                  description="Review and maintain driver records."
                  path="/admin/cab/drivers"
                  icon={Users}
                />
              </div>
            </section>

            {/* Recent Bookings */}
            <section className="rounded border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-5 sm:p-6">
                <SectionHeading
                  title="Recent Bookings"
                  description="Review recent cab requests and trip statuses."
                  action={
                    <Link
                      to="/admin/cab/bookings"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                      View all
                      <ArrowRight size={16} />
                    </Link>
                  }
                />

                <div className="mt-5 flex flex-col gap-3 md:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search guest, booking, or location..."
                      aria-label="Search bookings"
                      className="w-full rounded border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filter bookings by status"
                    className="rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Statuses</option>
                    <option value="requested">Requested</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {recentBookings.length === 0 ? (
                <div className="p-5 sm:p-6">
                  <EmptyState
                    message={
                      bookings.length === 0
                        ? "There are no cab bookings available yet."
                        : "Try changing your search or status filter."
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Booking
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Guest
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Route
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Pickup
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Vehicle / Driver
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Amount
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {recentBookings.map((booking, index) => {
                        const bookingId = getId(booking);
                        const bookingNumber =
                          booking?.cabNumber ||
                          booking?.bookingNumber ||
                          booking?.bookingCode ||
                          (bookingId
                            ? `CAB-${bookingId.slice(-6).toUpperCase()}`
                            : `Booking ${index + 1}`);

                        const pickupDate = getBookingDate(booking);

                        return (
                          <tr
                            key={bookingId || index}
                            className="transition-colors hover:bg-gray-50"
                          >
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900">
                                {bookingNumber}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                {formatDate(booking?.createdAt)}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-medium text-gray-900">
                                {getBookingGuest(booking)}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                {getBookingPhone(booking) || "No phone number"}
                              </div>
                            </td>

                            <td className="max-w-[260px] px-5 py-4">
                              <div className="flex items-start gap-2">
                                <MapPin
                                  size={16}
                                  className="mt-0.5 shrink-0 text-gray-400"
                                />

                                <div className="min-w-0">
                                  <p className="truncate text-sm text-gray-800">
                                    {getPickupLocation(booking)}
                                  </p>

                                  <p className="mt-1 truncate text-xs text-gray-500">
                                    To: {getDropLocation(booking)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-gray-800">
                                {formatDate(pickupDate)}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {formatTime(pickupDate)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-gray-800">
                                {getDisplayName(booking?.vehicle) !== "—"
                                  ? getDisplayName(booking?.vehicle)
                                  : (booking?.vehicleType || "Vehicle not assigned")}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {getDisplayName(booking?.driver) !== "—"
                                  ? getDisplayName(booking?.driver)
                                  : (booking?.tripType || "Driver not assigned")}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(getBookingAmount(booking))}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={booking?.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-gray-500">
                  Showing {recentBookings.length} of{" "}
                  {
                    bookings.filter((booking) => {
                      const query = search.trim().toLowerCase();

                      const matchesStatus =
                        statusFilter === "all" ||
                        normalizeStatus(booking.status) === statusFilter;

                      const searchableText = [
                        getId(booking),
                        booking?.cabNumber,
                        booking?.bookingNumber,
                        booking?.bookingCode,
                        getBookingGuest(booking),
                        getBookingPhone(booking),
                        getPickupLocation(booking),
                        getDropLocation(booking),
                        booking?.vehicle?.vehicleNumber,
                        booking?.driver?.name,
                      ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                      return (
                        matchesStatus &&
                        (!query || searchableText.includes(query))
                      );
                    }).length
                  }{" "}
                  matching bookings
                </p>

                <Link
                  to="/admin/cab/bookings"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Open booking management
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>

            {/* Footer */}
            <footer className="flex flex-col gap-2 border-t border-gray-200 py-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <p>Cab Management Dashboard</p>

              <p>
                {lastUpdated
                  ? `Last updated at ${formatTime(lastUpdated)}`
                  : "Dashboard data"}
              </p>
            </footer>
          </>
        )}
      </main>
      )}
    </div>
  );
}