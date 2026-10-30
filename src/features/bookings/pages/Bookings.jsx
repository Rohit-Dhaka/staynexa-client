
import { useEffect, useState } from "react";
import ExportButtons from "../../../components/common/ExportButtons";
import { fetchAllPages } from "../../../utils/exportUtils";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ListChecks,
  BedDouble,
  Users,
  CalendarDays,
  Wallet,
} from "lucide-react";
import BookingCalendar from "./BookingCalendar";
import { listBookings } from "../services/bookings.service";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "../components/StatusBadges";
import {
  BOOKING_VIEWS,
  BOOKING_STATUS_META,
  PAYMENT_STATUS_META,
  formatDate,
  formatINR,
  getErrorMessage,
  timeLeft,
} from "../utils/bookingUi";

const PAGE_SIZE = 15;

const field =
  "min-w-0 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50";

const tabClass = (active) =>
  `inline-flex shrink-0 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
    active
      ? "bg-slate-900 text-white"
      : "text-slate-600 "
  }`;

const Bookings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "calendar" ? "calendar" : "list";

  const showList = () => setSearchParams({}, { replace: true });
  const showCalendar = () => setSearchParams({ tab: "calendar" });

  const [filters, setFilters] = useState({
    view: "",
    status: "",
    paymentStatus: "",
    page: 1,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setFilters((f) => ({ ...f, page: 1 }));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (tab === "calendar") return undefined;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          limit: PAGE_SIZE,
          page: filters.page,
        };

        if (filters.view) params.view = filters.view;

        if (filters.status && !filters.view) {
          params.status = filters.status;
        }

        if (filters.paymentStatus) {
          params.paymentStatus = filters.paymentStatus;
        }

        if (search) params.search = search;

        const result = await listBookings(params);

        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [filters, search, tab]);

  const changeView = (view) =>
    setFilters((f) => ({
      ...f,
      view,
      status: "",
      page: 1,
    }));

  const changeFilter = (name, value) =>
    setFilters((f) => ({
      ...f,
      [name]: value,
      page: 1,
    }));

  const bookingExportColumns = [
    { header: "Booking Number", key: "bookingNumber" },
    {
      header: "Guest Name",
      value: (b) => b.guestDetails?.name || "-",
    },
    {
      header: "Guest Phone",
      value: (b) => b.guestDetails?.phone || "-",
    },
    {
      header: "Room Number",
      value: (b) => b.room?.roomNumber || "-",
    },
    {
      header: "Room Type",
      value: (b) => b.roomType?.name || "-",
    },
    {
      header: "Check-in",
      value: (b) => formatDate(b.checkIn),
    },
    {
      header: "Check-out",
      value: (b) => formatDate(b.checkOut),
    },
    { header: "Nights", key: "nights", type: "number" },
    { header: "Adults", key: "adults", type: "number" },
    { header: "Children", key: "children", type: "number" },
    { header: "Booking Status", key: "status" },
    { header: "Payment Status", key: "paymentStatus" },
    { header: "Total Amount", key: "totalAmount", type: "currency" },
    { header: "Paid Amount", key: "paidAmount", type: "currency" },
    { header: "Balance Amount", key: "balanceAmount", type: "currency" },
  ];

  const totalGuests = (booking) =>
    (booking.adults || 0) + (booking.children || 0);

  const hasBookings = data.items.length > 0;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {tab === "calendar" ? "Booking Calendar" : "Bookings"}
          </h1>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {tab === "calendar"
              ? "Reservations, room occupancy and availability."
              : "Manage reservations, arrivals and departures."}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          {tab === "list" && (
            <div className="w-full sm:w-auto">
              <ExportButtons
                title="Bookings Report"
                fileName="bookings"
                columns={bookingExportColumns}
                rows={data.items}
                getRows={() =>
                  fetchAllPages(
                    ({ page, limit }) => {
                      const params = { page, limit };

                      if (filters.view) params.view = filters.view;

                      if (filters.status && !filters.view) {
                        params.status = filters.status;
                      }

                      if (filters.paymentStatus) {
                        params.paymentStatus = filters.paymentStatus;
                      }

                      if (search) params.search = search;

                      return listBookings(params);
                    },
                    { limit: 100 },
                  )
                }
              />
            </div>
          )}

          <nav
            className="flex min-w-0 flex-wrap items-center gap-1 rounded bg-slate-100 p-1"
            aria-label="Booking sections"
          >
            <button
              type="button"
              onClick={() => navigate("/bookings/new")}
              className={tabClass(false)}
            >
              <Plus size={15} />
              <span>New Booking</span>
            </button>

            <button
              type="button"
              onClick={showList}
              aria-pressed={tab === "list"}
              className={tabClass(tab === "list")}
            >
              <ListChecks size={15} />
              <span>Bookings</span>
            </button>

            <button
              type="button"
              onClick={showCalendar}
              aria-pressed={tab === "calendar"}
              className={tabClass(tab === "calendar")}
            >
              <Calendar size={15} />
              <span>Calendar</span>
            </button>
          </nav>
        </div>
      </header>

      {tab === "calendar" ? (
        <BookingCalendar embedded />
      ) : (
        <>
          
          <section
            className="flex min-w-0 gap-2 overflow-x-auto pb-1"
            aria-label="Booking views"
          >
            {BOOKING_VIEWS.map((view) => (
              <button
                key={view.value || "all"}
                type="button"
                onClick={() => changeView(view.value)}
                aria-pressed={filters.view === view.value}
                className={`shrink-0 whitespace-nowrap rounded px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                  filters.view === view.value
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 "
                }`}
              >
                {view.label}
              </button>
            ))}
          </section>

          
          <section className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative min-w-0">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search booking, guest or phone"
                aria-label="Search bookings"
                className={`${field} pl-9`}
              />
            </div>

            {!filters.view && (
              <select
                value={filters.status}
                onChange={(e) => changeFilter("status", e.target.value)}
                aria-label="Filter by booking status"
                className={field}
              >
                <option value="">All Booking Statuses</option>

                {Object.entries(BOOKING_STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filters.paymentStatus}
              onChange={(e) =>
                changeFilter("paymentStatus", e.target.value)
              }
              aria-label="Filter by payment status"
              className={field}
            >
              <option value="">All Payment Statuses</option>

              {Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </section>

          
          {error && (
            <div
              role="alert"
              className="rounded border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700 sm:px-4 sm:text-sm"
            >
              {error}
            </div>
          )}

          
          <section className="hidden min-w-0 overflow-hidden rounded border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold lg:px-4">
                      Booking
                    </th>
                    <th className="px-3 py-3 font-semibold lg:px-4">
                      Guest
                    </th>
                    <th className="px-3 py-3 font-semibold lg:px-4">
                      Room
                    </th>
                    <th className="px-3 py-3 font-semibold lg:px-4">
                      Stay
                    </th>
                    <th className="px-3 py-3 font-semibold lg:px-4">
                      Status
                    </th>
                    <th className="px-3 py-3 font-semibold lg:px-4">
                      Payment
                    </th>
                    <th className="px-3 py-3 text-right font-semibold lg:px-4">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-slate-400"
                      >
                        <Loader2
                          size={22}
                          className="mx-auto animate-spin"
                        />
                        <p className="mt-2 text-xs">Loading bookings...</p>
                      </td>
                    </tr>
                  )}

                  {!loading && !hasBookings && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-sm text-slate-500"
                      >
                        No bookings found.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    data.items.map((booking) => (
                      <tr
                        key={booking._id}
                        onClick={() =>
                          navigate(`/bookings/${booking._id}`)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/bookings/${booking._id}`);
                          }
                        }}
                        role="link"
                        tabIndex={0}
                        aria-label={`View booking ${booking.bookingNumber}`}
                        className="cursor-pointer border-t border-slate-100 transition  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300"
                      >
                        <td className="px-3 py-3 lg:px-4">
                          <p className="font-medium text-slate-900">
                            {booking.bookingNumber}
                          </p>

                          {booking.isAdvance && (
                            <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                              Advance
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 lg:px-4">
                          <p className="max-w-40 truncate font-medium text-slate-800">
                            {booking.guestDetails?.name || "-"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {booking.guestDetails?.phone || "-"}
                          </p>
                        </td>

                        <td className="px-3 py-3 lg:px-4">
                          <p className="text-slate-800">
                            Room {booking.room?.roomNumber || "-"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {booking.roomType?.name || "-"}
                          </p>
                        </td>

                        <td className="px-3 py-3 lg:px-4">
                          <p className="whitespace-nowrap text-slate-800">
                            {formatDate(booking.checkIn)}{" "}
                            <span className="text-slate-400">to</span>{" "}
                            {formatDate(booking.checkOut)}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {booking.nights} night
                            {booking.nights !== 1 ? "s" : ""},{" "}
                            {totalGuests(booking)} guest
                            {totalGuests(booking) !== 1 ? "s" : ""}
                          </p>
                        </td>

                        <td className="px-3 py-3 lg:px-4">
                          <BookingStatusBadge status={booking.status} />

                          {booking.status === "hold" && (
                            <p className="mt-1 text-xs text-slate-500">
                              {timeLeft(booking.holdExpiresAt)}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-3 lg:px-4">
                          {booking.status === "hold" ? (
                            <span className="text-xs text-slate-400">
                              Not applicable
                            </span>
                          ) : (
                            <PaymentStatusBadge
                              status={booking.paymentStatus}
                            />
                          )}

                          {booking.balanceAmount > 0 &&
                            ![
                              "hold",
                              "cancelled",
                              "no_show",
                            ].includes(booking.status) && (
                              <p className="mt-1 text-xs text-amber-700">
                                Due: {formatINR(booking.balanceAmount)}
                              </p>
                            )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900 lg:px-4">
                          {formatINR(booking.totalAmount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          
          <section className="grid min-w-0 grid-cols-1 gap-3 md:hidden">
            {loading && (
              <div className="rounded border border-slate-200 bg-white px-4 py-10 text-center">
                <Loader2
                  size={22}
                  className="mx-auto animate-spin text-slate-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Loading bookings...
                </p>
              </div>
            )}

            {!loading && !hasBookings && (
              <div className="rounded border border-slate-200 bg-white px-4 py-10 text-center">
                <CalendarDays
                  size={24}
                  className="mx-auto text-slate-400"
                />
                <p className="mt-2 text-sm font-medium text-slate-800">
                  No bookings found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try changing your search or filters.
                </p>
              </div>
            )}

            {!loading &&
              data.items.map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  onClick={() => navigate(`/bookings/${booking._id}`)}
                  className="w-full min-w-0 rounded border border-slate-200 bg-white p-3 text-left transition  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 sm:p-4"
                >
                  
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900">
                        {booking.bookingNumber}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {booking.guestDetails?.name || "Guest not specified"}
                      </p>

                      {booking.guestDetails?.phone && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {booking.guestDetails.phone}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <BookingStatusBadge status={booking.status} />

                      {booking.isAdvance && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          Advance
                        </span>
                      )}
                    </div>
                  </div>

                  
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <BedDouble
                        size={15}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />

                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Room
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-800">
                          {booking.room?.roomNumber
                            ? `Room ${booking.room.roomNumber}`
                            : "Not assigned"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {booking.roomType?.name || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-2">
                      <Users
                        size={15}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />

                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Guests
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-800">
                          {totalGuests(booking)} guest
                          {totalGuests(booking) !== 1 ? "s" : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {booking.nights} night
                          {booking.nights !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  
                  <div className="mt-3 flex min-w-0 items-start gap-2 rounded bg-slate-50 p-2.5">
                    <CalendarDays
                      size={15}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500">
                          Check-in
                        </p>
                        <p className="mt-0.5 break-words text-xs font-medium text-slate-800">
                          {formatDate(booking.checkIn)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500">
                          Check-out
                        </p>
                        <p className="mt-0.5 break-words text-xs font-medium text-slate-800">
                          {formatDate(booking.checkOut)}
                        </p>
                      </div>
                    </div>
                  </div>

                  
                  <div className="mt-3 flex min-w-0 items-end justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Wallet
                          size={14}
                          className="shrink-0 text-slate-400"
                        />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Payment
                        </span>
                      </div>

                      <div className="mt-1">
                        {booking.status === "hold" ? (
                          <span className="text-xs text-slate-400">
                            Not applicable
                          </span>
                        ) : (
                          <PaymentStatusBadge
                            status={booking.paymentStatus}
                          />
                        )}
                      </div>

                      {booking.status === "hold" && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {timeLeft(booking.holdExpiresAt)}
                        </p>
                      )}

                      {booking.balanceAmount > 0 &&
                        ![
                          "hold",
                          "cancelled",
                          "no_show",
                        ].includes(booking.status) && (
                          <p className="mt-1 break-words text-[11px] text-amber-700">
                            Outstanding: {formatINR(booking.balanceAmount)}
                          </p>
                        )}
                    </div>

                    <div className="min-w-0 text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        Total Amount
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900 sm:text-base">
                        {formatINR(booking.totalAmount)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </section>

          
          <footer className="flex min-w-0 flex-col gap-3 rounded border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-xs text-slate-500 sm:text-sm">
              Page {data.page} of {data.pages}{" "}
              <span className="text-slate-400">({data.total} bookings)</span>
            </p>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                type="button"
                disabled={filters.page <= 1 || loading}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    page: f.page - 1,
                  }))
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition  disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={filters.page >= data.pages || loading}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    page: f.page + 1,
                  }))
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition  disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default Bookings;

