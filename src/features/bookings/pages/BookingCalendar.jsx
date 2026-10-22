import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExportButtons from "../../../components/common/ExportButtons";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  BedDouble,
  Users,
  Clock3,
  Wallet,
} from "lucide-react";

import {
  getAvailabilityGrid,
  getCalendarDay,
  getCalendarMonth,
  getCalendarTimeline,
} from "../services/bookings.service";

import { BookingStatusBadge } from "../components/StatusBadges";

import {
  BOOKING_STATUS_META,
  addDaysToInput,
  formatDate,
  formatINR,
  getErrorMessage,
  toInputDate,
} from "../utils/bookingUi";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const bookingCalendarExportColumns = [
  { header: "Booking Number", key: "bookingNumber" },
  { header: "Guest Name", key: "guestName" },
  { header: "Room Number", key: "roomNumber" },
  { header: "Room Type", key: "roomType" },
  {
    header: "Check-in",
    value: (booking) => formatDate(booking.checkIn),
  },
  {
    header: "Check-out",
    value: (booking) => formatDate(booking.checkOut),
  },
  { header: "Booking Status", key: "status" },
  { header: "Balance Amount", key: "balanceAmount", type: "currency" },
];

const VIEWS = [
  { value: "month", label: "Month" },
  { value: "timeline", label: "Timeline" },
  { value: "day", label: "Day" },
  { value: "availability", label: "Availability" },
];

const field =
  " rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-black hover:text-blue-700";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white  transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2";

const parseKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const useData = (loader, deps) => {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    loader()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: "" });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: getErrorMessage(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // The caller provides the exact dependencies for each request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
};

const Status = ({ loading, error }) => (
  <>
    {loading && (
      <div
        className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"
        role="status"
      >
        <Loader2 size={20} className="animate-spin" />
        Loading calendar...
      </div>
    )}

    {error && (
      <div
        className="rounded border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        role="alert"
      >
        {error}
      </div>
    )}
  </>
);

const StatCard = ({ label, value, sub, icon: Icon }) => (
  <div className="min-w-0 rounded border border-slate-100 bg-white p-3  sm:p-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>

      {Icon && (
        <span className="rounded bg-black p-2 text-[#3158e8]">
          <Icon size={17} />
        </span>
      )}
    </div>

    <p className="mt-2 break-words text-lg font-bold tracking-tight text-[#13284d] sm:text-xl">
      {value}
    </p>

    {sub && <p className="mt-1 text-xs leading-5 text-slate-500">{sub}</p>}
  </div>
);

const heat = (percent) =>
  percent >= 90
    ? "bg-rose-50"
    : percent >= 60
      ? "bg-amber-50"
      : percent >= 30
        ? "bg-emerald-50"
        : "bg-white";

const MonthView = ({ onPickDay }) => {
  const now = new Date();

  const [ym, setYm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const { data, loading, error } = useData(
    () => getCalendarMonth(ym),
    [ym.year, ym.month],
  );

  const shift = (delta) => {
    setYm(({ year, month }) => {
      const date = new Date(year, month - 1 + delta, 1);

      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      };
    });
  };

  const title = new Date(ym.year, ym.month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const today = toInputDate();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#13284d]">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Select a date to view its activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className={secondaryButton}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              const date = new Date();
              setYm({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
              });
            }}
            className={secondaryButton}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className={secondaryButton}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Status loading={loading} error={error} />

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
            <StatCard
              label="Avg. Occupancy"
              value={`${data.summary.averageOccupancyPercent}%`}
              icon={BedDouble}
            />

            <StatCard
              label="Room Revenue"
              value={formatINR(data.summary.roomRevenue)}
              icon={Wallet}
            />

            <StatCard
              label="ADR"
              value={formatINR(data.summary.adr)}
              sub="Average daily rate"
              icon={CalendarDays}
            />

            <StatCard
              label="RevPAR"
              value={formatINR(data.summary.revPar)}
              sub="Revenue per available room"
              icon={Wallet}
            />

            <StatCard
              label="Arrivals / Departures"
              value={`${data.summary.arrivals} / ${data.summary.departures}`}
              icon={Users}
            />
          </div>

          <div className="overflow-x-auto rounded border border-slate-200">
            <div className="grid min-w-[630px] grid-cols-7 gap-px bg-slate-200">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="bg-slate-50 px-1 py-3 text-center text-xs font-semibold text-slate-500"
                >
                  {day}
                </div>
              ))}

              {Array.from({ length: data.firstWeekday }, (_, index) => (
                <div
                  key={`blank-${index}`}
                  className="min-h-[105px] bg-slate-50/70"
                />
              ))}

              {data.days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onPickDay(day.date)}
                  className={`min-h-[105px] p-2 text-left transition hover:z-10 hover:ring-2 hover:ring-inset hover:ring-blue-400 sm:p-3    ${heat(day.occupancyPercent)}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                        day.date === today
                          ? "bg-[#3158e8] text-white"
                          : "text-[#13284d] bg-gray-100"
                      }`}
                    >
                      {Number(day.date.split("-")[2])}
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] leading-4 text-slate-700 sm:text-xs ">
                    {day.occupied} Booked
                  </p>

                  <p className="text-[10px] leading-4 text-emerald-700 sm:text-xs">
                    {day.available} available
                  </p>

                  {/* <p className="mt-1 text-[9px] leading-4 text-slate-500 sm:text-[10px]">
                    In {day.arrivals} · Out {day.departures}
                  </p> */}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-emerald-100" />
              Lower occupancy
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-amber-100" />
              High occupancy
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-rose-100" />
              Near full
            </span>
          </div>
        </>
      )}
    </div>
  );
};

const TimelineView = ({ search = "" }) => {
  const navigate = useNavigate();
  const [from, setFrom] = useState(toInputDate());
  const [span, setSpan] = useState(7);

  const to = addDaysToInput(from, span - 1);

  const { data, loading, error } = useData(
    () => getCalendarTimeline({ from, to }),
    [from, span],
  );

  const today = toInputDate();
  const cols = `150px repeat(${span}, minmax(44px, 1fr))`;

  const filteredRooms = useMemo(() => {
    if (!data) return [];

    const query = search.trim().toLowerCase();
    if (!query) return data.rooms;

    return data.rooms.filter((room) => {
      const roomMatches = [room.roomNumber, room.roomType?.name].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );

      const bookingMatches = room.bookings.some((booking) =>
        [booking.guestName, booking.bookingNumber, booking.status].some(
          (value) =>
            String(value || "")
              .toLowerCase()
              .includes(query),
        ),
      );

      return roomMatches || bookingMatches;
    });
  }, [data, search]);

  const timelineExportRows = useMemo(
    () =>
      filteredRooms.flatMap((room) =>
        (room.bookings || []).map((booking) => ({
          bookingNumber: booking.bookingNumber || "-",
          guestName: booking.guestName || "-",
          roomNumber: room.roomNumber || "-",
          roomType: room.roomType?.name || "-",
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: booking.status || "-",
          balanceAmount: booking.balanceAmount ?? 0,
        })),
      ),
    [filteredRooms],
  );

  return (
    <div className="space-y-4">
      <div className="flex  items-center gap-2">
        <button
          type="button"
          onClick={() => setFrom(addDaysToInput(from, -span))}
          aria-label="Previous date range"
          className={secondaryButton}
        >
          <ChevronLeft size={16} />
        </button>

        <input
          type="date"
          value={from}
          onChange={(event) => {
            if (event.target.value) setFrom(event.target.value);
          }}
          aria-label="Timeline start date"
          className={`${field}   sm:flex-none`}
        />

        <button
          type="button"
          onClick={() => setFrom(addDaysToInput(from, span))}
          aria-label="Next date range"
          className={secondaryButton}
        >
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => setFrom(toInputDate())}
          className={secondaryButton}
        >
          Today
        </button>

        <select
          value={span}
          onChange={(event) => setSpan(Number(event.target.value))}
          aria-label="Timeline duration"
          className={`${field} w-auto`}
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      <div className="flex justify-end">
        <ExportButtons
          title="Booking Calendar Report"
          fileName="booking-calendar"
          columns={bookingCalendarExportColumns}
          rows={timelineExportRows}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        {["hold", "pending", "confirmed", "checked_in", "checked_out"].map(
          (status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded ${
                  BOOKING_STATUS_META[status]?.bar || "bg-slate-400"
                }`}
              />
              {BOOKING_STATUS_META[status]?.label || status}
            </span>
          ),
        )}
      </div>

      <Status loading={loading} error={error} />

      {data && !loading && (
        <>
          {search.trim() && (
            <p className="text-xs text-slate-500">
              {filteredRooms.length} matching rooms
            </p>
          )}

          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <div style={{ minWidth: 150 + span * 48 }}>
              <div
                className="grid border-b border-slate-200 bg-slate-50 text-center text-xs"
                style={{ gridTemplateColumns: cols }}
              >
                <div className="sticky left-0 z-20 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-600">
                  Room
                </div>

                {data.days.map((key, index) => {
                  const date = parseKey(key);

                  return (
                    <div
                      key={key}
                      className={`border-l border-slate-200 py-2 ${
                        key === today ? "bg-black" : ""
                      }`}
                    >
                      <p className="text-[10px] text-slate-500">
                        {date.toLocaleDateString("en-IN", {
                          weekday: "short",
                        })}
                      </p>

                      <p className="mt-1 font-semibold text-[#13284d]">
                        {date.getDate()}
                      </p>

                      <p className="mt-1 text-[9px] text-slate-400">
                        {data.daily[index]?.occupied}/{data.rooms.length}
                      </p>
                    </div>
                  );
                })}
              </div>

              {filteredRooms.map((room) => (
                <div
                  key={room._id}
                  className="grid items-stretch border-b border-slate-100 last:border-b-0"
                  style={{ gridTemplateColumns: cols }}
                >
                  <div
                    className="sticky left-0 z-10 min-w-0 border-r border-slate-100 bg-white px-3 py-3"
                    style={{ gridColumn: 1, gridRow: 1 }}
                  >
                    <p className="truncate text-sm font-semibold text-[#13284d]">
                      {room.roomNumber}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-slate-500">
                      {room.roomType?.name || "Room"}
                    </p>
                  </div>

                  {data.days.map((key, index) => (
                    <div
                      key={key}
                      className={`min-h-[66px] border-l border-slate-100 ${
                        key === today ? "bg-black/50" : ""
                      }`}
                      style={{
                        gridColumn: index + 2,
                        gridRow: 1,
                      }}
                    />
                  ))}

                  {room.bookings.map((booking) => (
                    <button
                      key={booking._id}
                      type="button"
                      onClick={() => navigate(`/bookings/${booking._id}`)}
                      title={`${booking.bookingNumber}, ${booking.guestName}, ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`}
                      aria-label={`Open booking for ${booking.guestName}`}
                      className={`z-10 m-1 min-w-0 self-stretch truncate rounded px-2 py-2 text-left text-[10px] font-semibold text-white  transition hover:brightness-95 sm:text-xs ${
                        BOOKING_STATUS_META[booking.status]?.bar ||
                        "bg-slate-100"
                      } ${booking.startsBeforeRange ? "rounded" : ""} ${
                        booking.endsAfterRange ? "rounded" : ""
                      }`}
                      style={{
                        gridColumn: `${booking.startOffset + 2} / span ${booking.span}`,
                        gridRow: 1,
                      }}
                    >
                      <span className="block truncate">
                        {booking.guestName}
                      </span>

                      {booking.balanceAmount > 0 &&
                        booking.status !== "checked_out" && (
                          <span className="mt-1 block text-[9px] opacity-90">
                            Payment pending *
                          </span>
                        )}
                    </button>
                  ))}
                </div>
              ))}

              {filteredRooms.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <BedDouble
                    className="mx-auto mb-3 text-slate-300"
                    size={28}
                  />
                  <p className="text-sm font-medium text-slate-600">
                    No matching rooms found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try a different guest name or room number.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            * Payment pending. Select a booking bar to view its details.
          </p>
        </>
      )}
    </div>
  );
};

const BookingRows = ({ title, items, onOpen }) => (
  <section className="min-w-0 rounded border border-slate-100 bg-white p-4  sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-[#13284d]">{title}</h3>

      <span className="rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-blue-700">
        {items.length}
      </span>
    </div>

    {items.length === 0 ? (
      <p className="rounded bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
        No bookings for this section.
      </p>
    ) : (
      <ul className="divide-y divide-slate-100">
        {items.map((booking) => (
          <li key={booking._id}>
            <button
              type="button"
              onClick={() => onOpen(booking._id)}
              className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 py-3 text-left transition hover:bg-black/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#13284d]">
                  {booking.guestName}
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Room {booking.room} · {booking.roomType}
                </span>
              </span>

              <span className="flex max-w-full flex-wrap items-center gap-2">
                {booking.balanceAmount > 0 &&
                  booking.status !== "cancelled" && (
                    <span className="text-xs font-medium text-rose-600">
                      Due {formatINR(booking.balanceAmount)}
                    </span>
                  )}

                <BookingStatusBadge status={booking.status} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const DayView = ({ date, setDate }) => {
  const navigate = useNavigate();

  const { data, loading, error } = useData(
    () => getCalendarDay({ date }),
    [date],
  );

  const open = (id) => navigate(`/bookings/${id}`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDate(addDaysToInput(date, -1))}
          aria-label="Previous day"
          className={secondaryButton}
        >
          <ChevronLeft size={16} />
        </button>

        <input
          type="date"
          value={date}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
          }}
          aria-label="Select calendar date"
          className={`${field} w-auto min-w-0 flex-1 sm:flex-none`}
        />

        <button
          type="button"
          onClick={() => setDate(addDaysToInput(date, 1))}
          aria-label="Next day"
          className={secondaryButton}
        >
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => setDate(toInputDate())}
          className={secondaryButton}
        >
          Today
        </button>
      </div>

      <Status loading={loading} error={error} />

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
            <StatCard
              label="Occupancy"
              value={`${data.summary.occupancyPercent}%`}
              sub={`${data.summary.occupied} / ${data.summary.totalRooms} rooms`}
              icon={BedDouble}
            />

            <StatCard
              label="Vacant Rooms"
              value={data.summary.available}
              icon={CalendarDays}
            />

            <StatCard
              label="Arrivals"
              value={`${data.summary.arrivalsDone} / ${
                data.summary.arrivalsDone + data.summary.arrivalsExpected
              }`}
              sub="Checked in / expected"
              icon={Users}
            />

            <StatCard
              label="Departures"
              value={`${data.summary.departuresDone} / ${
                data.summary.departuresDone + data.summary.departuresExpected
              }`}
              sub="Checked out / expected"
              icon={Clock3}
            />

            <StatCard
              label="Overdue"
              value={data.summary.overdue}
              sub="Pending check-outs"
              icon={Clock3}
            />
          </div>

          {data.overdue.length > 0 && (
            <BookingRows
              title="Overdue check-outs"
              items={data.overdue}
              onOpen={open}
            />
          )}

          <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
            <BookingRows title="Arrivals" items={data.arrivals} onOpen={open} />

            <BookingRows
              title="Departures"
              items={data.departures}
              onOpen={open}
            />
          </div>

          <BookingRows
            title="In-house guests"
            items={data.inHouse}
            onOpen={open}
          />

          <section className="rounded border border-slate-100 bg-white p-4  sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#13284d]">
                Vacant Rooms
              </h3>

              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {data.availableRooms.length} available
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.availableRooms.map((room) => (
                <span
                  key={room._id}
                  className="rounded border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                >
                  <span className="font-semibold">{room.roomNumber}</span>

                  <span className="ml-2 text-xs text-emerald-700/80">
                    {room.roomType}
                  </span>
                </span>
              ))}

              {data.availableRooms.length === 0 && (
                <p className="text-sm text-slate-500">
                  No vacant rooms for this date.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const AvailabilityView = () => {
  const [from, setFrom] = useState(toInputDate());
  const [span, setSpan] = useState(7);

  const to = addDaysToInput(from, span - 1);

  const { data, loading, error } = useData(
    () => getAvailabilityGrid({ from, to }),
    [from, span],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFrom(addDaysToInput(from, -span))}
          aria-label="Previous availability range"
          className={secondaryButton}
        >
          <ChevronLeft size={16} />
        </button>

        <input
          type="date"
          value={from}
          onChange={(event) => {
            if (event.target.value) setFrom(event.target.value);
          }}
          aria-label="Availability start date"
          className={`${field} w-auto min-w-0 flex-1 sm:flex-none`}
        />

        <button
          type="button"
          onClick={() => setFrom(addDaysToInput(from, span))}
          aria-label="Next availability range"
          className={secondaryButton}
        >
          <ChevronRight size={16} />
        </button>

        <select
          value={span}
          onChange={(event) => setSpan(Number(event.target.value))}
          aria-label="Availability duration"
          className={`${field} w-auto`}
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      <Status loading={loading} error={error} />

      {data && !loading && (
        <>
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table
              className="w-full text-center text-sm"
              style={{ minWidth: 180 + span * 48 }}
            >
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[155px] border-r border-slate-200 bg-slate-50 px-3 py-3 text-left">
                    Room type
                  </th>

                  {data.days.map((key) => {
                    const date = parseKey(key);

                    return (
                      <th
                        key={key}
                        className="border-l border-slate-200 px-2 py-3 font-medium"
                      >
                        <p>
                          {date.toLocaleDateString("en-IN", {
                            weekday: "short",
                          })}
                        </p>

                        <p className="mt-1 font-semibold text-[#13284d]">
                          {date.getDate()}
                        </p>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.roomType._id}
                    className="border-t border-slate-100"
                  >
                    <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-3 py-3 text-left">
                      <p className="font-semibold text-[#13284d]">
                        {row.roomType.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {row.totalRooms} rooms
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatINR(row.roomType.basePrice)}
                      </p>
                    </td>

                    {row.days.map((day) => (
                      <td
                        key={day.date}
                        className={`border-l border-slate-100 px-2 py-3 text-xs font-semibold ${
                          day.soldOut
                            ? "bg-rose-50 text-rose-600"
                            : day.available <= 1
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50/40 text-emerald-700"
                        }`}
                      >
                        {day.soldOut ? "Full" : day.available}
                      </td>
                    ))}
                  </tr>
                ))}

                {data.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={span + 1}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No room types found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            Available room count is shown for each room type and date. Red
            indicates sold out; amber indicates limited availability.
          </p>
        </>
      )}
    </div>
  );
};

const MiniCalendar = ({ onPickDay, selectedDate }) => {
  const now = new Date();

  const [ym, setYm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const { data, loading, error } = useData(
    () => getCalendarMonth(ym),
    [ym.year, ym.month],
  );

  const shift = (delta) => {
    setYm(({ year, month }) => {
      const date = new Date(year, month - 1 + delta, 1);

      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      };
    });
  };

  const title = new Date(ym.year, ym.month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const today = toInputDate();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 ">
        <h3 className="text-sm font-semibold text-white">{title}</h3>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded p-1.5 text-white transition hover:bg-white/15"
          >
            <ChevronLeft size={17} />
          </button>

          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded p-1.5 text-white transition hover:bg-white/15"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="py-2 text-[10px] font-medium text-blue-100"
          >
            {day}
          </span>
        ))}

        {loading && (
          <div className="col-span-7 flex justify-center py-5">
            <Loader2 size={18} className="animate-spin text-white" />
          </div>
        )}

        {!loading && error && (
          <p className="col-span-7 py-3 text-xs text-blue-100">{error}</p>
        )}

        {data && !loading && (
          <>
            {Array.from({ length: data.firstWeekday }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}

            {data.days.map((day) => {
              const isToday = day.date === today;
              const isSelected = day.date === selectedDate;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onPickDay(day.date)}
                  aria-label={`Select ${day.date}`}
                  aria-pressed={isSelected}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition ${
                    isSelected
                      ? "bg-white font-bold text-blue-700 ring-2 ring-blue-200"
                      : isToday
                        ? "bg-black font-semibold text-white ring-1 ring-white/70"
                        : "text-white hover:bg-white/20"
                  }`}
                >
                  {Number(day.date.split("-")[2])}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

const CalendarSidebar = ({ onPickDay, selectedDate, search, setSearch }) => (
  <aside className="flex min-w-0 flex-col gap-5 rounded bg-[#3158e8] p-4  sm:p-5">
    <label className="flex items-center gap-2 full bg-[#2448cb] px-3 py-3">
      <Search size={16} className="shrink-0 text-blue-100" />

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search rooms or guests..."
        aria-label="Search rooms or guests"
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-blue-100"
      />

      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label="Clear search"
          className="text-xs text-white/80 hover:text-white"
        >
          Clear
        </button>
      )}
    </label>

    <MiniCalendar onPickDay={onPickDay} selectedDate={selectedDate} />
  </aside>
);

const BookingCalendar = () => {
  const navigate = useNavigate();

  const [view, setView] = useState("timeline");
  const [dayDate, setDayDate] = useState(toInputDate());
  const [search, setSearch] = useState("");

  const pickDay = (date) => {
    setDayDate(date);
    setView("day");
  };

  return (
    <div className="min-h-screen ">
      <div className="mx-auto  space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded bg-white p-3 text-[#3158e8] ">
              <CalendarDays size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[#13284d] sm:text-2xl">
                Booking Calendar
              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Reservations, room occupancy & availability
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/bookings/new")}
            className={primaryButton}
          >
            <Plus size={17} />
            New Booking
          </button>
        </header>

        <div className=" items-start gap-5 ">
          <main className="min-w-0 overflow-hidden rounded border border-white bg-white ">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#13284d]">
                  Your Schedule
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  View and manage your hotel calendar
                </p>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-1 rounded bg-slate-100 p-1 sm:grid-cols-4">
                {VIEWS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setView(item.value)}
                    aria-pressed={view === item.value}
                    className={`rounded px-2 py-2.5 text-xs font-medium transition sm:text-sm ${
                      view === item.value
                        ? "bg-white text-[#3158e8] "
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 ">
              {view === "month" && <MonthView onPickDay={pickDay} />}

              {view === "timeline" && <TimelineView search={search} />}

              {view === "day" && (
                <DayView date={dayDate} setDate={setDayDate} />
              )}

              {view === "availability" && <AvailabilityView />}
            </div>
          </main>
        </div>

     
      </div>
    </div>
  );
};

export default BookingCalendar;
