
import { useCallback, useEffect, useState } from "react";
import {
  getOrders,
  getMenuItems,
  getTables,
} from "../services/restaurant.service";

import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../components/RestaurantCommon";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getList = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.results)) return result.results;
  if (Array.isArray(result?.docs)) return result.docs;
  return [];
};

const getOrderTotal = (order) =>
  Number(
    order?.totalAmount ??
      order?.grandTotal ??
      order?.total ??
      0
  );

const normalizeStatus = (status) =>
  String(status || "placed")
    .toLowerCase()
    .replaceAll("_", " ");

const formatLabel = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

function SummaryCard({ title, value, description, icon }) {
  return (
    <article className="min-w-0 rounded border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">
            {title}
          </p>
          <p className="mt-1.5 break-words text-xl font-semibold text-gray-900">
            {value}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">
            {description}
          </p>
        </div>

        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-base"
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const styles = {
    placed: "bg-black text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-black text-indigo-700",
    preparing: "bg-amber-50 text-amber-700",
    ready: "bg-emerald-50 text-emerald-700",
    served: "bg-green-50 text-green-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-50 text-red-700",
    rejected: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
        styles[normalized] || "bg-gray-100 text-gray-700"
      }`}
    >
      {formatLabel(normalized)}
    </span>
  );
}

function getOrderNumber(order, index) {
  const value =
    order?.orderNumber ||
    order?._id ||
    order?.id ||
    index + 1;

  return order?.orderNumber
    ? String(value)
    : String(value).slice(-8).toUpperCase();
}

function getOrderDate(order) {
  if (!order?.createdAt) return "";

  const date = new Date(order.createdAt);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [failedSections, setFailedSections] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setFailedSections([]);

    const results = await Promise.allSettled([
      getOrders({ limit: 5, page: 1 }),
      getMenuItems({ limit: 100, page: 1 }),
      getTables({ limit: 100, page: 1 }),
    ]);

    const [ordersResult, menuResult, tablesResult] = results;
    const failures = [];

    if (ordersResult.status === "fulfilled") {
      setOrders(getList(ordersResult.value));
    } else {
      failures.push("orders");
    }

    if (menuResult.status === "fulfilled") {
      setMenuItems(getList(menuResult.value));
    } else {
      failures.push("menu items");
    }

    if (tablesResult.status === "fulfilled") {
      setTables(getList(tablesResult.value));
    } else {
      failures.push("tables");
    }

    setFailedSections(failures);

    if (failures.length === results.length) {
      setError("Unable to load dashboard data. Please try again.");
    } else if (failures.length > 0) {
      setError(
        `Unable to load ${failures.join(", ")}. Other dashboard data is available.`
      );
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const activeOrderStatuses = [
    "placed",
    "pending",
    "confirmed",
    "preparing",
    "ready",
  ];

  const pendingOrders = orders.filter((order) =>
    activeOrderStatuses.includes(
      String(order?.status || "")
        .toLowerCase()
        .replaceAll("_", " ")
    )
  );

  const availableItems = menuItems.filter(
    (item) => item?.isAvailable === true
  );

  const availableTables = tables.filter(
    (table) =>
      table?.isActive !== false &&
      String(table?.status || "available").toLowerCase() ===
        "available"
  );

  const completedOrders = orders.filter(
    (order) =>
      String(order?.status || "").toLowerCase() === "completed"
  );

  const completedRevenue = completedOrders.reduce(
    (total, order) => total + getOrderTotal(order),
    0
  );

  const unavailableItems = Math.max(
    0,
    menuItems.length - availableItems.length
  );

  const unavailableTables = Math.max(
    0,
    tables.length - availableTables.length
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              Restaurant Dashboard
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Monitor orders, menu availability, and tables.
            </p>

            {lastUpdated && !loading && (
              <p className="mt-1 text-[10px] text-gray-400">
                Last updated:{" "}
                {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover: disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            >
              <path
                d="M20 7v5h-5M4 17v-5h5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && !loading && (
          failedSections.length === 3 ? (
            <ErrorState message={error} onRetry={loadDashboard} />
          ) : (
            <div
              role="alert"
              className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
            >
              {error}
            </div>
          )
        )}

        {loading ? (
          <LoadingState message="Loading restaurant dashboard..." />
        ) : failedSections.length === 3 ? null : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Orders Loaded"
                value={orders.length}
                description="Latest orders returned by the API"
                icon="🧾"
              />

              <SummaryCard
                title="Active Orders"
                value={pendingOrders.length}
                description="Loaded orders needing attention"
                icon="🍽️"
              />

              <SummaryCard
                title="Available Menu Items"
                value={availableItems.length}
                description={`Out of ${menuItems.length} loaded items`}
                icon="🥗"
              />

              <SummaryCard
                title="Available Tables"
                value={availableTables.length}
                description={`Out of ${tables.length} loaded tables`}
                icon="🪑"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
              <section className="min-w-0 rounded border border-gray-200 bg-white xl:col-span-2">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Recent Orders
                    </h2>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Latest orders returned by the server.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                    {orders.length} loaded
                  </span>
                </div>

                {failedSections.includes("orders") ? (
                  <div className="p-3">
                    <ErrorState
                      message="Orders could not be loaded."
                      onRetry={loadDashboard}
                    />
                  </div>
                ) : orders.length === 0 ? (
                  <EmptyState
                    title="No Orders Found"
                    description="New restaurant orders will appear here."
                    className="m-3 border-0"
                  />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {orders.slice(0, 5).map((order, index) => {
                      const date = getOrderDate(order);

                      return (
                        <article
                          key={order._id || order.id || index}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-gray-900">
                              Order #{getOrderNumber(order, index)}
                            </p>

                            <p className="mt-0.5 text-[11px] text-gray-500">
                              {formatLabel(order.orderType || "Order")}
                              {date ? ` · ${date}` : ""}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900">
                              {formatCurrency(getOrderTotal(order))}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="min-w-0 rounded border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-3 py-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Restaurant Overview
                  </h2>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Summary of loaded records.
                  </p>
                </div>

                <div className="space-y-3 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-600">
                      Completed orders
                    </span>
                    <span className="text-xs font-semibold text-gray-900">
                      {completedOrders.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-600">
                      Completed order value
                    </span>
                    <span className="text-right text-xs font-semibold text-gray-900">
                      {formatCurrency(completedRevenue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-600">
                      Unavailable menu items
                    </span>
                    <span className="text-xs font-semibold text-gray-900">
                      {unavailableItems}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-600">
                      Unavailable tables
                    </span>
                    <span className="text-xs font-semibold text-gray-900">
                      {unavailableTables}
                    </span>
                  </div>

                  <p className="rounded  p-2.5 text-[10px] leading-4 text-gray-500">
                    Order totals reflect only the orders loaded by this
                    request. Use a dedicated summary API for complete
                    historical revenue and order counts.
                  </p>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
