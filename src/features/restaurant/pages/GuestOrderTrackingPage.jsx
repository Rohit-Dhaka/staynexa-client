import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { trackOrderByQr } from "../services/restaurant.service";

const REFRESH_INTERVAL = 5000;

const STATUS_LABELS = {
  preparing: "Preparing",
  done: "Done",
  cancelled: "Cancelled",
};

const STATUS_STYLES = {
  preparing: "bg-amber-50 text-amber-700 ring-amber-200",
  done: "bg-green-50 text-green-700 ring-green-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};


const getDisplayStatus = (rawStatus) => {
  const status = String(rawStatus || "").toLowerCase();

  if (status === "completed") return "done";
  if (status === "cancelled") return "cancelled";

  return "preparing";
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function GuestOrderTrackingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchTracking = useCallback(
    async (initial = false) => {
      if (!token) {
        setError("The order tracking token is missing.");
        setLoading(false);
        return;
      }

      if (initial) setLoading(true);
      else setRefreshing(true);

      try {
        const response = await trackOrderByQr(token);

        setOrder(
          response?.tracking ||
            response?.order ||
            response?.data ||
            response,
        );
        setError("");
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Unable to load tracking details. The link may have expired.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchTracking(true);
  }, [fetchTracking]);

  const displayStatus = getDisplayStatus(order?.status);
  const isFinished = displayStatus !== "preparing";

  useEffect(() => {
    if (!order || !token || isFinished) return;

    const intervalId = window.setInterval(() => {
      fetchTracking(false);
    }, REFRESH_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [order, token, isFinished, fetchTracking]);

  if (loading) {
    return (
      <main className="px-3 py-6">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          Loading your order...
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="px-3 py-6">
        <div className="mx-auto max-w-md rounded border border-red-100 bg-white p-4 text-center">
          <h1 className="text-sm font-semibold text-slate-900">
            Order Tracking Unavailable
          </h1>
          <p role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
          <button
            type="button"
            onClick={() => fetchTracking(true)}
            className="mt-3 rounded bg-black px-4 py-2 text-xs font-semibold text-white "
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!order) return null;

  const isCancelled = displayStatus === "cancelled";
  const isDone = displayStatus === "done";
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <main className="px-3 py-4">
      <div className="mx-auto max-w-md space-y-2">
        {error && (
          <div
            role="alert"
            className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            {error}
          </div>
        )}

        <section className="rounded border border-slate-200 bg-white">
          
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Room Service Order
              </p>
              <h1 className="truncate text-base font-bold text-slate-900">
                {order.orderNumber || "Restaurant Order"}
              </h1>
              <p className="text-[11px] text-slate-500">
                {formatDate(order.createdAt)}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_STYLES[displayStatus]}`}
            >
              {STATUS_LABELS[displayStatus]}
            </span>
          </div>

          
          <div className="border-b border-slate-100 px-3 py-2.5">
            {isCancelled ? (
              <p className="text-xs text-red-700">
                This order has been cancelled.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                    isDone ? "bg-emerald-600" : "bg-amber-500"
                  }`}
                >
                  {isDone ? "✓" : "1"}
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  Preparing
                </span>

                <span
                  className={`h-0.5 flex-1 ${
                    isDone ? "bg-emerald-600" : "bg-slate-200"
                  }`}
                />

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                    isDone
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 text-slate-400"
                  }`}
                >
                  {isDone ? "✓" : "2"}
                </span>
                <span
                  className={`text-xs ${
                    isDone ? "font-semibold text-slate-800" : "text-slate-400"
                  }`}
                >
                  Done
                </span>
              </div>
            )}
          </div>

          
          <div className="border-b border-slate-100 px-3 py-2.5">
            {items.length === 0 ? (
              <p className="text-xs text-slate-500">
                No item details are available.
              </p>
            ) : (
              <ul className="space-y-1">
                {items.map((item, index) => (
                  <li
                    key={item._id || `${item.title || item.name}-${index}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 truncate text-slate-800">
                      {item.title || item.name || "Menu Item"}{" "}
                      <span className="text-slate-500">
                        × {item.quantity || 1}
                      </span>
                    </span>

                    {item.lineTotal != null && (
                      <span className="shrink-0 font-medium text-slate-800">
                        {formatCurrency(item.lineTotal)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          
          <div className="space-y-0.5 bg-slate-50/70 px-3 py-2.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Charge</span>
              <span>{formatCurrency(order.serviceCharge)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2">
            <p className="text-[11px] text-slate-400">
              {isFinished
                ? "Updates stopped."
                : "Auto-refreshes every 5s."}{" "}
              Updated {formatDate(order.updatedAt)}
            </p>

            <button
              type="button"
              onClick={() => fetchTracking(false)}
              disabled={refreshing}
              className="shrink-0 rounded bg-black px-3 py-1.5 text-xs font-semibold text-white  disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}