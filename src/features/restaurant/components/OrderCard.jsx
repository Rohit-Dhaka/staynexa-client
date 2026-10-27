
const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  placed: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-blue-200 bg-black text-blue-700",
  preparing: "border-indigo-200 bg-black text-indigo-700",
  ready: "border-green-200 bg-green-50 text-green-700",
  served: "border-green-200 bg-green-50 text-green-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

const formatLabel = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCurrency = (amount = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getGuestName = (order) => {
  const guest = order.guest || order.user || {};

  return (
    guest.name ||
    [guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
    order.guestName ||
    "Guest"
  );
};

const getItemName = (item) => {
  const menuItem = item.menuItem || item.item;

  if (typeof menuItem === "object" && menuItem !== null) {
    return menuItem.name || menuItem.title || "Menu Item";
  }

  return item.name || item.title || "Menu Item";
};

export default function OrderCard({
  order,
  onView,
  onStatusChange,
  onCancel,
  updating = false,
  currency = "INR",
}) {
  if (!order) return null;

  const orderId = order._id || order.id;
  const orderNumber =
    order.orderNumber ||
    order.orderId ||
    (orderId ? String(orderId).slice(-8).toUpperCase() : "N/A");

  const status = String(order.status || "pending").toLowerCase();

  const statusStyle =
    STATUS_STYLES[status] ||
    "border-gray-200  text-gray-700";

  const items = Array.isArray(order.items) ? order.items : [];

  const totalAmount = Number(
    order.totalAmount ??
      order.grandTotal ??
      order.total ??
      0
  );

  const createdAt = order.createdAt
    ? new Date(order.createdAt)
    : null;

  const validDate =
    createdAt && !Number.isNaN(createdAt.getTime());

  const canCancel = ["placed", "pending", "confirmed"].includes(
    status
  );

  return (
    <article className="rounded border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Order
          </p>

          <h3 className="mt-1 break-all text-lg font-semibold text-gray-900">
            #{String(orderNumber)}
          </h3>

          {validDate && (
            <p className="mt-1 text-sm text-gray-500">
              {createdAt.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle}`}
        >
          {formatLabel(status)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded  p-3">
          <p className="text-xs text-gray-500">Guest</p>
          <p className="mt-1 truncate text-sm font-medium text-gray-900">
            {getGuestName(order)}
          </p>
        </div>

        <div className="rounded  p-3">
          <p className="text-xs text-gray-500">Order Type</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {formatLabel(order.orderType || "N/A")}
          </p>
        </div>
      </div>

      {order.table && (
        <p className="mt-3 text-sm text-gray-600">
          Table:{" "}
          {typeof order.table === "object"
            ? order.table.tableNumber ||
              order.table.name ||
              "Assigned"
            : order.table}
        </p>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Order Items ({items.length})
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            No items available.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, 3).map((item, index) => (
              <li
                key={
                  item._id ||
                  item.menuItem?._id ||
                  item.menuItem ||
                  index
                }
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="min-w-0 break-words text-gray-700">
                  {getItemName(item)}{" "}
                  <span className="text-gray-500">
                    × {Number(item.quantity) || 1}
                  </span>
                </span>

                <span className="shrink-0 text-gray-600">
                  {formatCurrency(
                    item.lineTotal ??
                      item.total ??
                      (Number(item.price ?? item.unitPrice ?? 0) *
                        (Number(item.quantity) || 1)),
                    currency
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {items.length > 3 && (
          <p className="mt-2 text-xs text-gray-500">
            +{items.length - 3} more items
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <div>
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatCurrency(totalAmount, currency)}
          </p>
        </div>

        {onView && (
          <button
            type="button"
            onClick={() => onView(order)}
            className="rounded border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:"
          >
            View Details
          </button>
        )}
      </div>

      {(onStatusChange || (onCancel && canCancel)) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {onStatusChange && (
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-medium text-gray-600">
                Update Status
              </span>

              <select
                value={status}
                onChange={(event) =>
                  onStatusChange(orderId, event.target.value)
                }
                disabled={updating}
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-500 disabled:opacity-50"
              >
                <option value={status}>
                  {formatLabel(status)}
                </option>
                {[
                  "confirmed",
                  "preparing",
                  "ready",
                  "served",
                  "completed",
                ]
                  .filter((value) => value !== status)
                  .map((value) => (
                    <option key={value} value={value}>
                      {formatLabel(value)}
                    </option>
                  ))}
              </select>
            </label>
          )}

          {onCancel && canCancel && (
            <button
              type="button"
              onClick={() => onCancel(order)}
              disabled={updating}
              className="self-end rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}
        </div>
      )}
    </article>
  );
}
