
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileSearch,
  LoaderCircle,
  PackageSearch,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

// =====================================================
// PAGE HEADING
// =====================================================

export function PageHeading({
  title,
  description,
  action,
  icon: Icon = PackageSearch,
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-700">
          <Icon size={23} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>

          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

const statStyles = {
  blue: {
    icon: "bg-blue-50 text-blue-700",
    value: "text-blue-700",
  },
  green: {
    icon: "bg-green-50 text-green-700",
    value: "text-green-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    value: "text-amber-700",
  },
  red: {
    icon: "bg-red-50 text-red-700",
    value: "text-red-700",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700",
    value: "text-violet-700",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    value: "text-slate-900",
  },
};

export function StatCard({
  title,
  value = 0,
  subtitle,
  icon: Icon = PackageSearch,
  color = "blue",
  loading = false,
}) {
  const styles = statStyles[color] || statStyles.blue;

  return (
    <div className="min-w-0 rounded border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">
            {title}
          </p>

          <div className="mt-3">
            {loading ? (
              <LoaderCircle
                size={25}
                className="animate-spin text-slate-400"
              />
            ) : (
              <p
                className={`text-3xl font-semibold tracking-tight ${styles.value}`}
              >
                {value ?? 0}
              </p>
            )}
          </div>

          {subtitle && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${styles.icon}`}
        >
          <Icon size={21} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

const statusStyles = {
  reported: "border-blue-200 bg-blue-50 text-blue-700",
  searching: "border-amber-200 bg-amber-50 text-amber-700",
  matched: "border-violet-200 bg-violet-50 text-violet-700",
  ready_for_pickup: "border-green-200 bg-green-50 text-green-700",
  returned: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",

  stored: "border-blue-200 bg-blue-50 text-blue-700",
  donated: "border-violet-200 bg-violet-50 text-violet-700",
  disposed: "border-slate-200 bg-slate-100 text-slate-700",

  pending: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-green-200 bg-green-50 text-green-700",
  checked_in: "border-emerald-200 bg-emerald-50 text-emerald-700",
  checked_out: "border-slate-200 bg-slate-100 text-slate-700",
};

const formatStatus = (status = "unknown") =>
  String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export function StatusBadge({ status }) {
  const normalizedStatus = String(status || "unknown").toLowerCase();

  const styles =
    statusStyles[normalizedStatus] ||
    "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />

      <span className="break-words">
        {formatStatus(normalizedStatus)}
      </span>
    </span>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

export function EmptyState({
  title = "No records found",
  description = "There are no records to display right now.",
  icon: Icon = Inbox,
  action,
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">
        <Icon size={27} strokeWidth={1.6} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// =====================================================
// ERROR MESSAGE
// =====================================================

export function ErrorMessage({
  message = "Something went wrong. Please try again.",
  onRetry,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          size={21}
          className="mt-0.5 shrink-0 text-red-600"
        />

        <div>
          <p className="text-sm font-semibold text-red-800">
            Unable to load data
          </p>

          <p className="mt-1 break-words text-sm leading-6 text-red-700">
            {message}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="w-fit shrink-0 rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// =====================================================
// LOADING
// =====================================================

export function Loading({
  message = "Loading...",
  fullPage = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullPage ? "min-h-[60vh]" : "min-h-48"
      }`}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        size={30}
        strokeWidth={1.8}
        className="animate-spin text-slate-600"
      />

      <p className="text-sm font-medium text-slate-500">
        {message}
      </p>
    </div>
  );
}

// =====================================================
// FORM FIELD WRAPPER
// =====================================================

export function Field({
  label,
  required = false,
  error,
  hint,
  children,
  className = "",
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}

          {required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {hint && !error && (
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      )}

      {error && (
        <p className="mt-1.5 text-xs leading-5 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// =====================================================
// SHARED FORM CONTROL CLASSES
// =====================================================

export const inputClass =
  "w-full min-w-0 rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export const selectClass =
  "w-full min-w-0 rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

export const textareaClass =
  "w-full min-w-0 resize-y rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

// =====================================================
// BUTTON
// =====================================================

const buttonVariants = {
  primary:
    "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:border-slate-800",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  success:
    "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  ghost:
    "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  ...props
}) {
  const sizes = {
    sm: "min-h-9 px-3 text-xs",
    md: "min-h-10 px-4 text-sm",
    lg: "min-h-11 px-5 text-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
        buttonVariants[variant] || buttonVariants.primary
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading && (
        <LoaderCircle size={16} className="animate-spin" />
      )}

      {children}
    </button>
  );
}

// =====================================================
// PAGINATION
// =====================================================

export function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onPageChange,
}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pages = Math.max(1, Number(totalPages) || 1);
  const pageSize = Math.max(1, Number(limit) || 10);
  const totalItems = Math.max(0, Number(total) || 0);

  const start =
    totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-slate-500">
        Showing{" "}
        <span className="font-medium text-slate-800">{start}</span>
        {" - "}
        <span className="font-medium text-slate-800">{end}</span>
        {" of "}
        <span className="font-medium text-slate-800">
          {totalItems}
        </span>
        {" records"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="min-w-20 text-center text-sm font-medium text-slate-700">
          Page {currentPage} of {pages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= pages}
          aria-label="Go to next page"
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// =====================================================
// SECTION HEADER
// =====================================================

export function SectionHeader({
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// =====================================================
// SUCCESS MESSAGE
// =====================================================

export function SuccessMessage({
  message = "Your changes have been saved successfully.",
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded border border-green-200 bg-green-50 p-4"
    >
      <CheckCircle2
        size={20}
        className="mt-0.5 shrink-0 text-green-700"
      />

      <p className="text-sm leading-6 text-green-800">
        {message}
      </p>
    </div>
  );
}

// =====================================================
// SEARCH EMPTY STATE
// =====================================================

export function SearchEmptyState({
  query,
  onClear,
}) {
  return (
    <EmptyState
      icon={FileSearch}
      title="No matching records"
      description={
        query
          ? `No records match "${query}". Try another search term.`
          : "Try changing your search or filters."
      }
      action={
        onClear ? (
          <Button variant="secondary" onClick={onClear}>
            Clear Filters
          </Button>
        ) : null
      }
    />
  );
}

// =====================================================
// DATE FORMATTER
// =====================================================

export function formatDate(date, options = {}) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(parsedDate);
}

// =====================================================
// DATE AND TIME FORMATTER
// =====================================================

export function formatDateTime(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsedDate);
}

// =====================================================
// CATEGORY FORMATTER
// =====================================================

export function formatCategory(category = "") {
  if (!category) return "Uncategorized";

  return String(category)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

// =====================================================
// STATUS ICON
// =====================================================

export function StatusIcon({ status }) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (
    ["returned", "ready_for_pickup"].includes(normalizedStatus)
  ) {
    return (
      <CheckCircle2
        size={17}
        className="shrink-0 text-green-600"
      />
    );
  }

  if (
    ["reported", "searching", "matched", "stored"].includes(
      normalizedStatus
    )
  ) {
    return (
      <Clock3
        size={17}
        className="shrink-0 text-amber-600"
      />
    );
  }

  return (
    <PackageSearch
      size={17}
      className="shrink-0 text-slate-500"
    />
  );
}
