
const STATUS_STYLES = {
  available: "border-green-200 bg-green-50 text-green-700",
  occupied: "border-red-200 bg-red-50 text-red-700",
  reserved: "border-blue-200 bg-black text-blue-700",
  cleaning: "border-amber-200 bg-amber-50 text-amber-700",
  maintenance: "border-gray-200 bg-gray-100 text-gray-600",
};

const formatStatus = (status = "available") =>
  String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function TableCard({
  table,
  onEdit,
  onStatusChange,
  onDelete,
  updating = false,
}) {
  if (!table) return null;

  const tableId = table._id || table.id;
  const tableNumber =
    table.tableNumber || table.number || table.name || "N/A";

  const capacity = Number(table.capacity ?? table.seats ?? 0);
  const status = String(table.status || "available").toLowerCase();

  const statusClass =
    STATUS_STYLES[status] || STATUS_STYLES.available;

  const canChangeStatus = Boolean(onStatusChange);

  return (
    <article className="rounded border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-6 w-6 text-gray-700"
              aria-hidden="true"
            >
              <rect x="5" y="8" width="14" height="8" rx="2" />
              <path
                d="M8 8V5m8 3V5M8 16v3m8-3v3M3 12h2m14 0h2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">
              Table {tableNumber}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {capacity} {capacity === 1 ? "seat" : "seats"}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}
        >
          {formatStatus(status)}
        </span>
      </div>

      {table.location && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span className="truncate">{table.location}</span>
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 pt-4">
        {canChangeStatus && (
          <div>
            <label
              htmlFor={`table-status-${tableId}`}
              className="mb-1.5 block text-xs font-medium text-gray-600"
            >
              Table Status
            </label>

            <select
              id={`table-status-${tableId}`}
              value={status}
              disabled={updating}
              onChange={(event) =>
                onStatusChange(tableId, event.target.value)
              }
              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-500 disabled:cursor-not-allowed disabled:"
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="cleaning">Cleaning</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(table)}
              disabled={updating}
              className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
            >
              Edit
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(table)}
              disabled={updating}
              className="flex-1 rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
