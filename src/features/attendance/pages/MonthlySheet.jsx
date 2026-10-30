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
  getErrorMessage,
  toDayKey,
} from "../../../utils/attendanceUi";

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
  const [selectedStaffId, setSelectedStaffId] = useState("all");

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
    const offset = (first.getDay() + 6) % 7;
    const cells = [];

    for (let index = 0; index < offset; index += 1) cells.push(null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(ym.year, ym.month - 1, day);
      const dateKey = `${ym.year}-${String(ym.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, date, dateKey, weekday: date.getDay() });
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

  const summaryItems = [
    { label: "Present", value: totals.present, style: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { label: "Half day", value: totals.halfDay, style: "bg-amber-50 text-amber-700 border-amber-100" },
    { label: "Absent", value: totals.absent, style: "bg-rose-50 text-rose-700 border-rose-100" },
    { label: "Paid leave", value: totals.paidLeave, style: "bg-sky-50 text-sky-700 border-sky-100" },
    { label: "Unpaid leave", value: totals.unpaidLeave, style: "bg-orange-50 text-orange-700 border-orange-100" },
  ];

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            <CalendarDays size={14} />
            Attendance calendar
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Monthly Attendance
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            {isManager
              ? "View attendance in a calendar layout. Select a staff member to focus on their month; click an eligible day to edit it."
              : "Your monthly attendance calendar and day-by-day status."}
          </p>
        </div>

        <div className="flex min-w-0 items-center max-lg:flex-wrap  gap-2 rounded border border-slate-200 bg-white p-1 ">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="inline-flex min-h-10 items-center justify-center rounded border border-slate-200 bg-white p-2.5 text-slate-600"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="col-span-2 min-w-0 text-center sm:col-span-1 sm:min-w-[145px]">
            <p className="text-base font-bold text-slate-900 sm:text-lg">
              {MONTH_NAMES[ym.month - 1]} {ym.year}
            </p>         
          </div>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="inline-flex min-h-10 items-center justify-center rounded border border-slate-200 bg-white p-2.5 text-slate-600"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="min-h-10 rounded border border-indigo-200 bg-blue-100 px-3 py-2.5 text-sm font-semibold text-indigo-700"
          >
            Today
          </button>
          {isManager && (
            <select
              id="staff-filter"
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
              aria-label="Filter attendance by staff"
              className="col-span-2 min-h-10 w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:col-span-1 sm:min-w-[150px]"
            >
              <option value="all">All staff</option>
              {staffRows.map((row) => (
                <option key={row.user._id} value={row.user._id}>
                  {row.user.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading || refreshing}
            className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50 sm:col-span-1"
          >
            <RefreshCw size={15} className={refreshing ? "" : ""} />
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
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className={`flex min-w-0 flex-col gap-1 rounded border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 ${item.style}`}
          >
            <p className="text-xs font-medium sm:text-sm">{item.label}</p>
            <p className="text-xl font-bold sm:text-lg">{formatUnits(item.value)}</p>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center rounded border border-slate-200 bg-white py-16 text-slate-400">
          <Loader2 />
        </div>
      )}

      {data && !loading && (
        <div className="min-w-0">
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAYS.map((weekday) => (
                  <div key={weekday} className="px-1 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-2">
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
                    .map((row) => ({ row, cell: findCell(row, calendarDay.dateKey) }))
                    .filter(({ cell }) => Boolean(cell));
                  const isWeekend = calendarDay.weekday === 0 || calendarDay.weekday === 6;

                  return (
                    <div
                      key={calendarDay.dateKey}
                      className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 sm:min-h-[132px] sm:p-2 ${
                        isToday ? "bg-indigo-50" : isWeekend || isWeeklyOff ? "bg-slate-50" : "bg-white"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-1">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday ? "bg-indigo-700 text-white" : isFuture ? "text-slate-400" : "text-slate-700"
                          }`}
                        >
                          {calendarDay.day}
                        </span>
                        {holidayName && (
                          <span title={holidayName} className="max-w-[70%] truncate rounded bg-violet-100 px-1.5 py-1 text-[9px] font-semibold text-violet-700">
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
                          <span className="block truncate px-1 text-[10px] text-slate-300">No record</span>
                        ) : (
                          dayCells.slice(0, selectedStaffId === "all" ? 3 : 5).map(({ row, cell }) => {
                            const meta = getCellStatus(cell);
                            const editable = canEditCell(cell);
                            const label = selectedStaffId === "all" ? row.user.name : (meta?.label ?? "Not marked");

                            return (
                              <button
                                key={`${row.user._id}-${cell.date}`}
                                type="button"
                                disabled={!editable}
                                onClick={() => openCell(row, calendarDay)}
                                title={`${row.user.name}: ${cell.note || meta?.label || "Not marked"}${editable ? " — click to edit" : ""}`}
                                className={`flex w-full min-w-0 items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[10px] font-semibold sm:text-[11px] ${
                                  meta ? meta.chip : "bg-slate-100 text-slate-500"
                                } ${editable ? "cursor-pointer" : "cursor-default"} ${cell.isLate ? "ring-1 ring-amber-500" : ""}`}
                              >
                                <span className="shrink-0">{meta?.code ?? "—"}</span>
                                <span className="truncate font-medium">{label}</span>
                              </button>
                            );
                          })
                        )}
                        {selectedStaffId === "all" && dayCells.length > 3 && (
                          <p className="px-1 text-[9px] text-slate-400">+{dayCells.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 sm:hidden">
            Swipe horizontally to view the full calendar.
          </p>
        </div>
      )}

      {data?.holidays?.length > 0 && (
        <p className="break-words text-xs leading-5 text-slate-500">
          Holidays: {data.holidays.map((holiday) => `${Number(holiday.date.split("-")[2])} ${holiday.name}`).join(", ")}
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
