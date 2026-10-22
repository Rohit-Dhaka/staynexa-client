
const formatCurrency = (amount = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getId = (value) =>
  typeof value === "object" && value !== null
    ? value._id || value.id || ""
    : value || "";

const getItemName = (item) => {
  const menuItem = item?.menuItem || item?.item;

  if (typeof menuItem === "object" && menuItem !== null) {
    return menuItem.name || menuItem.title || "Menu Item";
  }

  return item?.name || item?.title || "Menu Item";
};

const getStatusStyle = (status = "") => {
  const value = status.toLowerCase();

  if (["completed", "served", "paid"].includes(value)) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (["cancelled", "canceled", "rejected"].includes(value)) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (["preparing", "ready"].includes(value)) {
    return "bg-black text-blue-700 border-blue-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
};

const formatLabel = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export default function OrderDetails({
  order,
  onClose,
  currency = "INR",
}) {
  if (!order) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">
          No order selected.
        </p>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  const guest = order.guest || order.user || {};
  const guestName =
    guest.name ||
    [guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
    "Guest";

  const tableNumber =
    order.table?.tableNumber ||
    order.table?.name ||
    order.tableNumber ||
    "";

  const orderNumber =
    order.orderNumber ||
    order.orderId ||
    order._id ||
    order.id ||
    "N/A";

  const subtotal = Number(
    order.subtotal ?? order.subTotal ?? 0
  );

  const tax = Number(order.taxAmount ?? order.tax ?? 0);

  const serviceCharge = Number(
    order.serviceChargeAmount ?? order.serviceCharge ?? 0
  );

  const total = Number(
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

  return (
    <section className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-5">
        <div>
          <p className="text-sm text-gray-500">Order Details</p>

          <h2 className="mt-1 break-all text-xl font-semibold text-gray-900">
            #{String(orderNumber).slice(-12)}
          </h2>

          {validDate && (
            <p className="mt-1 text-sm text-gray-500">
              {createdAt.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyle(
              order.status
            )}`}
          >
            {formatLabel(order.status || "pending")}
          </span>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order details"
              className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-gray-200 p-5 sm:grid-cols-2">
        <div className="rounded  p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Guest
          </p>
          <p className="mt-2 font-medium text-gray-900">
            {guestName}
          </p>

          {guest.phone && (
            <p className="mt-1 text-sm text-gray-600">
              {guest.phone}
            </p>
          )}

          {guest.email && (
            <p className="mt-1 break-all text-sm text-gray-600">
              {guest.email}
            </p>
          )}
        </div>

        <div className="rounded  p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Order Information
          </p>

          <p className="mt-2 text-sm text-gray-700">
            <span className="text-gray-500">Type: </span>
            {formatLabel(order.orderType || "N/A")}
          </p>

          {tableNumber && (
            <p className="mt-1 text-sm text-gray-700">
              <span className="text-gray-500">Table: </span>
              {tableNumber}
            </p>
          )}

          {order.roomNumber && (
            <p className="mt-1 text-sm text-gray-700">
              <span className="text-gray-500">Room: </span>
              {order.roomNumber}
            </p>
          )}

          {order.paymentStatus && (
            <p className="mt-1 text-sm text-gray-700">
              <span className="text-gray-500">Payment: </span>
              {formatLabel(order.paymentStatus)}
            </p>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="mb-4 font-semibold text-gray-900">
          Ordered Items
        </h3>

        {items.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No items found for this order.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const quantity = Number(item.quantity) || 0;
              const unitPrice = Number(
                item.unitPrice ??
                  item.price ??
                  item.priceAtOrder ??
                  0
              );

              const lineTotal = Number(
                item.lineTotal ??
                  item.total ??
                  item.subtotal ??
                  unitPrice * quantity
              );

              return (
                <div
                  key={
                    getId(item.menuItem || item.item) ||
                    item._id ||
                    index
                  }
                  className="flex items-start justify-between gap-4 rounded border border-gray-100 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {getItemName(item)}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatCurrency(unitPrice, currency)} ×{" "}
                      {quantity}
                    </p>

                    {item.notes && (
                      <p className="mt-1 text-sm text-gray-500">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>

                  <p className="shrink-0 font-medium text-gray-900">
                    {formatCurrency(lineTotal, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {order.notes && (
        <div className="mx-5 mb-5 rounded border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-900">
            Order Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
            {order.notes}
          </p>
        </div>
      )}

      <div className="border-t border-gray-200  p-5">
        <h3 className="mb-4 font-semibold text-gray-900">
          Payment Summary
        </h3>

        <div className="space-y-3 text-sm">
          {order.subtotal != null || order.subTotal != null ? (
            <div className="flex justify-between gap-4 text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
          ) : null}

          {(order.taxAmount != null || order.tax != null) && (
            <div className="flex justify-between gap-4 text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(tax, currency)}</span>
            </div>
          )}

          {(order.serviceChargeAmount != null ||
            order.serviceCharge != null) && (
            <div className="flex justify-between gap-4 text-gray-600">
              <span>Service Charge</span>
              <span>
                {formatCurrency(serviceCharge, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
            <span>Total Amount</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>

          {order.paidAmount != null && (
            <div className="flex justify-between gap-4 text-gray-600">
              <span>Paid Amount</span>
              <span>
                {formatCurrency(order.paidAmount, currency)}
              </span>
            </div>
          )}

          {order.dueAmount != null && (
            <div className="flex justify-between gap-4 text-gray-600">
              <span>Due Amount</span>
              <span>
                {formatCurrency(order.dueAmount, currency)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
