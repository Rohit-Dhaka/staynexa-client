
import { useCallback, useEffect, useMemo, useState } from "react";

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
    placed: "bg-black text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-black text-indigo-700",
    preparing: "bg-orange-50 text-orange-700",
    ready: "bg-emerald-50 text-emerald-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return styles[status] || "bg-gray-100 text-gray-700";
};

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
          "Unable to load restaurant orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
  const fetchOrders = async () => {
    await loadOrders();
  };

  fetchOrders();
}, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const status = String(order.status || "placed").toLowerCase();
      const type = String(order.orderType || "").toLowerCase();
      const number = String(getOrderNumber(order)).toLowerCase();

      const guestName = String(
        order.guest?.name ||
          order.guestDetails?.name ||
          order.customerName ||
          ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        number.includes(query) ||
        guestName.includes(query) ||
        String(getOrderId(order) || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      const matchesType =
        typeFilter === "all" || type === typeFilter;

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
            : item
        )
      );

      setSuccess(
        `Order #${getOrderNumber(order)} status updated successfully.`
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to update order status."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async (order) => {
    const id = getOrderId(order);

    if (!id) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel order #${getOrderNumber(order)}?`
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
            : item
        )
      );

      if (getOrderId(selectedOrder) === id) {
        setSelectedOrder(null);
      }

      setSuccess(
        `Order #${getOrderNumber(order)} cancelled successfully.`
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to cancel this order."
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
      String(order.status || "placed").toLowerCase()
    )
  ).length;

  const completedOrders = orders.filter(
    (order) =>
      String(order.status || "").toLowerCase() === "completed"
  ).length;

  const cancelledOrders = orders.filter(
    (order) =>
      String(order.status || "").toLowerCase() === "cancelled"
  ).length;

  const orderTypes = [
    ...new Set(
      orders
        .map((order) => String(order.orderType || "").toLowerCase())
        .filter(Boolean)
    ),
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Restaurant Orders
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review incoming orders, record payments, and manage order status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="rounded border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </header>

        
        {error && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <div className="flex items-start justify-between gap-3">
              <p>{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium hover:bg-red-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        
        {success && (
          <div
            role="status"
            className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <div className="flex items-center justify-between gap-3">
              <p>{success}</p>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium hover:bg-emerald-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Orders Loaded",
              value: orders.length,
              description: "Orders in the current list",
            },
            {
              label: "Active Orders",
              value: activeOrders,
              description: "Orders still in progress",
            },
            {
              label: "Completed Orders",
              value: completedOrders,
              description: "Successfully completed orders",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded border border-gray-200 bg-white p-5"
            >
              <p className="text-sm font-medium text-gray-500">
                {item.label}
              </p>

              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {item.value}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 rounded border border-gray-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label
              htmlFor="order-search"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Search Orders
            </label>

            <input
              id="order-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number or guest name..."
              className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="order-status-filter"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Order Status
            </label>

            <select
              id="order-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
            >
              <option value="all">All Statuses</option>

              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="order-type-filter"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Order Type
            </label>

            <select
              id="order-type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
            >
              <option value="all">All Types</option>

              {orderTypes.map((type) => (
                <option key={type} value={type}>
                  {formatStatus(type)}
                </option>
              ))}
            </select>
          </div>
        </section>

   
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "order" : "orders"} found
          </p>

          <p className="text-xs text-gray-500">
            {cancelledOrders} cancelled
          </p>
        </div>

        
        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-base font-semibold text-gray-900">
              No Orders Found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Try another search term or filter, or refresh the order list.
            </p>

            {(search || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="mt-4 rounded border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredOrders.map((order, index) => {
              const id = getOrderId(order) || index;
              const status = String(order.status || "placed").toLowerCase();
              const busy = actionLoading === getOrderId(order);
              const isFinalStatus = ["completed", "cancelled"].includes(status);
              const canCancel = ACTIVE_STATUSES.includes(status);

              const guestName =
                order.guest?.name ||
                order.guestDetails?.name ||
                order.customerName ||
                "Guest";

              const tableNumber =
                order.restaurantTable?.tableNumber ||
                order.restaurantTable?.name ||
                order.table?.tableNumber ||
                order.tableNumber ||
                "—";

              const roomNumber =
                order.room?.roomNumber || order.roomNumber || "—";

              const paidAmount = Number(order.paidAmount || 0);
              const balanceAmount = Math.max(
                0,
                Number(
                  order.balanceAmount ??
                    getOrderTotal(order) - paidAmount
                )
              );

              return (
                <article
                  key={id}
                  className="flex flex-col rounded border border-gray-200 bg-white p-4"
                >
             
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-sm font-semibold text-gray-900">
                        Order #{getOrderNumber(order)}
                      </h2>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}
                      >
                        {formatStatus(status)}
                      </span>
                    </div>

                    <p className="text-base font-semibold text-gray-900">
                      {formatCurrency(getOrderTotal(order))}
                    </p>
                  </div>

                
                  <div className="mt-4 space-y-2 text-xs text-gray-600">
                    <p className="break-words">
                      <span className="text-gray-400">Guest: </span>
                      <span className="font-medium text-gray-800">
                        {guestName}
                      </span>
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      <p>
                        <span className="text-gray-400">Table: </span>
                        {tableNumber}
                      </p>

                      <p>
                        <span className="text-gray-400">Room: </span>
                        {roomNumber}
                      </p>

                      <p>
                        <span className="text-gray-400">Type: </span>
                        {formatStatus(order.orderType || "Not specified")}
                      </p>
                    </div>
                  </div>

               
                  <div className="mt-4 rounded border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-gray-500">Paid</span>
                      <span className="font-medium text-emerald-700">
                        {formatCurrency(paidAmount)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-gray-500">Balance</span>
                      <span
                        className={`font-semibold ${
                          balanceAmount > 0
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(balanceAmount)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-gray-500">Payment Status</span>
                      <span className="font-medium capitalize text-gray-700">
                        {formatStatus(
                          order.paymentStatus ||
                            (paidAmount <= 0
                              ? "unpaid"
                              : balanceAmount > 0
                                ? "partial"
                                : "paid")
                        )}
                      </span>
                    </div>
                  </div>

                
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      Order Items
                    </p>

                    <div className="flex flex-wrap gap-x-3 gap-y-2">
                      {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((item, itemIndex) => (
                          <span
                            key={
                              item._id ||
                              item.menuItem?._id ||
                              item.menuItem ||
                              itemIndex
                            }
                            className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700"
                          >
                            {item.title ||
                              item.name ||
                              item.menuItem?.title ||
                              item.menuItem?.name ||
                              "Menu Item"}
                            <span className="ml-1 text-gray-400">
                              ×{item.quantity || 1}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">
                          No item details available.
                        </span>
                      )}
                    </div>
                  </div>

                  
                  <div className="mt-auto border-t border-gray-100 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {!isFinalStatus && (
                        <button
                          type="button"
                          disabled={busy || status === "cancelled"}
                          onClick={() => setSelectedOrder(order)}
                          className="rounded border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Record Payment
                        </button>
                      )}

                      {!isFinalStatus && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleStatusChange(order, "completed")}
                          className="rounded bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "Please Wait..." : "Done"}
                        </button>
                      )}

                      {canCancel && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleCancel(order)}
                          className="rounded border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {isFinalStatus && (
                      <p className="mt-2 text-xs text-gray-500">
                        {status === "completed"
                          ? "Order completed"
                          : "Order cancelled"}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
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
            className="my-auto w-full max-w-xl rounded bg-white"
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
