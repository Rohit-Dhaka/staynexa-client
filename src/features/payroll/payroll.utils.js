import { ROLES } from "../../constants/roles";

export const MANAGEMENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

export const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

export const labelClass = "mb-1.5 block text-xs font-medium text-slate-700";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

export const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";

export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

export const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const pad = (n) => String(n).padStart(2, "0");

export const toDayKey = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const toPeriod = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const previousPeriod = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return toPeriod(d);
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const periodLabel = (period) => {
  if (!period) return "-";
  const [y, m] = String(period).split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

export const formatDate = (value) => {
  if (!value) return "-";
  const text = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(...text.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))))
    : new Date(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const PAYSLIP_STATUS_META = {
  draft: { label: "Draft", badge: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", badge: "bg-sky-100 text-sky-700" },
  paid: { label: "Paid", badge: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", badge: "bg-rose-100 text-rose-700" },
};

export const ADVANCE_STATUS_META = {
  active: { label: "Active", badge: "bg-amber-100 text-amber-700" },
  closed: { label: "Closed", badge: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", badge: "bg-slate-100 text-slate-600" },
};

export const PAYMENT_METHOD_OPTIONS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
];

export const PAY_DAYS_BASIS_OPTIONS = [
  { value: "calendar", label: "Actual days in the month" },
  { value: "fixed", label: "Fixed number of days" },
];

export const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value || "-";

export const formatHours = (minutes) => {
  const total = Number(minutes) || 0;
  if (!total) return "-";
  return `${Math.floor(total / 60)}h ${pad(total % 60)}m`;
};