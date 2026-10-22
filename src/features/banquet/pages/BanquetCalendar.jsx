import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";

import { getCalendar } from "../services/banquet.service";
// import {EVENT_TYPE_OPTIONS,MONTH_NAMES,STATUS_META,WEEKDAYS,formatTime,getErrorMessage,labelFor,outlineButton,primaryButton,toDayKey,} from "../banquet.utils";
import {EVENT_TYPE_OPTIONS,MONTH_NAMES,STATUS_META,WEEKDAYS,formatTime,getErrorMessage,labelFor,outlineButton,primaryButton,toDayKey,} from "../../../utils/banquet.utils";

const MAX_CHIPS = 3;

const BanquetCalendar = () => {
  const navigate = useNavigate();
  const now = new Date();
  const today = toDayKey();

  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCalendar(ym)
      .then((result) => !cancelled && setData(result))
      .catch((error) => toast.error(getErrorMessage(error, "Could not load the calendar")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ym]);

  const shift = (delta) =>
    setYm(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Banquet Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">All events across halls. Click a day to add a booking.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate("/banquet")} className={outlineButton}>
            All Bookings
          </button>
          <button type="button" onClick={() => navigate("/banquet/new")} className={primaryButton}>
            <Plus size={16} />
            New Booking
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded border border-slate-300 bg-white p-2 hover:bg-slate-50">
          <ChevronLeft size={16} />
        </button>
        <h2 className="min-w-[170px] text-center text-lg font-semibold text-slate-900">
          {MONTH_NAMES[ym.month - 1]} {ym.year}
        </h2>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded border border-slate-300 bg-white p-2 hover:bg-slate-50">
          <ChevronRight size={16} />
        </button>
        <div className="ml-auto flex flex-wrap gap-3 text-xs text-slate-600">
          {["tentative", "confirmed", "completed"].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded border ${STATUS_META[s].chip}`} />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {data && !loading && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7 gap-px overflow-hidden rounded border border-slate-200 bg-slate-200">
            {WEEKDAYS.map((day) => (
              <div key={day} className="bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}

            {Array.from({ length: data.firstWeekday }).map((_, i) => (
              <div key={`blank-${i}`} className="bg-slate-50" />
            ))}

            {data.days.map((day) => (
              <div
                key={day.date}
                onClick={() => day.date >= today && navigate(`/banquet/new?date=${day.date}`)}
                className={`min-h-[110px] bg-white p-1.5 ${day.date >= today ? "cursor-pointer hover:bg-slate-50" : ""}`}
              >
                <p
                  className={`mb-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 text-xs font-semibold ${
                    day.date === today ? "bg-black text-white" : "text-slate-700"
                  }`}
                >
                  {Number(day.date.split("-")[2])}
                </p>

                <div className="space-y-1">
                  {day.bookings.slice(0, MAX_CHIPS).map((b) => (
                    <button
                      key={b._id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/banquet/${b._id}`);
                      }}
                      title={`${b.customerName}, ${labelFor(EVENT_TYPE_OPTIONS, b.eventType)}, ${b.hall?.name}`}
                      className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium ${
                        STATUS_META[b.status]?.chip || "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {formatTime(b.startTime)} {b.hall?.name}
                    </button>
                  ))}
                  {day.bookings.length > MAX_CHIPS && (
                    <p className="px-1 text-[11px] font-medium text-slate-500">+{day.bookings.length - MAX_CHIPS} more</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BanquetCalendar;