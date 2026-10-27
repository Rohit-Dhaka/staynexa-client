export const getErrorMessage = (err, fallback = "Something went wrong.") =>
  err?.response?.data?.message || err?.message || fallback;

export const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

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

const pad = (n) => String(n).padStart(2, "0");

export const toInputDate = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDaysToInput = (value, days) => {
  const [y, m, d] = String(value).split("-").map(Number);
  return toInputDate(new Date(y, m - 1, d + days));
};

export const nightsBetween = (from, to) => {
  if (!from || !to) return 0;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd)) / 86400000);
};

export const BOOKING_STATUS_META = {
    hold: { label: "Hold", badge: "bg-black text-indigo-700", bar: "bg-black" },
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  confirmed: { label: "Confirmed", badge: "bg-sky-100 text-sky-700", bar: "bg-sky-500" },
  checked_in: { label: "Checked in", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  checked_out: { label: "Checked out", badge: "bg-slate-100 text-slate-600", bar: "bg-slate-400" },
  cancelled: { label: "Cancelled", badge: "bg-rose-100 text-rose-700", bar: "bg-rose-400" },
  no_show: { label: "No show", badge: "bg-orange-100 text-orange-700", bar: "bg-orange-400" },
};

export const PAYMENT_STATUS_META = {
  unpaid: { label: "Unpaid", badge: "bg-rose-100 text-rose-700" },
  partial: { label: "Partial", badge: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", badge: "bg-emerald-100 text-emerald-700" },
  refunded: { label: "Refunded", badge: "bg-slate-100 text-slate-600" },
};

export const BOOKING_VIEWS = [
  { value: "", label: "All" },
  { value: "arrivals", label: "Arrivals today" },
  { value: "departures", label: "Departures today" },
  { value: "in_house", label: "In-house" },
  { value: "holds", label: "Holds" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
];

export const BOOKING_SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "online", label: "Online" },
  { value: "ota", label: "OTA" },
  { value: "agent", label: "Agent" },
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
];

export const ID_PROOF_TYPES = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving license" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan", label: "PAN" },
  { value: "other", label: "Other" },
];

export const CHARGE_CATEGORIES = [
  { value: "food", label: "Food", staff: true },
  { value: "laundry", label: "Laundry", staff: true },
  { value: "minibar", label: "Minibar", staff: true },
  { value: "service", label: "Service", staff: true },
  { value: "extra_bed", label: "Extra bed", staff: true },
  { value: "other", label: "Other", staff: true },
  { value: "damage", label: "Damage", staff: false },
];

export const timeLeft = (value) => {
  if (!value) return "";

  const diff = new Date(value) - new Date();

  if (diff <= 0) return "Expired";

  const mins = Math.floor(diff / 60000);

  if (mins < 60) {
    return `${mins} minute${mins !== 1 ? "s" : ""} remaining`;
  }

  const hours = Math.floor(mins / 60);

  if (hours < 48) {
    const remainingMins = mins % 60;

    return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMins} minute${remainingMins !== 1 ? "s" : ""} remaining`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days !== 1 ? "s" : ""} remaining`;
};