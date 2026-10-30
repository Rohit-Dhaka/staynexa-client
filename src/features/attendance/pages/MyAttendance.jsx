import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {  Clock, Loader2, LogIn, LogOut } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import {
  clockIn,
  clockOut,
  getLeaveBalance,
  getMonthlySheet,
  getMyToday,
} from "../services/attendance.service";
import { StatusChip } from "../components/AttendanceChip";
import LeaveApplyModal from "../components/LeaveApplyModal";
import {
  ATTENDANCE_META,
  MONTH_NAMES,
  formatDay,
  formatMinutes,
  formatTime,
  formatUnits,
  getErrorMessage,
} from "../../../utils/attendanceUi";

const StatCard = ({ label, value, tone = "text-slate-900" }) => (
  <div className="rounded border border-slate-200 bg-white p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`text-xl font-semibold ${tone}`}>{value}</p>
  </div>
);

const MyAttendance = () => {
  const { user } = useAuth();
  const myId = user?._id || user?.id;

  const [today, setToday] = useState(null);
  const [month, setMonth] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    const d = new Date();
    const [t, m, b] = await Promise.allSettled([
      getMyToday(),
      getMonthlySheet({ year: d.getFullYear(), month: d.getMonth() + 1, userId: myId }),
      getLeaveBalance({}),
    ]);
    if (t.status === "fulfilled") setToday(t.value);
    else setError(getErrorMessage(t.reason));
    setMonth(m.status === "fulfilled" ? m.value : null);
    setBalance(b.status === "fulfilled" ? b.value : null);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const act = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const record = today?.record;
  const row = month?.rows?.[0];
  const totals = row?.totals;
  const leaveDays = (totals?.paidLeave || 0) + (totals?.unpaidLeave || 0);
  const status = record?.status || today?.dayType?.type || "not_marked";

  return (

<div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">My Attendance</h2>
      <p className="text-sm text-slate-500">
        Clock in/out, view your monthly attendance, and check your leave balance
      </p>
    </div>
    <div className="flex gap-2">
      <Link
        to="/attendance/leaves"
        className="rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 "
      >
        My Leaves
      </Link>
 
    </div>
  </div>

  {error && (
    <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">
      {error}
    </p>
  )}

  {today && (
    <div className="rounded border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-3xl font-semibold text-slate-900">
            <Clock size={26} className="text-black" />
            {now.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDay(today.dateKey)}, shift {today.shift.start} to{" "}
            {today.shift.end} (grace period: {today.shift.graceMinutes} minutes)
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusChip status={status} />
            {record?.isLate && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Late by {record.lateMinutes} minutes
              </span>
            )}
            {today.dayType && !record && (
              <span className="text-xs text-slate-500">
                {today.dayType.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!today.canClockIn || busy}
            onClick={() => act(clockIn)}
            className="flex items-center gap-2 rounded bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition  disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LogIn size={16} /> Clock In
          </button>
          <button
            type="button"
            disabled={!today.canClockOut || busy}
            onClick={() => act(clockOut)}
            className="flex items-center gap-2 rounded bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition  disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LogOut size={16} /> Clock Out
          </button>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm md:grid-cols-4">
        <div>
          <dt className="text-slate-500">Check-in Time</dt>
          <dd className="font-medium text-slate-900">
            {formatTime(record?.checkInAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Check-out Time</dt>
          <dd className="font-medium text-slate-900">
            {formatTime(record?.checkOutAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Total Hours Worked</dt>
          <dd className="font-medium text-slate-900">
            {formatMinutes(record?.workedMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Overtime</dt>
          <dd className="font-medium text-slate-900">
            {formatMinutes(record?.overtimeMinutes)}
          </dd>
        </div>
      </dl>
    </div>
  )}

  {totals ? (
    <>
      <h2 className="text-base font-semibold text-slate-900">
        {MONTH_NAMES[month.month - 1]} {month.year}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Present"
          value={totals.present}
          tone="text-emerald-600"
        />
        <StatCard label="Half Day" value={totals.halfDay} />
        <StatCard
          label="Absent"
          value={totals.absent}
          tone="text-rose-600"
        />
        <StatCard label="Leave" value={leaveDays} tone="text-sky-600" />
        <StatCard label="Late Arrivals" value={totals.lateCount} tone="text-amber-600" />
        <StatCard
          label="Payable Days"
          value={formatUnits(totals.payableDays)}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 rounded border border-slate-200 bg-white p-4">
        {row.days.map((c) => {
          const meta = ATTENDANCE_META[c.status] || null;
          return (
            <div
              key={c.date}
              className="w-11 text-center"
              title={c.note || meta?.label || ""}
            >
              <p className="text-[10px] text-slate-400">
                {Number(c.date.split("-")[2])}
              </p>
              <p
                className={`rounded py-1 text-[11px] font-semibold ${
                  meta ? meta.chip : "bg-white text-slate-200"
                } ${c.isLate ? "ring-1 ring-amber-500" : ""}`}
              >
                {c.status ? c.code : "."}
              </p>
            </div>
          );
        })}
      </div>
    </>
  ) : (
    <p className="rounded border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
      Attendance is not tracked for this account. Attendance tracking is only
      available for staff members and managers.
    </p>
  )}

  {balance && (
    <>
      <h2 className="text-base font-semibold text-slate-900">
        Leave Balance for {balance.year}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["casual", "sick", "paid"].map((type) => (
          <div
            key={type}
            className="rounded border border-slate-200 bg-white p-4"
          >
            <p className="text-xs capitalize text-slate-500">
              {type} Leave
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {formatUnits(balance[type].remaining)}{" "}
              <span className="text-sm font-normal text-slate-400">
                /{" "}
                {formatUnits(
                  balance[type].allotted + balance[type].carriedForward
                )}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              {formatUnits(balance[type].used)} used
            </p>
          </div>
        ))}
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Unpaid Leave Taken</p>
          <p className="text-xl font-semibold text-slate-900">
            {formatUnits(balance.unpaidTaken)}
          </p>
        </div>
      </div>
    </>
  )}

  {applying && (
    <LeaveApplyModal
      onClose={() => setApplying(false)}
      onDone={() => {
        setApplying(false);
        load();
      }}
    />
  )}
</div>

  );
};

export default MyAttendance;