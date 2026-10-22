import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import { getMonthlySheet } from "../services/attendance.service";
import MarkAttendanceModal from "../components/MarkAttendanceModal";
import {
  ATTENDANCE_META,
  MONTH_NAMES,
  formatUnits,
  //   formatWeekday,
  getErrorMessage,
  toDayKey,
} from "../../../utils/attendanceUi";

const LEGEND = [
  "present",
  "half_day",
  "absent",
  "paid_leave",
  "unpaid_leave",
  "weekly_off",
  "holiday",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MonthlySheet = () => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);
  const todayKey = toDayKey();
  const now = new Date();

  const [ym, setYm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getMonthlySheet(ym)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ym, reload]);

  const refresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      const response = await getMonthlySheet(ym);
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const shift = (delta) =>
    setYm(({ year, month }) => {
      const date = new Date(year, month - 1 + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });

  const goToToday = () => {
    const date = new Date();
    setYm({ year: date.getFullYear(), month: date.getMonth() + 1 });
  };

  const canEditCell = (cell) =>
    isManager &&
    data &&
    !data.isLocked &&
    cell.status &&
    cell.date <= todayKey &&
    !cell.isLeave;

  const getCellStatus = (cell) => {
    if (!cell.status) return null;
    return ATTENDANCE_META[cell.status] ?? null;
  };

  const getMonthGrid = () => {
    const first = new Date(ym.year, ym.month - 1, 1);
    const daysInMonth = new Date(ym.year, ym.month, 0).getDate();
    // Convert JS Sunday-first index into a Monday-first calendar offset.
    const offset = (first.getDay() + 6) % 7;
    const cells = [];

    for (let index = 0; index < offset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(ym.year, ym.month - 1, day);
      const dateKey = `${ym.year}-${String(ym.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        day,
        date,
        dateKey,
        weekday: date.getDay(),
      });
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const monthGrid = getMonthGrid();
  const allDays = data?.days ?? [];
  const holidayByDate = new Map(
    (data?.holidays ?? []).map((holiday) => [holiday.date, holiday.name]),
  );
  const weeklyOffSet = new Set(data?.weeklyOffDays ?? []);

  const totals = (data?.rows ?? []).reduce(
    (sum, row) => {
      sum.present += Number(row.totals?.present ?? 0);
      sum.halfDay += Number(row.totals?.halfDay ?? 0);
      sum.absent += Number(row.totals?.absent ?? 0);
      sum.paidLeave += Number(row.totals?.paidLeave ?? 0);
      sum.unpaidLeave += Number(row.totals?.unpaidLeave ?? 0);
      return sum;
    },
    { present: 0, halfDay: 0, absent: 0, paidLeave: 0, unpaidLeave: 0 },
  );

  const staffRows = data?.rows ?? [];
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const visibleRows =
    selectedStaffId === "all"
      ? staffRows
      : staffRows.filter((row) => row.user?._id === selectedStaffId);

  const findCell = (row, dateKey) =>
    row?.days?.find((cell) => cell.date === dateKey);

  const openCell = (row, calendarDay) => {
    const cell = findCell(row, calendarDay.dateKey);
    if (!cell) return;

    setEditing({
      staff: row.user,
      dateKey: calendarDay.dateKey,
      record: {
        status: cell.status === "not_marked" ? undefined : cell.status,
        checkInAt: cell.checkInAt,
        checkOutAt: cell.checkOutAt,
        isLeave: cell.isLeave,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <CalendarDays size={14} />
            Attendance calendar
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Monthly Attendance
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {isManager
              ? "View attendance in a calendar layout. Select a staff member to focus on their month; click an eligible day to edit it."
              : "Your monthly attendance calendar and day-by-day status."}
          </p>
        </div>

        <div className="flex  items-center gap-2 bg-white p-2 rounded">
         
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded border border-slate-200 bg-white p-2.5 text-slate-600  transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[160px] text-center">
            <p className="text-lg font-bold text-slate-900">
              {MONTH_NAMES[ym.month - 1]} {ym.year}
            </p>
            <p className="text-xs text-slate-500">
              {allDays.length || new Date(ym.year, ym.month, 0).getDate()} days
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded border border-slate-200 bg-white p-2.5 text-slate-600  transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Today
          </button>
           {isManager && (
            <div className="flex items-center ">
              <select
                id="staff-filter"
                value={selectedStaffId}
                onChange={(event) => setSelectedStaffId(event.target.value)}
                className="w-full min-w-[10px] rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="all">All staff</option>
                {staffRows.map((row) => (
                  <option key={row.user._id} value={row.user._id}>
                    {row.user.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {data?.isLocked && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This attendance month is locked. Editing is disabled.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: "Present",
            value: totals.present,
            style: "bg-emerald-50 text-emerald-700 ring-emerald-100",
          },
          {
            label: "Half day",
            value: totals.halfDay,
            style: "bg-amber-50 text-amber-700 ring-amber-100",
          },
          {
            label: "Absent",
            value: totals.absent,
            style: "bg-rose-50 text-rose-700 ring-rose-100",
          },
          {
            label: "Paid leave",
            value: totals.paidLeave,
            style: "bg-sky-50 text-sky-700 ring-sky-100",
          },
          {
            label: "Unpaid leave",
            value: totals.unpaidLeave,
            style: "bg-orange-50 text-orange-700 ring-orange-100",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded p-4 flex gap-2 ring-1 ${item.style}`}
          >
            <p className=" font-medium ">{item.label}</p>
            <p className=" font-bold ">
              {formatUnits(item.value)}
            </p>
            {/* <p className="mt-1 text-[11px] opacity-70">Staff-day total</p> */}
          </div>
        ))}
      </div>

   

      {error && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center rounded border border-slate-200 bg-white py-16 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 gap-5 ">
          <div className="overflow-hidden rounded border border-slate-200 bg-white ">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="px-1 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthGrid.map((calendarDay, index) => {
                if (!calendarDay) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[110px] border-b border-r border-slate-100 bg-slate-50/50 sm:min-h-[132px]"
                    />
                  );
                }

                const isToday = calendarDay.dateKey === todayKey;
                const isFuture = calendarDay.dateKey > todayKey;
                const isWeeklyOff = weeklyOffSet.has(calendarDay.weekday);
                const holidayName = holidayByDate.get(calendarDay.dateKey);
                const dayCells = visibleRows
                  .map((row) => ({
                    row,
                    cell: findCell(row, calendarDay.dateKey),
                  }))
                  .filter(({ cell }) => Boolean(cell));
                const isWeekend =
                  calendarDay.weekday === 0 || calendarDay.weekday === 6;

                return (
                  <div
                    key={calendarDay.dateKey}
                    className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 sm:min-h-[132px] sm:p-2 ${
                      isToday
                        ? "bg-indigo-50/60"
                        : isWeekend || isWeeklyOff
                          ? "bg-slate-50/70"
                          : "bg-white"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-1">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-black text-white"
                            : isFuture
                              ? "text-slate-400"
                              : "text-slate-700"
                        }`}
                      >
                        {calendarDay.day}
                      </span>
                      {holidayName && (
                        <span
                          title={holidayName}
                          className="max-w-[70%] truncate rounded bg-violet-100 px-1.5 py-1 text-[9px] font-semibold text-violet-700"
                        >
                          Holiday
                        </span>
                      )}
                      {!holidayName && isWeeklyOff && (
                        <span className="rounded bg-slate-200 px-1.5 py-1 text-[9px] font-semibold text-slate-600">
                          Off
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayCells.length === 0 ? (
                        <span className="block truncate px-1 text-[10px] text-slate-300">
                          No record
                        </span>
                      ) : (
                        dayCells
                          .slice(0, selectedStaffId === "all" ? 3 : 5)
                          .map(({ row, cell }) => {
                            const meta = getCellStatus(cell);
                            const editable = canEditCell(cell);
                            const label =
                              selectedStaffId === "all"
                                ? row.user.name
                                : (meta?.label ?? "Not marked");

                            return (
                              <button
                                key={`${row.user._id}-${cell.date}`}
                                type="button"
                                disabled={!editable}
                                onClick={() => openCell(row, calendarDay)}
                                title={`${row.user.name}: ${cell.note || meta?.label || "Not marked"}${editable ? " — click to edit" : ""}`}
                                className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[10px] font-semibold transition sm:text-[11px] ${
                                  meta
                                    ? meta.chip
                                    : "bg-slate-100 text-slate-500"
                                } ${
                                  editable
                                    ? "cursor-pointer hover:brightness-95"
                                    : "cursor-default"
                                } ${cell.isLate ? "ring-1 ring-amber-500" : ""}`}
                              >
                                <span className="shrink-0">
                                  {meta?.code ?? "—"}
                                </span>
                                <span className="truncate font-medium">
                                  {label}
                                </span>
                              </button>
                            );
                          })
                      )}
                      {selectedStaffId === "all" && dayCells.length > 3 && (
                        <p className="px-1 text-[9px] text-slate-400">
                          +{dayCells.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* <aside className="space-y-4">
            <div className="rounded border border-slate-200 bg-white p-4 ">
              <h3 className="font-semibold text-slate-900">
                Attendance legend
              </h3>
              <div className="mt-3 space-y-2.5">
                {LEGEND.map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <span
                      className={`inline-flex min-w-9 justify-center rounded px-2 py-1 text-[10px] font-bold ${ATTENDANCE_META[status].chip}`}
                    >
                      {ATTENDANCE_META[status].code}
                    </span>
                    <span>{ATTENDANCE_META[status].label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex min-w-9 justify-center rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                    —
                  </span>
                  <span>Not marked</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex min-w-9 justify-center rounded bg-white px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-500">
                    Late
                  </span>
                  <span>Late check-in</span>
                </div>
              </div>
            </div>

            <div className="rounded border border-slate-200 bg-white p-4 ">
              <h3 className="font-semibold text-slate-900">Monthly totals</h3>
              <p className="mt-1 text-xs text-slate-500">
                {selectedStaffId === "all"
                  ? "Combined across visible staff"
                  : (visibleRows[0]?.user?.name ?? "Selected staff")}
              </p>
              <div className="mt-3 space-y-3">
                {[
                  ["Present", totals.present, "text-emerald-700"],
                  ["Half day", totals.halfDay, "text-amber-700"],
                  ["Absent", totals.absent, "text-rose-700"],
                  ["Paid leave", totals.paidLeave, "text-sky-700"],
                  ["Unpaid leave", totals.unpaidLeave, "text-orange-700"],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600">{label}</span>
                    <span className={`font-semibold tabular-nums ${color}`}>
                      {formatUnits(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside> */}
        </div>
      )}

      {data?.holidays?.length > 0 && (
        <p className="text-xs text-slate-500">
          Holidays:{" "}
          {data.holidays
            .map(
              (holiday) =>
                `${Number(holiday.date.split("-")[2])} ${holiday.name}`,
            )
            .join(", ")}
        </p>
      )}

      {editing && (
        <MarkAttendanceModal
          staff={editing.staff}
          dateKey={editing.dateKey}
          record={editing.record}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            setReload((current) => current + 1);
          }}
        />
      )}
    </div>
  );
};

export default MonthlySheet;
