// import { ROLES } from "../../constants/roles";
import { ROLES } from "../../src/constants/roles";

export const MANAGEMENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

export const DEFAULT_TAX_PERCENT = 18;

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

export const labelClass = "mb-1.5 block text-xs font-medium text-slate-700";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

export const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";

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

export const fromDayKey = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key, days) => {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + days);
  return toDayKey(d);
};

export const formatDate = (value) => {
  if (!value) return "-";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? fromDayKey(value) : new Date(value);
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

export const formatTime = (hhmm) => {
  if (!hhmm) return "-";
  const [h, m] = String(hhmm).split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
};

export const minutesOf = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
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

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const STATUS_META = {
  tentative: { label: "Tentative", badge: "bg-amber-100 text-amber-700", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  confirmed: { label: "Confirmed", badge: "bg-emerald-100 text-emerald-700", chip: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  completed: { label: "Completed", badge: "bg-slate-100 text-slate-600", chip: "bg-slate-50 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled", badge: "bg-rose-100 text-rose-700", chip: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const PAYMENT_STATUS_META = {
  unpaid: { label: "Unpaid", badge: "bg-rose-100 text-rose-700" },
  partial: { label: "Partially paid", badge: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", badge: "bg-emerald-100 text-emerald-700" },
  refunded: { label: "Refunded", badge: "bg-slate-100 text-slate-600" },
};

export const EVENT_TYPE_OPTIONS = [
  { value: "wedding", label: "Wedding" },
  { value: "reception", label: "Reception" },
  { value: "engagement", label: "Engagement" },
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "corporate", label: "Corporate event" },
  { value: "conference", label: "Conference" },
  { value: "party", label: "Party" },
  { value: "other", label: "Other" },
];

export const SETUP_STYLE_OPTIONS = [
  { value: "banquet", label: "Banquet (round tables)" },
  { value: "theatre", label: "Theatre" },
  { value: "classroom", label: "Classroom" },
  { value: "u_shape", label: "U-shape" },
  { value: "cocktail", label: "Cocktail" },
  { value: "boardroom", label: "Boardroom" },
  { value: "other", label: "Other" },
];

export const PRICING_TYPE_OPTIONS = [
  { value: "per_hour", label: "Per hour" },
  { value: "per_event", label: "Per event (flat)" },
];

export const MEAL_TYPE_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "hi_tea", label: "Hi-tea" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
  { value: "beverages", label: "Beverages" },
  { value: "other", label: "Other" },
];

export const FOOD_TYPE_OPTIONS = [
  { value: "veg", label: "Vegetarian" },
  { value: "non_veg", label: "Non-vegetarian" },
  { value: "jain", label: "Jain" },
  { value: "mixed", label: "Mixed" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
];

export const PAYMENT_TYPE_OPTIONS = [
  { value: "advance", label: "Advance" },
  { value: "partial", label: "Partial payment" },
  { value: "final", label: "Final settlement" },
  { value: "refund", label: "Refund" },
];

export const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value || "-";