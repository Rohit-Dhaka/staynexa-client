import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  ClipboardList,
  CheckCircle2,
  Clock3,
  XCircle,
  X,
  CreditCard,
  Check,
  Ban,
  Utensils,
  BedDouble,
  Table2,
  IndianRupee,
  AlertCircle,
} from "lucide-react";

import {
  getOrders,
  updateOrderStatus,
  cancelOrder,
} from "../services/restaurant.service";

import RecordRestaurantPayment from "../components/RecordRestaurantPayment";

const getList = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.orders)) return result.orders;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.orders)) return result.data.orders;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.data)) return result.data;

  return [];
};

const ORDER_STATUSES = [
  "placed",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

const ACTIVE_STATUSES = [
  "placed",
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

const FINAL_STATUSES = ["completed", "cancelled"];

const formatStatus = (status = "") =>
  String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getOrderId = (order) => order?._id || order?.id;

const getOrderNumber = (order) =>
  order?.orderNumber || String(getOrderId(order) || "").slice(-8);

const getOrderTotal = (order) =>
  Number(order?.totalAmount ?? order?.total ?? order?.grandTotal ?? 0);

const getStatusClasses = (status) => {
  const styles = {
    placed: "bg-blue-50 text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-indigo-50 text-indigo-700",
    preparing: "bg-orange-50 text-orange-700",
    ready: "bg-emerald-50 text-emerald-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return styles[status] || "bg-gray-100 text-gray-700";
};

const getPaymentStatus = (order, paidAmount, balanceAmount) =>
  order.paymentStatus ||
  (paidAmount <= 0
    ? "unpaid"
    : balanceAmount > 0
      ? "partial"
      : "paid");

const getGuestName = (order) =>
  order?.guest?.name ||
  order?.guestDetails?.name ||
  order?.customerName ||
  "Guest";

const getTableNumber = (order) =>
  order?.restaurantTable?.tableNumber ||
  order?.restaurantTable?.name ||
  order?.table?.tableNumber ||
  order?.tableNumber ||
  "—";

const getRoomNumber = (order) =>
  order?.room?.roomNumber || order?.roomNumber || "—";

function SummaryCard({ label, value, description, icon: Icon, iconClass }) {
  return (
    <article className="min-w-0 rounded border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 sm:text-sm">
            {label}
          </p>

          <p className="mt-2 text-xl font-semibold text-gray-900 sm:text-2xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded sm:h-10 sm:w-10 ${iconClass}`}
        >
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </article>
  );
}

function FilterField({ label, htmlFor, children }) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-gray-700 sm:text-sm"
      >
        {label}
      </label>

      {children}
    </div>
  );
}

const inputClasses =
  "w-full min-w-0 rounded border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-400";

function OrderCard({
  order,
  busy,
  onRecordPayment,
  onComplete,
  onCancel,
}) {
  const status = String(order.status || "placed").toLowerCase();
  const isFinalStatus = FINAL_STATUSES.includes(status);
  const canCancel = ACTIVE_STATUSES.includes(status);

  const total = getOrderTotal(order);
  const paidAmount = Number(order.paidAmount || 0);

  const balanceAmount = Math.max(
    0,
    Number(order.balanceAmount ?? total - paidAmount),
  );

  const paymentStatus = getPaymentStatus(
    order,
    paidAmount,
    balanceAmount,
  );

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <article className="flex min-w-0 flex-col rounded border border-gray-200 bg-white p-3 sm:p-4">
      
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardList size={16} className="shrink-0 text-gray-500" />

            <h2 className="break-all text-sm font-semibold text-gray-900">
              Order #{getOrderNumber(order)}
            </h2>
          </div>

          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}
          >
            {formatStatus(status)}
          </span>
        </div>

        <p className="shrink-0 text-sm font-semibold text-gray-900 sm:text-base">
          {formatCurrency(total)}
        </p>
      </div>

      
      <div className="mt-4 space-y-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Guest</p>

          <p className="mt-1 break-words text-sm font-medium text-gray-800">
            {getGuestName(order)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Table2 size={15} className="mt-0.5 shrink-0 text-gray-400" />

            <div className="min-w-0">
              <p className="text-xs text-gray-500">Table</p>
              <p className="mt-1 break-words text-xs font-medium text-gray-800 sm:text-sm">
                {getTableNumber(order)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-2">
            <BedDouble size={15} className="mt-0.5 shrink-0 text-gray-400" />

            <div className="min-w-0">
              <p className="text-xs text-gray-500">Room</p>
              <p className="mt-1 break-words text-xs font-medium text-gray-800 sm:text-sm">
                {getRoomNumber(order)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500">Order Type</p>

          <p className="mt-1 text-sm font-medium text-gray-800">
            {formatStatus(order.orderType || "Not specified")}
          </p>
        </div>
      </div>

      
      <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">Total Amount</span>
          <span className="text-xs font-semibold text-gray-900">
            {formatCurrency(total)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">Paid Amount</span>
          <span className="text-xs font-medium text-emerald-700">
            {formatCurrency(paidAmount)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">Balance</span>
          <span
            className={`text-xs font-semibold ${
              balanceAmount > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {formatCurrency(balanceAmount)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-200 pt-3">
          <span className="text-xs text-gray-500">Payment Status</span>

          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-700"
                : paymentStatus === "partial"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {formatStatus(paymentStatus)}
          </span>
        </div>
      </div>

    
      <div className="mt-4 min-w-0 border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-medium text-gray-500">
          Order Items ({items.length})
        </p>

        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((item, itemIndex) => {
              const itemName =
                item.title ||
                item.name ||
                item.menuItem?.title ||
                item.menuItem?.name ||
                "Menu Item";

              return (
                <span
                  key={
                    item._id ||
                    item.menuItem?._id ||
                    item.menuItem ||
                    itemIndex
                  }
                  className="inline-flex max-w-full items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                >
                  <span className="break-words">{itemName}</span>

                  <span className="shrink-0 font-medium text-gray-500">
                    ×{item.quantity || 1}
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            No item details available.
          </p>
        )}
      </div>

      
      <div className="mt-auto border-t border-gray-100 pt-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {!isFinalStatus && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRecordPayment(order)}
              className="inline-flex min-w-0 items-center justify-center gap-2 rounded border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <CreditCard size={15} />
              Record Payment
            </button>
          )}

          {!isFinalStatus && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onComplete(order)}
              className="inline-flex min-w-0 items-center justify-center gap-2 rounded bg-gray-900 px-3 py-2.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <Check size={15} />

              {busy ? "Please Wait..." : "Complete Order"}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(order)}
              className="inline-flex min-w-0 items-center justify-center gap-2 rounded border border-red-200 px-3 py-2.5 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 sm:text-sm"
            >
              <Ban size={15} />
              Cancel Order
            </button>
          )}
        </div>

        {isFinalStatus && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            {status === "completed" ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <XCircle size={14} className="text-red-500" />
            )}

            {status === "completed" ? "Order completed" : "Order cancelled"}
          </div>
        )}
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getOrders({ page: 1, limit: 100 });
      setOrders(getList(result));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load restaurant orders.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const status = String(order.status || "placed").toLowerCase();
      const type = String(order.orderType || "").toLowerCase();
      const number = String(getOrderNumber(order)).toLowerCase();
      const guestName = getGuestName(order).toLowerCase();

      const matchesSearch =
        !query ||
        number.includes(query) ||
        guestName.includes(query) ||
        String(getOrderId(order) || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      const matchesType = typeFilter === "all" || type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, search, statusFilter, typeFilter]);

  const handleStatusChange = async (order, nextStatus) => {
    const id = getOrderId(order);

    if (!id || !nextStatus || nextStatus === order.status) return;

    setActionLoading(id);
    setError("");
    setSuccess("");

    try {
      const result = await updateOrderStatus(id, nextStatus);

      const updatedOrder =
        result?.order || result?.data?.order || result?.data || result;

      setOrders((current) =>
        current.map((item) =>
          getOrderId(item) === id
            ? {
                ...item,
                ...(updatedOrder && typeof updatedOrder === "object"
                  ? updatedOrder
                  : {}),
                status: nextStatus,
              }
            : item,
        ),
      );

      setSuccess(
        `Order #${getOrderNumber(order)} status updated successfully.`,
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to update order status.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async (order) => {
    const id = getOrderId(order);

    if (!id) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel order #${getOrderNumber(order)}?`,
    );

    if (!confirmed) return;

    setActionLoading(id);
    setError("");
    setSuccess("");

    try {
      await cancelOrder(id, "Cancelled by restaurant staff");

      setOrders((current) =>
        current.map((item) =>
          getOrderId(item) === id
            ? { ...item, status: "cancelled" }
            : item,
        ),
      );

      if (getOrderId(selectedOrder) === id) {
        setSelectedOrder(null);
      }

      setSuccess(
        `Order #${getOrderNumber(order)} cancelled successfully.`,
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to cancel this order.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handlePaymentRecorded = async () => {
    setSelectedOrder(null);
    setSuccess("Payment recorded successfully.");
    setError("");

    await loadOrders();
  };

  const activeOrders = orders.filter((order) =>
    ACTIVE_STATUSES.includes(
      String(order.status || "placed").toLowerCase(),
    ),
  ).length;

  const completedOrders = orders.filter(
    (order) =>
      String(order.status || "").toLowerCase() === "completed",
  ).length;

  const cancelledOrders = orders.filter(
    (order) =>
      String(order.status || "").toLowerCase() === "cancelled",
  ).length;

  const orderTypes = [
    ...new Set(
      orders
        .map((order) => String(order.orderType || "").toLowerCase())
        .filter(Boolean),
    ),
  ];

  const hasActiveFilters =
    Boolean(search) || statusFilter !== "all" || typeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="min-h-screen min-w-0">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
        
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              Restaurant Orders
            </h1>

            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
              Review orders, record payments, and manage order status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </header>

        
        {error && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-3 sm:p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-red-700">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="shrink-0 rounded p-1 text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        
        {success && (
          <div
            role="status"
            className="rounded border border-emerald-200 bg-emerald-50 p-3 sm:p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600"
              />

              <p className="min-w-0 flex-1 break-words text-sm text-emerald-700">
                {success}
              </p>

              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Dismiss success message"
                className="shrink-0 rounded p-1 text-emerald-700"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Orders Loaded"
            value={orders.length}
            description="Orders in the current list"
            icon={ClipboardList}
            iconClass="bg-blue-50 text-blue-700"
          />

          <SummaryCard
            label="Active Orders"
            value={activeOrders}
            description="Orders still in progress"
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            label="Completed Orders"
            value={completedOrders}
            description="Successfully completed orders"
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-700"
          />
        </section>

        
        <section className="rounded border border-gray-200 bg-white p-3 sm:p-4">
          <div className="mb-4 flex items-center gap-2">
            <Search size={17} className="text-gray-500" />

            <h2 className="text-sm font-semibold text-gray-900">
              Search and Filter
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <FilterField label="Search Orders" htmlFor="order-search">
              <input
                id="order-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order number or guest name..."
                className={inputClasses}
              />
            </FilterField>

            <FilterField
              label="Order Status"
              htmlFor="order-status-filter"
            >
              <select
                id="order-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClasses}
              >
                <option value="all">All Statuses</option>

                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Order Type" htmlFor="order-type-filter">
              <select
                id="order-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className={inputClasses}
              >
                <option value="all">All Types</option>

                {orderTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatStatus(type)}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 sm:text-sm"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

        
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-600 sm:text-sm">
            <span className="font-semibold text-gray-900">
              {filteredOrders.length}
            </span>{" "}
            {filteredOrders.length === 1 ? "order" : "orders"} found
          </p>

          <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            <XCircle size={14} />
            {cancelledOrders} cancelled
          </div>
        </div>

        
        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center">
            <RefreshCw
              size={22}
              className="mx-auto animate-spin text-gray-400"
            />

            <p className="mt-3 text-sm text-gray-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white px-4 py-10 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-gray-500">
              <Utensils size={22} />
            </div>

            <h2 className="mt-4 text-base font-semibold text-gray-900">
              No Orders Found
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
              {hasActiveFilters
                ? "No orders match your current search and filters."
                : "There are no restaurant orders available right now."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Clear Filters
              </button>
            )}

            {!hasActiveFilters && (
              <button
                type="button"
                onClick={loadOrders}
                className="mt-4 rounded border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Refresh Orders
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredOrders.map((order, index) => {
              const id = getOrderId(order) || index;

              return (
                <OrderCard
                  key={id}
                  order={order}
                  busy={actionLoading === getOrderId(order)}
                  onRecordPayment={setSelectedOrder}
                  onComplete={(item) =>
                    handleStatusChange(item, "completed")
                  }
                  onCancel={handleCancel}
                />
              );
            })}
          </div>
        )}
      </div>

      
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Record payment for order ${getOrderNumber(selectedOrder)}`}
            className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <RecordRestaurantPayment
              order={selectedOrder}
              onPaymentRecorded={handlePaymentRecorded}
              onCancel={() => setSelectedOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}