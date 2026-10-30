import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Salad,
  Utensils,
  Users,
} from "lucide-react";
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
  Number(order?.totalAmount ?? order?.grandTotal ?? order?.total ?? 0);

const normalizeStatus = (status) =>
  String(status || "placed").toLowerCase().replaceAll("_", " ");

const formatLabel = (value = "") =>
  String(value).replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

function SummaryCard({ title, value, description, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <article className="min-w-0 rounded border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
            {description}
          </p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${tones[tone] || tones.slate}`} aria-hidden="true">
          <Icon size={18} />
        </span>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const styles = {
    placed: "bg-blue-50 text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-indigo-50 text-indigo-700",
    preparing: "bg-amber-50 text-amber-700",
    ready: "bg-emerald-50 text-emerald-700",
    served: "bg-green-50 text-green-700",
    completed: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-50 text-red-700",
    rejected: "bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${styles[normalized] || "bg-slate-100 text-slate-700"}`}>
      {formatLabel(normalized)}
    </span>
  );
}

function getOrderNumber(order, index) {
  const value = order?.orderNumber || order?._id || order?.id || index + 1;
  return order?.orderNumber ? String(value) : String(value).slice(-8).toUpperCase();
}

function getOrderDate(order) {
  if (!order?.createdAt) return "";
  const date = new Date(order.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function OverviewRow({ label, value, emphasize = false }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0 text-xs leading-5 text-slate-600">{label}</span>
      <span className={`max-w-[58%] break-words text-right text-xs ${emphasize ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
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

    if (ordersResult.status === "fulfilled") setOrders(getList(ordersResult.value));
    else failures.push("orders");

    if (menuResult.status === "fulfilled") setMenuItems(getList(menuResult.value));
    else failures.push("menu items");

    if (tablesResult.status === "fulfilled") setTables(getList(tablesResult.value));
    else failures.push("tables");

    setFailedSections(failures);
    if (failures.length === results.length) {
      setError("Unable to load dashboard data. Please try again.");
    } else if (failures.length > 0) {
      setError(`Unable to load ${failures.join(", ")}. Other dashboard data is available.`);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const activeOrderStatuses = ["placed", "pending", "confirmed", "preparing", "ready"];
  const pendingOrders = useMemo(
    () => orders.filter((order) => activeOrderStatuses.includes(normalizeStatus(order?.status))),
    [orders],
  );
  const availableItems = useMemo(() => menuItems.filter((item) => item?.isAvailable === true), [menuItems]);
  const availableTables = useMemo(
    () => tables.filter((table) => table?.isActive !== false && String(table?.status || "available").toLowerCase() === "available"),
    [tables],
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => normalizeStatus(order?.status) === "completed"),
    [orders],
  );
  const completedRevenue = useMemo(
    () => completedOrders.reduce((total, order) => total + getOrderTotal(order), 0),
    [completedOrders],
  );
  const unavailableItems = Math.max(0, menuItems.length - availableItems.length);
  const unavailableTables = Math.max(0, tables.length - availableTables.length);
  const allSectionsFailed = failedSections.length === 3;

  return (
    <main className="min-w-0 w-full space-y-4 sm:space-y-5">
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl lg:text-2xl">
            Restaurant Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
            Monitor orders, menu availability, and tables.
          </p>
          {lastUpdated && !loading && (
            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
              Last updated: {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-sm"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && !loading && (
        allSectionsFailed ? (
          <ErrorState message={error} onRetry={loadDashboard} />
        ) : (
          <div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 sm:text-sm">
            {error}
          </div>
        )
      )}

      {loading ? (
        <div className="rounded border border-slate-200 bg-white p-4 sm:p-6">
          <LoadingState message="Loading restaurant dashboard..." />
        </div>
      ) : allSectionsFailed ? null : (
        <>
          <section aria-label="Restaurant metrics" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Orders Loaded" value={orders.length} description="Latest orders returned by the API" icon={ClipboardList} tone="blue" />
            <SummaryCard title="Active Orders" value={pendingOrders.length} description="Loaded orders needing attention" icon={Activity} tone="amber" />
            <SummaryCard title="Available Menu Items" value={availableItems.length} description={`Out of ${menuItems.length} loaded items`} icon={Salad} tone="green" />
            <SummaryCard title="Available Tables" value={availableTables.length} description={`Out of ${tables.length} loaded tables`} icon={Users} tone="slate" />
          </section>

          <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-3">
            <section className="min-w-0 overflow-hidden rounded border border-slate-200 bg-white xl:col-span-2">
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Recent Orders</h2>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-xs">Latest orders returned by the server.</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                  {orders.length} loaded
                </span>
              </div>

              {failedSections.includes("orders") ? (
                <div className="p-3 sm:p-4"><ErrorState message="Orders could not be loaded." onRetry={loadDashboard} /></div>
              ) : orders.length === 0 ? (
                <EmptyState title="No Orders Found" description="New restaurant orders will appear here." className="m-3 border-0 sm:m-4" />
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map((order, index) => {
                    const date = getOrderDate(order);
                    return (
                      <article key={order._id || order.id || index} className="flex min-w-0 flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">Order #{getOrderNumber(order, index)}</p>
                          <p className="mt-1 break-words text-[11px] leading-4 text-slate-500 sm:text-xs">
                            {formatLabel(order.orderType || "Order")}{date ? ` · ${date}` : ""}
                          </p>
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                          <span className="text-xs font-semibold text-slate-900 sm:text-sm">{formatCurrency(getOrderTotal(order))}</span>
                          <StatusBadge status={order.status} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="min-w-0 rounded border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700" aria-hidden="true"><Utensils size={16} /></span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Restaurant Overview</h2>
                    <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Summary of loaded records.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3 sm:p-4">
                <OverviewRow label="Completed orders" value={completedOrders.length} emphasize />
                <OverviewRow label="Completed order value" value={formatCurrency(completedRevenue)} emphasize />
                <OverviewRow label="Unavailable menu items" value={unavailableItems} />
                <OverviewRow label="Unavailable tables" value={unavailableTables} />
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <p className="text-[10px] leading-4 text-slate-600 sm:text-xs">
                      Order totals reflect only the orders loaded by this request. Use a dedicated summary API for complete historical revenue and order counts.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
