
export function LoadingState({
  message = "Loading...",
  className = "",
}) {
  return (
    <div
      role="status"
      className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded border border-gray-200 bg-white p-6 ${className}`}
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900"
        aria-hidden="true"
      />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
  className = "",
}) {
  return (
    <div
      role="alert"
      className={`rounded border border-red-200 bg-white p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-red-50 text-red-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path
              d="M12 8v5m0 3h.01"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">
            Unable to Load Data
          </h3>
          <p className="mt-1 break-words text-sm text-gray-600">
            {message}
          </p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title = "No Data Found",
  description = "There is nothing to display here yet.",
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-white px-5 py-12 text-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded bg-gray-100">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-7 w-7 text-gray-500"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
          />
          <path
            d="M8 9h8M8 13h5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-900">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !loading) {
          onCancel?.();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restaurant-confirm-title"
        aria-describedby="restaurant-confirm-message"
        className="w-full max-w-md rounded border border-gray-200 bg-white p-6"
      >
        <div
          className={`flex h-11 w-11 items-center justify-center rounded ${
            destructive
              ? "bg-red-50 text-red-600"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path
              d="M12 8v5m0 3h.01"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2
          id="restaurant-confirm-title"
          className="mt-4 text-lg font-semibold text-gray-900"
        >
          {title}
        </h2>

        <p
          id="restaurant-confirm-message"
          className="mt-2 text-sm leading-6 text-gray-600"
        >
          {message}
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-900 hover:bg-gray-800"
            }`}
          >
            {loading ? "Please Wait..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
