import { useCallback, useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import {

  CalendarDays,

  ChevronLeft,

  ChevronRight,

  PartyPopper,

  Plus,

  Search,

} from "lucide-react";

import toast from "react-hot-toast";

import { Skeleton, TableSkeleton } from "../../../components/common/Skeleton";

import ExportButtons from "../../../components/common/ExportButtons";

import { getSummary, listBookings, listHalls } from "../services/banquet.service";

import { PaymentBadge, StatusBadge } from "../components/BanquetUi";

import {

  EVENT_TYPE_OPTIONS,

  STATUS_META,

  formatDate,

  formatINR,

  formatTime,

  getErrorMessage,

  inputClass,

  labelFor,

  primaryButton,

} from "../../../utils/banquet.utils";

const VIEWS = [

  { value: "", label: "All" },

  { value: "today", label: "Today" },

  { value: "upcoming", label: "Upcoming" },

  { value: "past", label: "Past" },

];

const getPayload = (response) => response?.data ?? response ?? {};

const getBookingRows = (payload) => {

  const rows =

    payload?.items ??

    payload?.bookings ??

    payload?.data?.items ??

    payload?.data?.bookings ??

    [];

  return Array.isArray(rows) ? rows : [];

};

const banquetExportColumns = [

  { header: "Booking Number", value: (booking) => booking?.bookingNumber || "-" },

  { header: "Customer Name", value: (booking) => booking?.customer?.name || "-" },

  { header: "Customer Phone", value: (booking) => booking?.customer?.phone || "-" },

  { header: "Event Type", value: (booking) => labelFor(EVENT_TYPE_OPTIONS, booking?.eventType) || booking?.eventType || "-" },

  { header: "Expected Guests", value: (booking) => booking?.expectedGuests ?? 0 },

  { header: "Hall", value: (booking) => booking?.hall?.name || "-" },

  { header: "Event Date", value: (booking) => formatDate(booking?.dateKey) },

  { header: "Start Time", value: (booking) => formatTime(booking?.startTime) },

  { header: "End Time", value: (booking) => formatTime(booking?.endTime) },

  { header: "Status", value: (booking) => STATUS_META[booking?.status]?.label || booking?.status || "-" },

  { header: "Payment Status", value: (booking) => booking?.paymentStatus || "-" },

  { header: "Total Amount", value: (booking) => formatINR(booking?.totalAmount) },

  { header: "Advance Paid", value: (booking) => formatINR(booking?.advanceAmount ?? booking?.paidAmount ?? 0) },

  { header: "Outstanding", value: (booking) => formatINR(booking?.outstandingAmount ?? booking?.balanceAmount ?? 0) },

];

const toDateKey = (date) => {

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

};

const getCalendarDays = (monthDate) => {

  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

  const gridStart = new Date(firstDay);

  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {

    const day = new Date(gridStart);

    day.setDate(gridStart.getDate() + index);

    return day;

  });

};

const StatCard = ({ label, value, loading }) => (

  <div className="rounded border border-slate-200 bg-white p-4">

    <p className="text-xs text-slate-500">{label}</p>

    {loading ? (

      <Skeleton className="mt-2 h-7 w-20" />

    ) : (

      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>

    )}

  </div>

);

const Banquet = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const isCalendarView = location.pathname.replace(/\/+$/, "") === "/banquet/calendar";

  const [summary, setSummary] = useState(null);

  const [halls, setHalls] = useState([]);

  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });

  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("upcoming");

  const [status, setStatus] = useState("");

  const [hall, setHall] = useState("");

  const [eventType, setEventType] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  useEffect(() => {

    getSummary().then(setSummary).catch(() => {});

    listHalls().then(setHalls).catch(() => {});

  }, []);

  useEffect(() => {

    const timer = setTimeout(() => {

      setSearch(searchInput.trim());

      setPage(1);

    }, 400);

    return () => clearTimeout(timer);

  }, [searchInput]);

  const buildBookingParams = useCallback(

    (requestedPage, limit = 12) => {

      const params = { page: requestedPage, limit };

      if (!isCalendarView && view) params.view = view;

      if (status && !["today", "upcoming"].includes(view)) params.status = status;

      if (hall) params.hall = hall;

      if (eventType) params.eventType = eventType;

      if (search) params.search = search;

      return params;

    },

    [isCalendarView, view, status, hall, eventType, search],

  );

  const load = useCallback(async () => {

    setLoading(true);

    try {

      const response = await listBookings(buildBookingParams(page, isCalendarView ? 100 : 12));

      const payload = getPayload(response);

      const items = getBookingRows(payload);

      const meta = payload?.pagination ?? payload?.meta ?? {};

      setData({

        items,

        total: Number(payload?.total ?? meta?.total ?? items.length),

        page: Number(payload?.page ?? meta?.page ?? page),

        pages: Number(payload?.pages ?? payload?.totalPages ?? meta?.pages ?? meta?.totalPages ?? 1),

      });

    } catch (error) {

      setData({ items: [], total: 0, page: 1, pages: 1 });

      toast.error(getErrorMessage(error, "Could not load bookings"));

    } finally {

      setLoading(false);

    }

  }, [buildBookingParams, isCalendarView, page]);

  const getAllFilteredBookings = useCallback(async () => {

    const limit = 100;

    const allBookings = [];

    let currentPage = 1;

    let totalPages = 1;

    do {

      const response = await listBookings(buildBookingParams(currentPage, limit));

      const payload = getPayload(response);

      allBookings.push(...getBookingRows(payload));

      const meta = payload?.pagination ?? payload?.meta ?? {};

      const reportedPages = Number(

        payload?.pages ??

          payload?.totalPages ??

          meta?.pages ??

          meta?.totalPages ??

          1,

      );

      totalPages =

        Number.isFinite(reportedPages) && reportedPages > 0 ? reportedPages : 1;

      currentPage += 1;

    } while (currentPage <= totalPages && currentPage <= 500);

    return allBookings;

  }, [buildBookingParams]);

  useEffect(() => {

    load();

  }, [load]);

  const change = (setter) => (event) => {

    setter(event.target.value);

    setPage(1);

  };

  return (

    <div className="min-w-0 space-y-4 sm:space-y-5">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="text-xl font-bold text-slate-900">Banquet Management</h1>

          <p className="mt-1 text-sm text-slate-500">

            Hall bookings for weddings, parties and corporate events.

          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <ExportButtons

            title="Banquet Bookings"

            fileName="banquet-bookings"

            columns={banquetExportColumns}

            getRows={getAllFilteredBookings}

          />

          <button

            type="button"

            onClick={() => navigate("/banquet/new")}

            className={primaryButton}

          >

            <Plus size={16} />

            New Booking

          </button>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-1 rounded border border-slate-200 bg-white p-1.5 sm:inline-grid sm:w-auto sm:min-w-[320px]">

        <button

          type="button"

          onClick={() => navigate("/banquet")}

          aria-current={!isCalendarView ? "page" : undefined}

          className={`flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold ${

            !isCalendarView ? "bg-slate-900 text-white" : "text-slate-600"

          }`}

        >

          <PartyPopper size={16} />

          Banquet

        </button>

        <button

          type="button"

          onClick={() => navigate("/banquet/calendar")}

          aria-current={isCalendarView ? "page" : undefined}

          className={`flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold ${

            isCalendarView ? "bg-slate-900 text-white" : "text-slate-600"

          }`}

        >

          <CalendarDays size={16} />

          Calendar

        </button>

      </div>

      {!isCalendarView && (

        <>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">

        <StatCard label="Events today" value={summary?.todayEvents} loading={!summary} />

        <StatCard label="Next 30 days" value={summary?.upcomingEvents} loading={!summary} />

        <StatCard label="Awaiting advance" value={summary?.byStatus?.tentative} loading={!summary} />

        <StatCard label="Revenue this month" value={formatINR(summary?.monthRevenue)} loading={!summary} />

        <StatCard label="Outstanding balance" value={formatINR(summary?.outstanding)} loading={!summary} />

      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">

        {VIEWS.map((v) => (

          <button

            key={v.label}

            type="button"

            onClick={() => {

              setView(v.value);

              setPage(1);

            }}

            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${

              view === v.value

                ? "bg-black text-white"

                : "bg-white text-slate-600 ring-1 ring-slate-200 "

            }`}

          >

            {v.label}

          </button>

        ))}

      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <div className="relative">

          <Search size={16} className="absolute left-3 top-3 text-slate-400" />

          <input

            value={searchInput}

            onChange={(event) => setSearchInput(event.target.value)}

            placeholder="Booking no, customer or phone"

            className={`${inputClass} pl-9`}

          />

        </div>

        <select

          value={hall}

          onChange={change(setHall)}

          aria-label="Filter by hall"

          className={inputClass}

        >

          <option value="">All Halls</option>

          {halls.map((item) => (

            <option key={item._id} value={item._id}>

              {item.name}

            </option>

          ))}

        </select>

        <select

          value={eventType}

          onChange={change(setEventType)}

          aria-label="Filter by event type"

          className={inputClass}

        >

          <option value="">All Event Types</option>

          {EVENT_TYPE_OPTIONS.map((option) => (

            <option key={option.value} value={option.value}>

              {option.label}

            </option>

          ))}

        </select>

        <select

          value={status}

          onChange={change(setStatus)}

          disabled={["today", "upcoming"].includes(view)}

          aria-label="Filter by status"

          className={inputClass}

        >

          <option value="">All Statuses</option>

          {Object.entries(STATUS_META).map(([value, meta]) => (

            <option key={value} value={value}>

              {meta.label}

            </option>

          ))}

        </select>

      </div>

      <div className="overflow-hidden rounded border border-slate-200 bg-white">

        {loading ? (

          <TableSkeleton rows={6} columns={7} />

        ) : data.items.length === 0 ? (

          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">

            <div className="rounded bg-slate-100 p-4 text-slate-500">

              <PartyPopper size={28} />

            </div>

            <h3 className="font-semibold text-slate-800">No bookings found</h3>

            <p className="max-w-sm text-sm text-slate-500">

              Try changing the filters, or create a new banquet booking.

            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[980px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>

                  <th className="px-4 py-3 font-medium">Booking</th>

                  <th className="px-4 py-3 font-medium">Customer</th>

                  <th className="px-4 py-3 font-medium">Event</th>

                  <th className="px-4 py-3 font-medium">Hall</th>

                  <th className="px-4 py-3 font-medium">Date &amp; Time</th>

                  <th className="px-4 py-3 font-medium">Status</th>

                  <th className="px-4 py-3 text-right font-medium">Total</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {data.items.map((booking) => (

                  <tr

                    key={booking._id || booking.id || booking.bookingNumber}

                    onClick={() => navigate(`/banquet/${booking._id || booking.id}`)}

                    className="cursor-pointer "

                  >

                    <td className="px-4 py-3 font-semibold text-slate-900">

                      {booking.bookingNumber || "-"}

                    </td>

                    <td className="px-4 py-3">

                      <p className="font-medium text-slate-800">

                        {booking.customer?.name || "-"}

                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">

                        {booking.customer?.phone || "-"}

                      </p>

                    </td>

                    <td className="px-4 py-3">

                      <p className="text-slate-800">

                        {labelFor(EVENT_TYPE_OPTIONS, booking.eventType) || booking.eventType || "-"}

                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">

                        {booking.expectedGuests ?? 0} guests

                      </p>

                    </td>

                    <td className="px-4 py-3 text-slate-700">

                      {booking.hall?.name || "-"}

                    </td>

                    <td className="whitespace-nowrap px-4 py-3">

                      <p className="text-slate-800">{formatDate(booking.dateKey)}</p>

                      <p className="mt-0.5 text-xs text-slate-500">

                        {formatTime(booking.startTime)} to {formatTime(booking.endTime)}

                      </p>

                    </td>

                    <td className="px-4 py-3">

                      <div className="flex flex-col items-start gap-1">

                        <StatusBadge status={booking.status} />

                        {booking.status !== "cancelled" && (

                          <PaymentBadge status={booking.paymentStatus} />

                        )}

                      </div>

                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-900">

                      {formatINR(booking.totalAmount)}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {!loading && data.pages > 1 && (

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">

            <p className="text-xs text-slate-500">

              Page {data.page} of {data.pages} ({data.total} bookings)

            </p>

            <div className="flex gap-2">

              <button

                type="button"

                onClick={() => setPage((current) => Math.max(1, current - 1))}

                disabled={page <= 1}

                aria-label="Previous page"

                className="rounded border border-slate-300 p-2 text-slate-600  disabled:cursor-not-allowed disabled:opacity-40"

              >

                <ChevronLeft size={16} />

              </button>

              <button

                type="button"

                onClick={() => setPage((current) => Math.min(data.pages, current + 1))}

                disabled={page >= data.pages}

                aria-label="Next page"

                className="rounded border border-slate-300 p-2 text-slate-600  disabled:cursor-not-allowed disabled:opacity-40"

              >

                <ChevronRight size={16} />

              </button>

            </div>

          </div>

        )}

      </div>

        </>

      )}

      {isCalendarView && (

        <section className="min-w-0 rounded border border-slate-200 bg-white p-3 sm:p-5">

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">

                {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}

              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">View scheduled banquet events by date.</p>

            </div>

            <div className="flex gap-2">

              <button

                type="button"

                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}

                aria-label="Previous month"

                className="rounded border border-slate-300 p-2 text-slate-600"

              >

                <ChevronLeft size={16} />

              </button>

              <button

                type="button"

                onClick={() => setCalendarMonth(new Date())}

                className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 sm:text-sm"

              >

                Today

              </button>

              <button

                type="button"

                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}

                aria-label="Next month"

                className="rounded border border-slate-300 p-2 text-slate-600"

              >

                <ChevronRight size={16} />

              </button>

            </div>

          </div>

          {loading ? (

            <TableSkeleton rows={5} columns={7} />

          ) : (

            <div className="overflow-x-auto">

              <div className="min-w-[640px]">

                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">

                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (

                    <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 sm:py-3">{day}</div>

                  ))}

                </div>

                <div className="grid grid-cols-7">

                  {getCalendarDays(calendarMonth).map((day) => {

                    const dateKey = toDateKey(day);

                    const dayBookings = data.items.filter((booking) => String(booking?.dateKey || "").slice(0, 10) === dateKey);

                    const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();

                    const isToday = dateKey === toDateKey(new Date());

                    return (

                      <div key={dateKey} className={`min-h-24 border-b border-r border-slate-100 p-1.5 sm:min-h-28 sm:p-2 ${isCurrentMonth ? "bg-white" : "bg-slate-50"}`}>

                        <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-slate-900 font-semibold text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-400"}`}>

                          {day.getDate()}

                        </div>

                        <div className="space-y-1">

                          {dayBookings.slice(0, 3).map((booking) => (

                            <button

                              key={booking._id || booking.id || booking.bookingNumber}

                              type="button"

                              onClick={() => navigate(`/banquet/${booking._id || booking.id}`)}

                              className="block w-full rounded border border-slate-200 bg-slate-100 px-1.5 py-1 text-left text-[10px] leading-4 text-slate-700 sm:text-xs"

                              title={`${booking.customer?.name || "Booking"} · ${formatTime(booking.startTime)}`}

                            >

                              <span className="block truncate font-semibold">{booking.bookingNumber || booking.customer?.name || "Booking"}</span>

                              <span className="block truncate">{formatTime(booking.startTime)} · {booking.hall?.name || "Hall"}</span>

                            </button>

                          ))}

                          {dayBookings.length > 3 && <p className="px-1 text-[10px] text-slate-500">+{dayBookings.length - 3} more</p>}

                        </div>

                      </div>

                    );

                  })}

                </div>

              </div>

            </div>

          )}

          {!loading && data.items.length === 0 && (

            <p className="mt-4 text-center text-sm text-slate-500">No bookings are available to display in this calendar.</p>

          )}

        </section>

      )}

    </div>

  );

};

export default Banquet;
