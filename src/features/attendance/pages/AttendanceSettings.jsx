import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  Users,
  Wallet,
  X,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import {
  createHoliday,
  deleteHoliday,
  getSettings,
  listHolidays,
  lockMonth,
  unlockMonth,
  updateSettings,
} from "../services/attendance.service";
import { Field, inputClass } from "../../bookings/components/formUi";
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  formatDay,
  getErrorMessage,
} from "../../../utils/attendanceUi";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const sectionClass = "rounded-lg border border-slate-200 bg-white p-4 sm:p-5";
const headingClass = "text-base font-semibold text-slate-900";
const labelClass = "text-sm font-medium text-slate-700";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

const toForm = (s) => ({
  shiftStart: s.shiftStart,
  shiftEnd: s.shiftEnd,
  graceMinutes: String(s.graceMinutes),
  fullDayMinutes: String(s.fullDayMinutes),
  halfDayMinutes: String(s.halfDayMinutes),
  overtimeAfterMinutes: String(s.overtimeAfterMinutes),
  weeklyOffDays: s.weeklyOffDays,
  casual: String(s.leaveQuota.casual),
  sick: String(s.leaveQuota.sick),
  paid: String(s.leaveQuota.paid),
  allowSelfClockIn: s.allowSelfClockIn,
});

const AttendanceSettings = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [locking, setLocking] = useState("");
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [holiday, setHoliday] = useState({ date: "", name: "", type: "public" });

  const previousMonth = new Date();
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const [lockYm, setLockYm] = useState({
    year: previousMonth.getFullYear(),
    month: previousMonth.getMonth() + 1,
  });

  const flash = (type, text) => setMsg({ type, text });

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const result = await getSettings();
      setSettings(result);
      setForm(toForm(result));
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      setHolidays(await listHolidays({ year: holidayYear }));
    } finally {
      setLoadingHolidays(false);
    }
  }, [holidayYear]);

  useEffect(() => {
    loadSettings().catch((error) => flash("error", getErrorMessage(error)));
  }, [loadSettings]);

  useEffect(() => {
    loadHolidays().catch((error) => flash("error", getErrorMessage(error)));
  }, [loadHolidays]);

  const totalLeaveQuota = useMemo(() => {
    if (!form) return 0;
    return [form.casual, form.sick, form.paid].reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [form]);

  const saveSettings = async () => {
    if (!form) return;
    const numericValues = [
      form.graceMinutes,
      form.fullDayMinutes,
      form.halfDayMinutes,
      form.overtimeAfterMinutes,
      form.casual,
      form.sick,
      form.paid,
    ];
    if (numericValues.some((value) => value === "" || !Number.isFinite(Number(value)) || Number(value) < 0)) {
      return flash("error", "Please enter valid zero or positive numbers in numeric fields.");
    }
    if (Number(form.halfDayMinutes) > Number(form.fullDayMinutes)) {
      return flash("error", "Half-day duration cannot exceed full-day duration.");
    }

    setSaving(true);
    flash("", "");
    try {
      await updateSettings({
        shiftStart: form.shiftStart,
        shiftEnd: form.shiftEnd,
        graceMinutes: Number(form.graceMinutes),
        fullDayMinutes: Number(form.fullDayMinutes),
        halfDayMinutes: Number(form.halfDayMinutes),
        overtimeAfterMinutes: Number(form.overtimeAfterMinutes),
        weeklyOffDays: form.weeklyOffDays,
        leaveQuota: {
          casual: Number(form.casual),
          sick: Number(form.sick),
          paid: Number(form.paid),
        },
        allowSelfClockIn: form.allowSelfClockIn,
      });
      await loadSettings();
      flash("ok", "Attendance settings saved successfully.");
    } catch (error) {
      flash("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleOff = (day) => {
    setForm((current) => ({
      ...current,
      weeklyOffDays: current.weeklyOffDays.includes(day)
        ? current.weeklyOffDays.filter((item) => item !== day)
        : [...current.weeklyOffDays, day].sort((a, b) => a - b),
    }));
  };

  const addHoliday = async () => {
    flash("", "");
    if (!holiday.date || !holiday.name.trim()) {
      return flash("error", "Please enter the holiday date and name.");
    }
    setAddingHoliday(true);
    try {
      await createHoliday({ date: holiday.date, name: holiday.name.trim(), type: holiday.type });
      setHoliday({ date: "", name: "", type: "public" });
      await loadHolidays();
      flash("ok", "Holiday added successfully.");
    } catch (error) {
      flash("error", getErrorMessage(error));
    } finally {
      setAddingHoliday(false);
    }
  };

  const removeHoliday = async (item) => {
    if (!window.confirm(`Remove ${item.name} (${formatDay(item.dateKey)})?`)) return;
    setRemovingId(item._id);
    flash("", "");
    try {
      await deleteHoliday(item._id);
      await loadHolidays();
      flash("ok", "Holiday removed successfully.");
    } catch (error) {
      flash("error", getErrorMessage(error));
    } finally {
      setRemovingId("");
    }
  };

  const doLock = async (action, key, successText) => {
    flash("", "");
    setLocking(key);
    try {
      await action(lockYm);
      await loadSettings();
      flash("ok", successText);
    } catch (error) {
      flash("error", getErrorMessage(error));
    } finally {
      setLocking("");
    }
  };

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const numberField = (name) => (
    <input
      type="number"
      min="0"
      step="1"
      value={form[name]}
      onChange={(event) => updateField(name, event.target.value)}
      className={inputClass}
    />
  );
  const formatMinutes = (value) => {
    const minutes = Number(value) || 0;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (!hours) return `${remaining} min`;
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  if (loadingSettings && !form) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        <RefreshCw size={17} className="mr-2 animate-spin" /> Loading attendance settings...
      </div>
    );
  }

  if (!form || !settings) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Settings could not be loaded. Please refresh and try again.</div>;
  }

  return (
    <div className="w-full space-y-4 text-slate-800">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Attendance Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage shifts, leave quotas, holidays and attendance locks.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadSettings().catch((error) => flash("error", getErrorMessage(error)));
            loadHolidays().catch((error) => flash("error", getErrorMessage(error)));
          }}
          className={cx(buttonClass, "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}
        >
          <RefreshCw size={15} className={cx((loadingSettings || loadingHolidays) && "animate-spin")} /> Refresh
        </button>
      </header>

      {msg.text && (
        <div className={cx(
          "flex items-start gap-2 rounded-lg border p-3 text-sm",
          msg.type === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700",
        )}>
          {msg.type === "ok" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{msg.text}</span>
          <button type="button" onClick={() => flash("", "")} aria-label="Dismiss message"><X size={16} /></button>
        </div>
      )}

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2">
          <Clock3 size={18} className="text-slate-500" />
          <h2 className={headingClass}>Shift & Attendance</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Shift starts"><input type="time" value={form.shiftStart} onChange={(e) => updateField("shiftStart", e.target.value)} className={inputClass} /></Field>
          <Field label="Shift ends"><input type="time" value={form.shiftEnd} onChange={(e) => updateField("shiftEnd", e.target.value)} className={inputClass} /></Field>
          <Field label="Grace period (minutes)">{numberField("graceMinutes")}</Field>
          <Field label="Full-day duration (minutes)">{numberField("fullDayMinutes")}</Field>
          <Field label="Half-day duration (minutes)">{numberField("halfDayMinutes")}</Field>
          <Field label="Overtime threshold (minutes)">{numberField("overtimeAfterMinutes")}</Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">Current shift: {form.shiftStart}–{form.shiftEnd}. Full day: {formatMinutes(form.fullDayMinutes)}; half day: {formatMinutes(form.halfDayMinutes)}.</p>
      </section>

      <section className={sectionClass}>
        <div className="mb-3 flex items-center gap-2"><CalendarDays size={18} className="text-slate-500" /><h2 className={headingClass}>Weekly Off Days</h2></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEKDAY_LABELS.map((label, day) => {
            const active = form.weeklyOffDays.includes(day);
            return (
              <button key={label} type="button" aria-pressed={active} onClick={() => toggleOff(day)} className={cx(
                "rounded-lg border px-3 py-2 text-sm font-medium",
                active ? " bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}>
                {label}<span className="mt-1 block text-xs font-normal">{active ? "Day off" : "Working"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2"><Wallet size={18} className="text-slate-500" /><h2 className={headingClass}>Leave Quotas</h2></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Casual leave (days/year)">{numberField("casual")}</Field>
          <Field label="Sick leave (days/year)">{numberField("sick")}</Field>
          <Field label="Paid leave (days/year)">{numberField("paid")}</Field>
        </div>
        <p className="mt-3 text-sm text-slate-500">Total default annual quota: <strong className="text-slate-800">{totalLeaveQuota} days</strong>. These defaults apply to new staff; existing balances are not changed.</p>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2"><Users size={18} className="text-slate-500" /><h2 className={headingClass}>Employee Self-Service</h2></div>
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span><span className="block text-sm font-medium">Allow staff to clock in/out</span><span className="mt-1 block text-xs text-slate-500">Employees can record their own attendance.</span></span>
          <input type="checkbox" checked={form.allowSelfClockIn} onChange={(e) => updateField("allowSelfClockIn", e.target.checked)} className="h-4 w-4 accent-slate-800" />
        </label>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2"><CalendarDays size={18} className="text-slate-500" /><h2 className={headingClass}>Holiday Calendar</h2></div>
          <select aria-label="Holiday year" value={holidayYear} onChange={(e) => setHolidayYear(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {[-1, 0, 1].map((offset) => { const year = new Date().getFullYear() + offset; return <option key={year} value={year}>{year}</option>; })}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Holiday date"><input type="date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} className={inputClass} /></Field>
          <Field label="Holiday name"><input value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} placeholder="e.g. Diwali" className={inputClass} /></Field>
          <Field label="Holiday type"><select value={holiday.type} onChange={(e) => setHoliday({ ...holiday, type: e.target.value })} className={inputClass}><option value="public">Public</option><option value="company">Company</option><option value="optional">Optional</option></select></Field>
          <div className="flex items-end"><button type="button" onClick={addHoliday} disabled={addingHoliday} className={cx(buttonClass, "w-full bg-blue-600 text-white hover:bg-slate-700")}>{addingHoliday ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />} Add holiday</button></div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3">
          {loadingHolidays ? <p className="py-4 text-sm text-slate-500">Loading holidays...</p> : holidays.length === 0 ? <p className="py-4 text-sm text-slate-500">No holidays added for {holidayYear}.</p> : (
            <ul className="divide-y divide-slate-100">
              {holidays.map((item) => (
                <li key={item._id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{formatDay(item.dateKey)} · {item.type}</p></div>
                  <button type="button" onClick={() => removeHoliday(item)} disabled={removingId === item._id} title="Remove holiday" aria-label={`Remove ${item.name}`} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">{removingId === item._id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2"><LockKeyhole size={18} className="text-slate-500" /><h2 className={headingClass}>Monthly Attendance Lock</h2></div>
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="font-medium">Status: </span>{settings.lockedUntil ? `Locked through ${formatDay(settings.lockedUntil)}` : "No months are locked"}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Month"><select value={lockYm.month} onChange={(e) => setLockYm({ ...lockYm, month: Number(e.target.value) })} className={inputClass}>{MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></Field>
          <Field label="Year"><select value={lockYm.year} onChange={(e) => setLockYm({ ...lockYm, year: Number(e.target.value) })} className={inputClass}>{[-1, 0].map((offset) => { const year = new Date().getFullYear() + offset; return <option key={year} value={year}>{year}</option>; })}</select></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => doLock(lockMonth, "lock", "Month locked successfully.")} disabled={Boolean(locking)} className={cx(buttonClass, "bg-blue-600 text-white ")}><LockKeyhole size={15} />{locking === "lock" ? "Locking..." : "Lock month"}</button>
          {isSuperAdmin && <button type="button" onClick={() => doLock(unlockMonth, "unlock", "Month unlocked successfully.")} disabled={Boolean(locking)} className={cx(buttonClass, "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}><UnlockKeyhole size={15} />{locking === "unlock" ? "Unlocking..." : "Unlock month"}</button>}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> A month can only be locked after it ends. Locking a month also locks all earlier months. Only a Super Admin can unlock a month.</p>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => { setForm(toForm(settings)); flash("", ""); }} disabled={saving} className={cx(buttonClass, "border border-slate-300 bg-white text-slate-700 ")}>Reset changes</button>
        <button type="button" onClick={saveSettings} disabled={saving} className={cx(buttonClass, "bg-blue-600 px-5 text-white hover:bg-slate-700")}>
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
};

export default AttendanceSettings;
