
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Save,
  UserCheck,
  Users,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  LockKeyhole,
} from "lucide-react";

import {
  bulkMark,
  getDailySheet,
  markAttendance,
} from "../services/attendance.service";

import { StatusChip } from "../components/AttendanceChip";
import ExportButtons from "../../../components/common/ExportButtons";

import {
  addDays,
  formatDay,
  formatMinutes,
  formatTime,
  getErrorMessage,
  toDayKey,
  toTimeInput,
} from "../../../utils/attendanceUi";

const ATTENDANCE_OPTIONS = [
  {
    value: "present",
    label: "Present",
    short: "P",
    active: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "absent",
    label: "Absent",
    short: "A",
    active: "border-rose-500 bg-rose-50 text-rose-700",
  },
  {
    value: "half_day",
    label: "Half Day",
    short: "HD",
    active: "border-amber-500 bg-amber-50 text-amber-700",
  },
  {
    value: "paid_leave",
    label: "Paid Leave",
    short: "PL",
    active: "border-sky-500 bg-sky-50 text-sky-700",
  },
  {
    value: "unpaid_leave",
    label: "Unpaid Leave",
    short: "UL",
    active: "border-orange-500 bg-orange-50 text-orange-700",
  },
];


const attendanceExportColumns = [
  { header: "Staff Name", value: (row) => row?.user?.name || "-" },
  { header: "Role", value: (row) => row?.user?.role || "-" },
  {
    header: "Attendance Status",
    value: (row) => {
      const status = row?.record?.status || row?.status || "not_marked";
      return status === "not_marked"
        ? "Not Marked"
        : status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    },
  },
  {
    header: "Check-in",
    value: (row) => row?.record?.checkInAt ? formatTime(row.record.checkInAt) : "-",
  },
  {
    header: "Check-out",
    value: (row) => row?.record?.checkOutAt ? formatTime(row.record.checkOutAt) : "-",
  },
  {
    header: "Worked Hours",
    value: (row) => formatMinutes(row?.record?.workedMinutes),
  },
  {
    header: "Overtime",
    value: (row) => formatMinutes(row?.record?.overtimeMinutes),
  },
  {
    header: "Late",
    value: (row) => row?.record?.isLate ? `Yes (${row.record.lateMinutes || 0} min)` : "No",
  },
  {
    header: "Missing Check-out",
    value: (row) => row?.missingCheckOut ? "Yes" : "No",
  },
  {
    header: "Remarks",
    value: (row) => row?.record?.remarks || "-",
  },
];

const TIME_STATUSES = ["present", "half_day"];

const isValidStatus = (status) =>
  ATTENDANCE_OPTIONS.some((option) => option.value === status);

const getSavedStatus = (row) => {
  if (isValidStatus(row.record?.status)) return row.record.status;
  if (isValidStatus(row.status)) return row.status;
  return "not_marked";
};

const createDraft = (row) => ({
  status: getSavedStatus(row),
  checkIn: toTimeInput(row.record?.checkInAt),
  checkOut: toTimeInput(row.record?.checkOutAt),
  remarks: row.record?.remarks || "",
});

const StatCard = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded border border-slate-200 bg-white p-4 ">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <Icon size={17} className={tone} />
    </div>
    <p className={`mt-2 text-2xl font-bold ${tone}`}>{value ?? 0}</p>
  </div>
);

const DailyAttendance = () => {
  const today = toDayKey();

  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [drafts, setDrafts] = useState({});
  const [savingIds, setSavingIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  const refresh = useCallback(() => {
    setReload((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSheet = async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await getDailySheet({ date });

        if (cancelled) return;

        setData(response);

        const nextDrafts = {};
        (Array.isArray(response?.rows) ? response.rows : []).forEach(
          (row) => {
            nextDrafts[row.user._id] = createDraft(row);
          },
        );

        setDrafts(nextDrafts);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSheet();

    return () => {
      cancelled = true;
    };
  }, [date, reload]);

  
  const dayTypeName = String(
    data?.dayType?.name || data?.dayType?.type || data?.dayType?.key || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  const isWeeklyOff = Boolean(
    data?.dayType?.isWeeklyOff ||
      data?.dayType?.isWeeklyOffDay ||
      dayTypeName.includes("weekly off")
  );

  const canEdit = Boolean(
    data && !data.isLocked && date <= today && !isWeeklyOff
  );

  const updateDraft = (userId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));

    setError("");
    setSuccess("");
  };

  
  const saveStatus = async (row, nextStatus) => {
    const userId = row.user._id;
    const draft = drafts[userId] || createDraft(row);
    const previousStatus = getSavedStatus(row);

    if (!canEdit || savingIds.includes(userId)) return;
    if (previousStatus === nextStatus) return;

    if (row.record?.leaveRequest || row.record?.isLeave) {
      setError(
        `${row.user.name} has approved leave for this date. Cancel the leave request before changing attendance.`,
      );
      return;
    }

    setError("");
    setSuccess("");

    setSavingIds((current) =>
      current.includes(userId) ? current : [...current, userId],
    );

    
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...draft,
        status: nextStatus,
      },
    }));

    try {
      await markAttendance({
        userId,
        date,
        status: nextStatus,
      });

      setData((current) => {
        if (!current) return current;

        const rows = (current.rows || []).map((item) => {
          if (item.user._id !== userId) return item;

          return {
            ...item,
            status: nextStatus,
            isAutoDay: false,
            record: {
              ...(item.record || {}),
              status: nextStatus,
            },
          };
        });

        const summary = current.summary
          ? { ...current.summary }
          : null;

        if (summary && previousStatus !== nextStatus) {
          if (previousStatus === "not_marked") {
            summary.notMarked = Math.max(
              0,
              (summary.notMarked || 0) - 1,
            );
          } else {
            summary[previousStatus] = Math.max(
              0,
              (summary[previousStatus] || 0) - 1,
            );
          }

          summary[nextStatus] = (summary[nextStatus] || 0) + 1;
        }

        return { ...current, rows, summary };
      });

      setSuccess(`Attendance saved for ${row.user.name}.`);
    } catch (err) {
      setDrafts((current) => ({
        ...current,
        [userId]: {
          ...(current[userId] || draft),
          status: previousStatus === "not_marked" ? "not_marked" : previousStatus,
        },
      }));

      setError(getErrorMessage(err));
    } finally {
      setSavingIds((current) =>
        current.filter((id) => id !== userId),
      );
    }
  };

  
  const saveAttendance = async (row) => {
    const userId = row.user._id;
    const draft = drafts[userId] || createDraft(row);

    if (!canEdit || savingIds.includes(userId)) return;

    if (row.record?.leaveRequest || row.record?.isLeave) {
      setError(
        `${row.user.name} has approved leave for this date. Cancel the leave request before changing attendance.`,
      );
      return;
    }

    if (!isValidStatus(draft.status)) {
      setError(
        `Please select an attendance status for ${row.user.name} first.`,
      );
      return;
    }

    if (
      TIME_STATUSES.includes(draft.status) &&
      draft.checkOut &&
      !draft.checkIn
    ) {
      setError(
        `Please enter a check-in time for ${row.user.name} before entering a check-out time.`,
      );
      return;
    }

    const payload = {
      userId,
      date,
      status: draft.status,
      remarks: (draft.remarks || "").trim(),
    };

    if (TIME_STATUSES.includes(draft.status) && draft.checkIn) {
      payload.checkIn = draft.checkIn;
    }

    if (TIME_STATUSES.includes(draft.status) && draft.checkOut) {
      payload.checkOut = draft.checkOut;
    }

    setSavingIds((current) =>
      current.includes(userId) ? current : [...current, userId],
    );
    setError("");
    setSuccess("");

    try {
      await markAttendance(payload);
      setSuccess(`Attendance times saved for ${row.user.name}.`);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingIds((current) =>
        current.filter((id) => id !== userId),
      );
    }
  };

  const markAllPresent = async () => {
    const count = data?.summary?.notMarked ?? 0;

    if (!canEdit || !count || busy) return;

    const confirmed = window.confirm(
      `Mark all ${count} staff members with unrecorded attendance as Present?`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await bulkMark({ date, status: "present" });

      setSuccess(
        "All remaining staff members have been marked as Present.",
      );

      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resetDraft = (row) => {
    setDrafts((current) => ({
      ...current,
      [row.user._id]: createDraft(row),
    }));

    setError("");
    setSuccess("");
  };

  const summary = data?.summary;

  return (
    <div className="space-y-5">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded bg-blue-100 p-2.5 text-indigo-700">
              <CalendarDays size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Daily Attendance
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Manage staff attendance and working hours.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            title={`Daily Attendance - ${date}`}
            fileName={`daily-attendance-${date}`}
            columns={attendanceExportColumns}
            rows={data?.rows || []}
          />
          {canEdit && summary?.notMarked > 0 && (
            <button
              type="button"
              onClick={markAllPresent}
              disabled={busy || loading}
              className="inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white  transition  disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserCheck size={16} />
              )}
              Mark Remaining Present
            </button>
          )}
        </div>
      </div>

     
      <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white p-3 ">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDate(addDays(date, -1))}
            className="rounded border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            aria-label="Next day"
            disabled={date >= today}
            onClick={() => setDate(addDays(date, 1))}
            className="rounded border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <input
          type="date"
          max={today}
          value={date}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
          }}
          className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        <button
          type="button"
          onClick={() => setDate(today)}
          className="rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Today
        </button>

        <span className="text-sm font-medium text-slate-500">
          {formatDay(date)}
        </span>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Status saves automatically
        </div>
      </div>

   
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {data?.dayType && (
        <div
          role={isWeeklyOff ? "alert" : "status"}
          className={`flex items-start gap-3 rounded border px-4 py-3.5 text-sm ${
            isWeeklyOff
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-violet-200 bg-violet-50 text-violet-700"
          }`}
        >
          {isWeeklyOff && (
            <LockKeyhole size={19} className="mt-0.5 shrink-0" />
          )}
          <div>
            {isWeeklyOff ? (
              <>
                <p className="font-semibold">Weekly off is locked</p>
                <p className="mt-1 leading-5">
                  This day is designated as <strong>{data.dayType.name || "Weekly Off"}</strong>.
                  Attendance status, check-in/check-out times, and bulk attendance actions
                  are disabled for this date. Staff without individually recorded attendance
                  may be counted as off.
                </p>
              </>
            ) : (
              <>
                This day is designated as <strong>{data.dayType.name}</strong>.
                Staff members without individually recorded attendance may be counted as off.
              </>
            )}
          </div>
        </div>
      )}

      {data?.isLocked && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This month is locked because payroll has been processed.
          Attendance records cannot be changed.
        </div>
      )}

      
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Total Staff"
            value={summary.total}
            icon={Users}
            tone="text-slate-800"
          />

          <StatCard
            label="Present"
            value={summary.present}
            icon={CheckCircle2}
            tone="text-emerald-600"
          />

          <StatCard
            label="Half Day"
            value={summary.half_day}
            icon={Clock}
            tone="text-amber-600"
          />

          <StatCard
            label="Absent"
            value={summary.absent}
            icon={CircleAlert}
            tone="text-rose-600"
          />

          <StatCard
            label="On Leave"
            value={(summary.paid_leave || 0) + (summary.unpaid_leave || 0)}
            icon={UserCheck}
            tone="text-sky-600"
          />

          <StatCard
            label="Not Marked"
            value={summary.notMarked}
            icon={CircleAlert}
            tone={summary.notMarked ? "text-orange-600" : "text-slate-800"}
          />
        </div>
      )}

     
      <div className="overflow-hidden rounded border border-slate-200 bg-white ">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Staff Attendance
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Select a status to save it immediately. Save times separately.
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">Saved Status</th>
                <th className="px-4 py-3 font-semibold">Change Status</th>
                <th className="px-4 py-3 font-semibold">Check-in</th>
                <th className="px-4 py-3 font-semibold">Check-out</th>
                <th className="px-4 py-3 font-semibold">Hours</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2
                      size={24}
                      className="mx-auto animate-spin text-indigo-600"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Loading attendance...
                    </p>
                  </td>
                </tr>
              )}

              {!loading && (data?.rows || []).length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No staff members found.
                  </td>
                </tr>
              )}

              {!loading &&
                (data?.rows || []).map((row) => {
                  const userId = row.user._id;
                  const draft = drafts[userId] || createDraft(row);
                  const saving = savingIds.includes(userId);

                  const hasApprovedLeave = Boolean(
                    row.record?.leaveRequest || row.record?.isLeave,
                  );

                  const showTimes = TIME_STATUSES.includes(draft.status);

                  return (
                    <tr
                      key={userId}
                      className="align-top transition hover:bg-slate-50/70"
                    >
                      
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {row.user.name}
                        </p>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                          {row.user.role}
                        </p>

                        {row.record?.isLate && (
                          <p className="mt-1 text-xs text-amber-600">
                            Late by {row.record.lateMinutes} min
                          </p>
                        )}

                        {row.missingCheckOut && (
                          <p className="mt-1 text-xs text-rose-600">
                            Check-out missing
                          </p>
                        )}
                      </td>

                      
                      <td className="px-4 py-4">
                        <StatusChip status={row.status} />

                        {row.isAutoDay && (
                          <p className="mt-1 text-xs text-slate-400">
                            Automatic
                          </p>
                        )}

                        {saving && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-indigo-600">
                            <Loader2 size={12} className="animate-spin" />
                            Saving...
                          </p>
                        )}
                      </td>

                      
                      <td className="px-4 py-4">
                        <div className="flex w-[100px] gap-1.5">
                          {ATTENDANCE_OPTIONS.map((option) => {
                            const selected = draft.status === option.value;
                            const disabled =
                              !canEdit || saving || hasApprovedLeave;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                title={option.label}
                                aria-label={`${option.label} for ${row.user.name}`}
                                aria-pressed={selected}
                                disabled={disabled}
                                onClick={() => saveStatus(row, option.value)}
                                className={`rounded border px-2 py-2 text-xs font-semibold transition ${
                                  selected
                                    ? option.active
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-black"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {option.short}
                              </button>
                            );
                          })}
                        </div>

                        <p className="mt-1.5 text-[11px] text-slate-400">
                          {hasApprovedLeave
                            ? "Approved leave"
                            : "Auto-saves on selection"}
                        </p>
                      </td>

                      
                      <td className="px-4 py-4">
                        <div className="relative w-32">
                          <Clock
                            size={14}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="time"
                            value={draft.checkIn || ""}
                            onChange={(event) =>
                              updateDraft(userId, "checkIn", event.target.value)
                            }
                            disabled={
                              !canEdit ||
                              saving ||
                              !showTimes ||
                              hasApprovedLeave
                            }
                            aria-label={`Check-in time for ${row.user.name}`}
                            className="w-full rounded border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        {row.record?.checkInAt && (
                          <p className="mt-1 text-xs text-slate-400">
                            Saved: {formatTime(row.record.checkInAt)}
                          </p>
                        )}
                      </td>

                      
                      <td className="px-4 py-4">
                        <div className="relative w-32">
                          <Clock
                            size={14}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="time"
                            value={draft.checkOut || ""}
                            onChange={(event) =>
                              updateDraft(userId, "checkOut", event.target.value)
                            }
                            disabled={
                              !canEdit ||
                              saving ||
                              !showTimes ||
                              hasApprovedLeave
                            }
                            aria-label={`Check-out time for ${row.user.name}`}
                            className="w-full rounded border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        {row.record?.checkOutAt && (
                          <p className="mt-1 text-xs text-slate-400">
                            Saved: {formatTime(row.record.checkOutAt)}
                          </p>
                        )}
                      </td>

                      
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-700">
                          {formatMinutes(row.record?.workedMinutes)}
                        </p>

                        {row.record?.overtimeMinutes > 0 && (
                          <p className="mt-1 text-xs text-indigo-600">
                            OT: {formatMinutes(row.record.overtimeMinutes)}
                          </p>
                        )}
                      </td>

                      
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => resetDraft(row)}
                            disabled={saving}
                            title="Discard unsaved time changes"
                            className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                          >
                            <RotateCcw size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => saveAttendance(row)}
                            disabled={
                              !canEdit || saving || busy || hasApprovedLeave
                            }
                            className="inline-flex items-center gap-1.5 rounded bg-black px-3 py-2 text-xs font-semibold text-white transition  disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {saving ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}
                            Save Times
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <span>
            {data?.rows?.length || 0} staff members
          </span>
          <span>
            Status is saved automatically. Time changes require Save Times.
          </span>
        </div>
      </div>
    </div>
  );
};

export default DailyAttendance;
