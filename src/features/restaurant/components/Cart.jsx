
import { useMemo, useState } from "react";

const formatCurrency = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getItemId = (item) => item._id || item.id;

export default function Cart({
  items = [],
  onQuantityChange,
  onRemove,
  onSubmit,
  submitting = false,
  submitLabel = "Place Order",
  currency = "INR",
  showNotes = true,
  initialNotes = "",
}) {
  const [notes, setNotes] = useState(initialNotes);

  const normalizedItems = useMemo(
    () =>
      items.map((entry) => {
        const menuItem = entry.menuItem || entry.item || entry;

        return {
          id: getItemId(menuItem),
          name: menuItem.name || menuItem.title || "Menu Item",
          price: Number(
            entry.price ??
              entry.unitPrice ??
              menuItem.price ??
              0
          ),
          quantity: Math.max(1, Number(entry.quantity) || 1),
          isAvailable: menuItem.isAvailable !== false,
        };
      }),
    [items]
  );

  const subtotal = normalizedItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const totalQuantity = normalizedItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const handleSubmit = () => {
    if (!normalizedItems.length || submitting) return;

    onSubmit?.({
      items: normalizedItems.map((item) => ({
        menuItem: item.id,
        quantity: item.quantity,
      })),
      notes: notes.trim(),
      subtotal,
    });
  };

  if (normalizedItems.length === 0) {
    return (
      <section className="rounded border border-gray-200 bg-white p-6">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl" aria-hidden="true">
              🛒
            </span>
          </div>

          <h3 className="mt-4 font-semibold text-gray-900">
            Your Cart Is Empty
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Add items from the menu to get started.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Your Cart
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {totalQuantity}{" "}
            {totalQuantity === 1 ? "item" : "items"}
          </p>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {normalizedItems.length}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {normalizedItems.map((item) => (
          <div
            key={item.id}
            className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-medium text-gray-900">
                  {item.name}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {formatCurrency(item.price, currency)} each
                </p>

                {!item.isAvailable && (
                  <p className="mt-1 text-xs text-red-600">
                    Currently unavailable
                  </p>
                )}
              </div>

              <p className="shrink-0 text-sm font-semibold text-gray-900">
                {formatCurrency(
                  item.price * item.quantity,
                  currency
                )}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center rounded border border-gray-200">
                <button
                  type="button"
                  onClick={() =>
                    onQuantityChange?.(
                      item.id,
                      item.quantity - 1
                    )
                  }
                  disabled={submitting}
                  aria-label={`Decrease quantity of ${item.name}`}
                  className="rounded-l-xl px-3 py-2 text-gray-700 hover: disabled:opacity-50"
                >
                  −
                </button>

                <span
                  className="min-w-9 text-center text-sm font-medium text-gray-900"
                  aria-live="polite"
                >
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onQuantityChange?.(
                      item.id,
                      item.quantity + 1
                    )
                  }
                  disabled={submitting || !item.isAvailable}
                  aria-label={`Increase quantity of ${item.name}`}
                  className="rounded-r-xl px-3 py-2 text-gray-700 hover: disabled:opacity-50"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => onRemove?.(item.id)}
                disabled={submitting}
                className="rounded px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {showNotes && (
        <div className="px-4 pb-4">
          <label
            htmlFor="restaurant-cart-notes"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Order Notes
          </label>

          <textarea
            id="restaurant-cart-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Special instructions or preferences..."
            rows={3}
            maxLength={500}
            disabled={submitting}
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500 disabled:"
          />
        </div>
      )}

      <div className="border-t border-gray-200  p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-600">
            Subtotal
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(subtotal, currency)}
          </span>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Taxes and service charges may be calculated separately.
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            submitting ||
            normalizedItems.some((item) => !item.isAvailable)
          }
          className="mt-4 w-full rounded bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Processing..." : submitLabel}
        </button>
      </div>
    </section>
  );
}
