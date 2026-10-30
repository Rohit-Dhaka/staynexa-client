import { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import {

  CalendarDays,

  ChevronLeft,

  ChevronRight,

  Loader2,

  PartyPopper,

  Plus,

} from "lucide-react";

import toast from "react-hot-toast";

import ExportButtons from "../../../components/common/ExportButtons";

import { getCalendar } from "../services/banquet.service";

import {

  EVENT_TYPE_OPTIONS,

  MONTH_NAMES,

  STATUS_META,

  WEEKDAYS,

  formatDate,

  formatINR,

  formatTime,

  getErrorMessage,

  labelFor,

  primaryButton,

  toDayKey,

} from "../../../utils/banquet.utils";

const MAX_CHIPS = 3;

const calendarExportColumns = [

  { header: "Booking Number", value: (booking) => booking?.bookingNumber || "-" },

  { header: "Customer Name", value: (booking) => booking?.customerName || booking?.customer?.name || "-" },

  { header: "Customer Phone", value: (booking) => booking?.customerPhone || booking?.customer?.phone || "-" },

  { header: "Event Type", value: (booking) => labelFor(EVENT_TYPE_OPTIONS, booking?.eventType) || booking?.eventType || "-" },

  { header: "Hall", value: (booking) => booking?.hall?.name || "-" },

  { header: "Event Date", value: (booking) => formatDate(booking?.dateKey || booking?.date) },

  { header: "Start Time", value: (booking) => formatTime(booking?.startTime) },

  { header: "End Time", value: (booking) => formatTime(booking?.endTime) },

  { header: "Status", value: (booking) => STATUS_META[booking?.status]?.label || booking?.status || "-" },

  { header: "Total Amount", value: (booking) => formatINR(booking?.totalAmount) },

];

const BanquetCalendar = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const now = new Date();

  const today = toDayKey();

  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    let cancelled = false;

    setLoading(true);

    getCalendar(ym)

      .then((result) => {

        if (!cancelled) setData(result);

      })

      .catch((error) => toast.error(getErrorMessage(error, "Could not load the calendar")))

      .finally(() => {

        if (!cancelled) setLoading(false);

      });

    return () => {

      cancelled = true;

    };

  }, [ym]);

  const shift = (delta) =>

    setYm(({ year, month }) => {

      const date = new Date(year, month - 1 + delta, 1);

      return { year: date.getFullYear(), month: date.getMonth() + 1 };

    });

  const exportRows = useMemo(() => {

    if (!Array.isArray(data?.days)) return [];

    return data.days.flatMap((day) =>

      (Array.isArray(day.bookings) ? day.bookings : []).map((booking) => ({

        ...booking,

        dateKey: booking.dateKey || day.date,

      })),

    );

  }, [data]);

  const isCalendar = location.pathname.replace(/\/+$/, "") === "/banquet/calendar";

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
            title="Banquet Calendar Bookings"
            fileName={`banquet-calendar-${ym.year}-${String(ym.month).padStart(2, "0")}`}
            columns={calendarExportColumns}
            rows={exportRows}
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
          aria-current={!isCalendar ? "page" : undefined}
          className={`flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold ${
            !isCalendar ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          <PartyPopper size={16} />
          Banquet
        </button>
        <button
          type="button"
          onClick={() => navigate("/banquet/calendar")}
          aria-current={isCalendar ? "page" : undefined}
          className={`flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold ${
            isCalendar ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          <CalendarDays size={16} />
          Calendar
        </button>
      </div>
      <section className="min-w-0 rounded border border-slate-200 bg-white p-3 sm:p-5">

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">

              {MONTH_NAMES[ym.month - 1]} {ym.year}

            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">

              View scheduled banquet events by date. Select a day to create a booking.

            </p>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <button type="button" onClick={() => setYm({ year: now.getFullYear(), month: now.getMonth() + 1 })} className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 sm:text-sm">

              Today

            </button>

            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded border border-slate-300 bg-white p-2 text-slate-600">

              <ChevronLeft size={16} />

            </button>

            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded border border-slate-300 bg-white p-2 text-slate-600">

              <ChevronRight size={16} />

            </button>

          </div>

        </div>

        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">

          {["tentative", "confirmed", "completed"].map((status) => (

            <span key={status} className="flex items-center gap-1.5">

              <span className={`h-2.5 w-2.5 rounded border ${STATUS_META[status]?.chip || "border-slate-200 bg-slate-50"}`} />

              {STATUS_META[status]?.label || status}

            </span>

          ))}

        </div>

        {loading && (

          <div className="flex justify-center py-16 text-slate-400" aria-label="Loading calendar">

            <Loader2 size={22} className="animate-spin" />

          </div>

        )}

        {data && !loading && (

          <div className="overflow-x-auto">

            <div className="grid min-w-[700px] grid-cols-7 gap-px overflow-hidden rounded border border-slate-200 bg-slate-200">

              {WEEKDAYS.map((day) => (

                <div key={day} className="bg-slate-50 px-2 py-2.5 text-center text-xs font-semibold text-slate-500">

                  {day}

                </div>

              ))}

              {Array.from({ length: data.firstWeekday }).map((_, index) => (

                <div key={`blank-${index}`} className="min-h-24 bg-slate-50 sm:min-h-28" />

              ))}

              {data.days.map((day) => (

                <div

                  key={day.date}

                  onClick={() => day.date >= today && navigate(`/banquet/new?date=${day.date}`)}

                  onKeyDown={(event) => {

                    if ((event.key === "Enter" || event.key === " ") && day.date >= today) {

                      event.preventDefault();

                      navigate(`/banquet/new?date=${day.date}`);

                    }

                  }}

                  role={day.date >= today ? "button" : undefined}

                  tabIndex={day.date >= today ? 0 : undefined}

                  aria-label={day.date >= today ? `Create booking on ${day.date}` : undefined}

                  className={`min-h-24 bg-white p-1.5 sm:min-h-28 sm:p-2 ${day.date >= today ? "cursor-pointer" : ""}`}

                >

                  <p className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${day.date === today ? "bg-slate-900 text-white" : "text-slate-700"}`}>

                    {Number(day.date.split("-")[2])}

                  </p>

                  <div className="space-y-1">

                    {(Array.isArray(day.bookings) ? day.bookings : []).slice(0, MAX_CHIPS).map((booking) => (

                      <button

                        key={booking._id || booking.id || booking.bookingNumber}

                        type="button"

                        onClick={(event) => {

                          event.stopPropagation();

                          navigate(`/banquet/${booking._id || booking.id}`);

                        }}

                        title={`${booking.customerName || booking.customer?.name || "Customer"}, ${labelFor(EVENT_TYPE_OPTIONS, booking.eventType) || booking.eventType || "Event"}, ${booking.hall?.name || "Hall"}`}

                        className={`block w-full truncate rounded border px-1.5 py-1 text-left text-[10px] font-medium leading-4 sm:text-[11px] ${STATUS_META[booking.status]?.chip || "border-slate-200 bg-slate-50 text-slate-700"}`}

                      >

                        {formatTime(booking.startTime)} {booking.hall?.name || "Hall"}

                      </button>

                    ))}

                    {day.bookings?.length > MAX_CHIPS && (

                      <p className="px-1 text-[10px] font-medium text-slate-500 sm:text-[11px]">

                        +{day.bookings.length - MAX_CHIPS} more

                      </p>

                    )}

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}

      </section>

    </div>

  );

};

export default BanquetCalendar;
