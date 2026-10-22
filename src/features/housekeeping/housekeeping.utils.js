import { ROLES } from "../../constants/roles";

// Only these roles can create, assign, inspect and cancel tasks.
export const MANAGEMENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

// Values must match TASK_TYPES in the backend.
export const TASK_TYPE_OPTIONS = [
  { value: "room_cleaning", label: "Room Cleaning" },
  { value: "bathroom_cleaning", label: "Bathroom Cleaning" },
  { value: "linen_change", label: "Linen Change" },
  { value: "deep_cleaning", label: "Deep Cleaning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "restocking", label: "Restocking" },
  { value: "laundry", label: "Laundry" },
  { value: "public_area_cleaning", label: "Public Area Cleaning" },
  { value: "other", label: "Other" },
];

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const PRIORITY_BADGE = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-50 text-sky-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-rose-50 text-rose-700",
};

export const STATUS_META = {
  pending: { label: "Pending", badge: "bg-amber-50 text-amber-700" },
  assigned: { label: "Assigned", badge: "bg-indigo-50 text-indigo-700" },
  in_progress: { label: "In Progress", badge: "bg-black text-blue-700" },
  completed: { label: "Completed", badge: "bg-emerald-50 text-emerald-700" },
  inspected: { label: "Inspected", badge: "bg-teal-50 text-teal-700" },
  cancelled: { label: "Cancelled", badge: "bg-rose-50 text-rose-700" },
};

export const STATUS_KEYS = Object.keys(STATUS_META);

// Tasks that are still open (not finished or cancelled).
export const OPEN_STATUSES = ["pending", "assigned", "in_progress"];

export const labelFor = (options, value) =>
  options.find((option) => option.value === value)?.label || value || "-";

// The backend task number is long (HK-<24 characters>), so show the last 6.
export const shortTaskNumber = (taskNumber = "") =>
  taskNumber ? `HK-${String(taskNumber).slice(-6)}` : "-";

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
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

export const checklistProgress = (task) => {
  const items = task?.checklist || [];
  const done = items.filter((item) => item.isCompleted).length;
  const total = items.length;

  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
};

export const isOverdue = (task) =>
  OPEN_STATUSES.includes(task?.status) &&
  task?.scheduledAt &&
  new Date(task.scheduledAt) < new Date();

export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;