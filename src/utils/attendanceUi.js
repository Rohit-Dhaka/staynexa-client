export const getErrorMessage = (err, fallback = "Kuch galat ho gaya") =>
  err?.response?.data?.message || err?.message || fallback;

const pad = (n) => String(n).padStart(2, "0");

export const toDayKey = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fromKey = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key, n) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
};

export const formatDay = (key) =>
  key
    ? fromKey(key).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

export const formatWeekday = (key) => fromKey(key).toLocaleDateString("en-IN", { weekday: "short" });

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-";

export const toTimeInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatMinutes = (min) => {
  if (!min) return "-";
  return `${Math.floor(min / 60)}h ${pad(min % 60)}m`;
};

export const formatUnits = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1));

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


export const ATTENDANCE_META = {
  present: {
    label: "Present",
    code: "P",
    chip: "bg-emerald-100 text-emerald-700",
  },
  absent: {
    label: "Absent",
    code: "A",
    chip: "bg-rose-100 text-rose-700",
  },
  half_day: {
    label: "Half Day",
    code: "HD",
    chip: "bg-amber-100 text-amber-700",
  },
  paid_leave: {
    label: "Paid Leave",
    code: "PL",
    chip: "bg-sky-100 text-sky-700",
  },
  unpaid_leave: {
    label: "Unpaid Leave",
    code: "UL",
    chip: "bg-orange-100 text-orange-700",
  },
  weekly_off: {
    label: "Weekly Off",
    code: "WO",
    chip: "bg-slate-100 text-slate-500",
  },
  holiday: {
    label: "Holiday",
    code: "H",
    chip: "bg-violet-100 text-violet-700",
  },
  not_marked: {
    label: "Not Marked",
    code: "-",
    chip: "bg-slate-50 text-slate-400",
  },
};


export const LEAVE_TYPES = [
  { value: "casual", label: "Casual leave", paid: true },
  { value: "sick", label: "Sick leave", paid: true },
  { value: "paid", label: "Paid leave", paid: true },
  { value: "unpaid", label: "Unpaid leave", paid: false },
];

export const LEAVE_STATUS_META = {
  pending: { label: "Pending", chip: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", chip: "bg-emerald-100 text-emerald-700" },
  partially_approved: { label: "Partially approved", chip: "bg-sky-100 text-sky-700" },
  rejected: { label: "Rejected", chip: "bg-rose-100 text-rose-700" },
  cancelled: { label: "Cancelled", chip: "bg-slate-100 text-slate-600" },
};

export const leaveTypeLabel = (value) => LEAVE_TYPES.find((t) => t.value === value)?.label || value;