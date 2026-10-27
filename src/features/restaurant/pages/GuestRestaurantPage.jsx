import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMenuItems,
  getCategories,
  createOrder,
  getOrders,
} from "../services/restaurant.service";

import OrderQRCode from "../components/OrderQRCode";
import { listBookings } from "../../bookings/services/bookings.service";

const getList = (result, keys = []) => {
  if (Array.isArray(result)) return result;

  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key];
    if (Array.isArray(result?.data?.[key])) return result.data[key];
  }

  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;

  return [];
};

const getId = (value) =>
  typeof value === "object" ? value?._id || value?.id || "" : value || "";

const getItemName = (item) => item?.title || item?.name || "Menu item";

const getItemImage = (item) => {
  const candidate =
    item?.image || item?.imageUrl || item?.photo || item?.images?.[0] || "";

  if (!candidate) return "";
  if (typeof candidate === "string") return candidate;

  return candidate.secure_url || candidate.url || candidate.path || "";
};

const getRoomNumber = (booking) => {
  const room = booking?.room;
  return room?.roomNumber || room?.number || room?.name || "Assigned room";
};

const getGuestName = (booking) => {
  const guest = booking?.guest;

  const fromGuest =
    guest && typeof guest === "object"
      ? guest.name ||
        guest.fullName ||
        [guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
        guest.user?.name ||
        ""
      : "";

  return String(
    fromGuest ||
      booking?.guestName ||
      booking?.customerName ||
      booking?.guestDetails?.name ||
      "",
  ).trim();
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatStatus = (status = "") => String(status).replaceAll("_", " ");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN");
};

export default function GuestRestaurantPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [notes, setNotes] = useState("");
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [activeTab, setActiveTab] = useState("menu");

  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openQrOrderId, setOpenQrOrderId] = useState("");

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [menuResult, categoryResult] = await Promise.all([
        getMenuItems({ page: 1, limit: 100 }),
        getCategories({ page: 1, limit: 100 }),
      ]);

      setMenuItems(getList(menuResult, ["items"]));
      setCategories(getList(categoryResult, ["categories"]));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load the restaurant menu. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);

    try {
      const result = await listBookings({
        view: "in_house",
        page: 1,
        limit: 100,
      });

      const allBookings = getList(result, ["bookings", "items"]);

      const activeBookings = allBookings.filter(
        (booking) =>
          String(booking.status || "").toLowerCase() === "checked_in" &&
          getId(booking.room) &&
          getId(booking.guest),
      );

      setBookings(activeBookings);

      setSelectedBookingId((current) => {
        if (current && activeBookings.some((b) => getId(b) === current)) {
          return current;
        }

        return activeBookings.length ? getId(activeBookings[0]) : "";
      });
    } catch (err) {
      setBookings([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load your active room booking.",
      );
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const loadOrders = useCallback(async (options) => {
    
    const silent = options?.silent === true;

    if (!silent) setLoadingOrders(true);

    try {
      const result = await getOrders({ page: 1, limit: 100 });
      setOrders(getList(result, ["orders", "items"]));
    } catch (err) {
      if (!silent) {
        setError(
          err?.response?.data?.message ||
            "Unable to load your restaurant orders.",
        );
      }
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, []);

useEffect(() => {
  const initialize = async () => {
    await Promise.all([
      loadMenu(),
      loadBookings(),
      loadOrders(),
    ]);
  };

  initialize();
}, [loadMenu, loadBookings, loadOrders]);


    
  const hasPendingPayment = useMemo(
    () =>
      orders.some((order) => {
        const status = String(order.status || "").toLowerCase();
        const payment = String(order.paymentStatus || "unpaid").toLowerCase();

        return (
          status !== "cancelled" &&
          ["unpaid", "pending", "partial"].includes(payment)
        );
      }),
    [orders],
  );

  useEffect(() => {
    if (activeTab !== "orders" || !hasPendingPayment) return undefined;

    const intervalId = window.setInterval(() => {
      if (!document.hidden) loadOrders({ silent: true });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, hasPendingPayment, loadOrders]);

  const handlePaid = async () => {
    await loadOrders({ silent: true });
  };

  const selectedBooking = useMemo(
    () => bookings.find((booking) => getId(booking) === selectedBookingId),
    [bookings, selectedBookingId],
  );

  const autoGuestName = useMemo(
    () => getGuestName(selectedBooking),
    [selectedBooking],
  );

  const customerName = autoGuestName || customerNameInput.trim();

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menuItems.filter((item) => {
      if (item.isActive === false || item.isAvailable === false) {
        return false;
      }

      const categoryId = getId(item.category);
      const matchesCategory =
        selectedCategory === "all" ||
        String(categoryId) === String(selectedCategory);

      const name = getItemName(item).toLowerCase();
      const description = String(item.description || "").toLowerCase();

      return (
        matchesCategory &&
        (!query || name.includes(query) || description.includes(query))
      );
    });
  }, [menuItems, search, selectedCategory]);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const addToCart = (item) => {
    const id = getId(item);
    if (!id) return;

    setCart((current) => {
      const existing = current.find((entry) => entry.menuItem === id);

      if (existing) {
        return current.map((entry) =>
          entry.menuItem === id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }

      return [
        ...current,
        {
          menuItem: id,
          name: getItemName(item),
          price: Number(item.discountPrice ?? item.price) || 0,
          quantity: 1,
        },
      ];
    });

    setError("");
    setSuccess("");
  };

  const changeQuantity = (id, amount) => {
    setCart((current) =>
      current
        .map((item) =>
          item.menuItem === id
            ? { ...item, quantity: item.quantity + amount }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedBooking) {
      setError(
        "An active checked-in room booking is required to place an order.",
      );
      return;
    }

    if (!cart.length) {
      setError("Please add at least one item to your cart.");
      return;
    }

    if (!customerName) {
      setError("Please enter your name to place the order.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        orderType: "room_service",
        booking: getId(selectedBooking),
        room: getId(selectedBooking.room),
        customerName,
        items: cart.map((item) => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
        })),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      const result = await createOrder(payload);

      const order = result?.order || result?.data?.order || result;
      const orderId = getId(order);
      const orderNumber = order?.orderNumber || orderId;

      setSuccess(
        orderNumber
          ? `Order ${orderNumber} placed successfully.`
          : "Your order has been placed successfully.",
      );

      setCart([]);
      setNotes("");

      if (orderId) setOpenQrOrderId(orderId);

      await loadOrders();
      setActiveTab("orders");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToCart = () => {
    document
      .getElementById("guest-cart")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const categoryButtonClass = (selected) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
      selected
        ? "border-gray-900 bg-gray-900 text-white"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
    }`;

  const tabClass = (tab) =>
    `rounded px-3 py-1.5 text-xs font-semibold transition ${
      activeTab === tab
        ? "bg-gray-900 text-white"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="min-h-screen pb-16 text-gray-900 lg:pb-0">
      
      <header className="rounded border border-gray-200 bg-white px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
              StayNexa Restaurant
            </p>
            <h1 className="text-base font-semibold leading-tight">
              Food and Drinks
            </h1>
          </div>

          
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-xs">
            {loadingBookings ? (
              <span className="text-gray-500">Loading room...</span>
            ) : bookings.length === 0 ? (
              <>
                <span className="rounded border border-gray-200 px-2 py-1 text-gray-600">
                  No active checked-in booking
                </span>
                <button
                  type="button"
                  onClick={loadBookings}
                  className="rounded border border-gray-200 px-2 py-1 font-medium hover:bg-gray-100"
                >
                  Refresh
                </button>
              </>
            ) : (
              <>
                {bookings.length > 1 ? (
                  <select
                    aria-label="Active booking"
                    value={selectedBookingId}
                    onChange={(event) =>
                      setSelectedBookingId(event.target.value)
                    }
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                  >
                    {bookings.map((booking) => (
                      <option key={getId(booking)} value={getId(booking)}>
                        Room {getRoomNumber(booking)} ·{" "}
                        {booking.bookingNumber ||
                          String(getId(booking)).slice(-6)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded bg-gray-900 px-2 py-1 font-medium text-white">
                    Room {getRoomNumber(selectedBooking || bookings[0])}
                  </span>
                )}

                {autoGuestName && (
                  <span className="rounded border border-gray-200 px-2 py-1 text-gray-700">
                    {autoGuestName}
                  </span>
                )}

                {selectedBooking && (
                  <span className="hidden rounded border border-gray-200 px-2 py-1 text-gray-500 sm:inline">
                    {formatDate(selectedBooking.checkIn)} –{" "}
                    {formatDate(selectedBooking.checkOut)}
                  </span>
                )}

                <span className="rounded border border-gray-900 px-2 py-1 font-medium">
                  Checked in
                </span>
              </>
            )}
          </div>

          
          <div className="flex items-center gap-1 rounded border border-gray-200 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("menu")}
              className={tabClass("menu")}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={tabClass("orders")}
            >
              My Orders ({orders.length})
            </button>
          </div>
        </div>
      </header>

      {(error || success) && (
        <div className="mt-2 space-y-1.5">
          {error && (
            <div
              role="alert"
              className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700"
            >
              {success}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "menu" && (
        <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          
          <section className="min-w-0 space-y-3">
            <div className="rounded border border-gray-200 bg-white p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:w-56 sm:shrink-0">
                  <label htmlFor="guest-menu-search" className="sr-only">
                    Search menu
                  </label>
                  <input
                    id="guest-menu-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search food and drinks..."
                    className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-gray-500"
                  />
                </div>

                <div
                  className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5"
                  aria-label="Menu categories"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={categoryButtonClass(selectedCategory === "all")}
                  >
                    All
                  </button>
                  {categories
                    .filter((category) => category.isActive !== false)
                    .map((category) => {
                      const id = getId(category);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedCategory(id)}
                          className={categoryButtonClass(
                            String(selectedCategory) === String(id),
                          )}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Veg
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Non-veg
                </span>
                <span className="ml-auto">{visibleItems.length} items</span>
              </div>
            </div>

            {loading ? (
              <div className="rounded border border-gray-200 bg-white p-6 text-center text-xs text-gray-500">
                Loading menu...
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="rounded border border-gray-200 bg-white p-6 text-center">
                <h2 className="text-sm font-semibold">No items available</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Try another category or search term.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {visibleItems.map((item) => {
                  const id = getId(item);
                  const cartItem = cart.find((entry) => entry.menuItem === id);
                  const image = getItemImage(item);
                  const dietaryType = String(
                    item.dietaryType || "",
                  ).toLowerCase();
                  const isVeg = dietaryType === "vegetarian";
                  const isNonVeg = dietaryType === "non_vegetarian";

                  return (
                    <article
                      key={id}
                      className="flex flex-col overflow-hidden rounded border border-gray-200 bg-white"
                    >
                      <div className="relative">
                        {image ? (
                          <img
                            src={image}
                            alt={getItemName(item)}
                            loading="lazy"
                            className="h-24 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center bg-gray-100 text-[10px] text-gray-400">
                            No image
                          </div>
                        )}
                        {(isVeg || isNonVeg) && (
                          <span
                            title={isVeg ? "Vegetarian" : "Non-vegetarian"}
                            aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
                            className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full border border-white ${
                              isVeg ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                        )}
                        {cartItem && (
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {cartItem.quantity}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-1.5 p-2">
                        <div className="flex items-start justify-between gap-1.5">
                          <h2 className="line-clamp-2 text-xs font-semibold leading-4">
                            {getItemName(item)}
                          </h2>
                          <span className="shrink-0 text-xs font-semibold">
                            {formatCurrency(item.discountPrice ?? item.price)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          disabled={!selectedBooking}
                          className="mt-auto w-full rounded bg-gray-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cartItem ? "Add More" : "Add to Cart"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          
          <aside
            id="guest-cart"
            className="rounded border border-gray-200 bg-white p-3 lg:sticky lg:top-[88px]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Your Order</h2>
                <p className="truncate text-[11px] text-gray-500">
                  Room service ·{" "}
                  {selectedBooking
                    ? `Room ${getRoomNumber(selectedBooking)}`
                    : "No active room"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium">
                {itemCount} items
              </span>
            </div>

            {cart.length === 0 ? (
              <p className="rounded border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500">
                Cart is empty. Add items from the menu.
              </p>
            ) : (
              <div className="max-h-[38vh] divide-y divide-gray-100 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.menuItem}
                    className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => changeQuantity(item.menuItem, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs hover:bg-gray-100"
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center text-[11px] font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => changeQuantity(item.menuItem, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>

                    <span className="w-16 shrink-0 text-right text-xs font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-2 space-y-2 border-t border-gray-100 pt-2"
            >
              {selectedBooking && !autoGuestName && (
                <div>
                  <label
                    htmlFor="guest-customer-name"
                    className="mb-1 block text-[11px] font-medium text-gray-600"
                  >
                    Your Name *
                  </label>
                  <input
                    id="guest-customer-name"
                    type="text"
                    value={customerNameInput}
                    onChange={(event) =>
                      setCustomerNameInput(event.target.value)
                    }
                    placeholder="Enter your full name"
                    maxLength={100}
                    required
                    className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-gray-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="guest-order-notes"
                  className="mb-1 block text-[11px] font-medium text-gray-600"
                >
                  Special Instructions{" "}
                  <span className="font-normal text-gray-400">(Optional)</span>
                </label>
                <textarea
                  id="guest-order-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Any special instructions..."
                  rows={1}
                  maxLength={500}
                  className="w-full resize-none rounded border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-gray-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500">Estimated Subtotal</p>
                  <p className="text-base font-semibold">
                    {formatCurrency(subtotal)}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingBookings ||
                    !selectedBooking ||
                    !customerName ||
                    cart.length === 0
                  }
                  className="shrink-0 rounded bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Placing..." : "Place Order"}
                </button>
              </div>

              <p className="text-[10px] leading-4 text-gray-500">
                Final prices and taxes are verified by the server.
              </p>
            </form>
          </aside>
        </div>
      )}

      
      {activeTab === "orders" && (
        <section
          id="my-restaurant-orders"
          className="mt-3 rounded border border-gray-200 bg-white p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">My Restaurant Orders</h2>
              <p className="text-[11px] text-gray-500">
                Status and payment QR for your orders
              </p>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loadingOrders}
              className="shrink-0 rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {loadingOrders ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loadingOrders ? (
            <p className="py-3 text-center text-xs text-gray-500">
              Loading orders...
            </p>
          ) : orders.length === 0 ? (
            <p className="rounded border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500">
              No restaurant orders yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {orders.map((order) => {
                const orderId = getId(order);
                const isQrOpen = openQrOrderId === orderId;

                const totalAmount = Number(
                  order.totalAmount ?? order.total ?? order.grandTotal ?? 0
                );
                const paidAmount = Number(order.paidAmount ?? 0);
                const balanceAmount = Math.max(
                  0,
                  Number(order.balanceAmount ?? totalAmount - paidAmount)
                );

                const paymentStatus = String(
                  order.paymentStatus ||
                    (paidAmount <= 0
                      ? "unpaid"
                      : balanceAmount > 0
                        ? "partial"
                        : "paid")
                ).toLowerCase();

                const paymentStatusLabel = {
                  paid: "Payment Completed",
                  partial: "Partially Paid",
                  pending: "Payment Pending",
                  unpaid: "Payment Unpaid",
                  refunded: "Payment Refunded",
                }[paymentStatus] || "Payment Status Unknown";

                const paymentStatusClass = {
                  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
                  partial: "border-amber-200 bg-amber-50 text-amber-700",
                  pending: "border-blue-200 bg-black text-blue-700",
                  unpaid: "border-red-200 bg-red-50 text-red-700",
                  refunded: "border-gray-200 bg-gray-100 text-gray-700",
                }[paymentStatus] || "border-gray-200 bg-gray-50 text-gray-600";

                const canShowQr =
                  String(order.status || "").toLowerCase() !== "cancelled" &&
                  paymentStatus !== "paid" &&
                  paymentStatus !== "refunded" &&
                  balanceAmount > 0;

                return (
                  <article
                    key={orderId}
                    className={`min-w-0 rounded border border-gray-200 p-2.5 ${
                      isQrOpen ? "sm:col-span-2 xl:col-span-3" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {order.orderNumber ||
                            `Order ${String(orderId).slice(-6)}`}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium capitalize text-gray-700">
                        {formatStatus(order.status || "placed")}
                      </span>
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-[11px] text-gray-600">
                      {(order.items || [])
                        .map(
                          (item) =>
                            `${item.title || item.name || "Menu item"} × ${item.quantity}`,
                        )
                        .join(", ")}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-1.5">
                      <span className="text-xs font-semibold">
                        {formatCurrency(totalAmount)}
                      </span>

                        {(canShowQr || isQrOpen) && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenQrOrderId(isQrOpen ? "" : orderId)
                          }
                          aria-expanded={isQrOpen}
                          className="rounded border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                          {isQrOpen ? "Hide" : "Pay Now"}
                        </button>
                      )}
                    </div>

                    
                    <div className="mt-3 rounded border border-gray-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold text-gray-900">
                          Payment Details
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${paymentStatusClass}`}
                        >
                          {paymentStatusLabel}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Order Total</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Amount Paid</span>
                          <span className="font-medium text-emerald-700">
                            {formatCurrency(paidAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                          <span className="text-gray-500">Remaining Balance</span>
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
                      </div>

                      {paymentStatus === "paid" && balanceAmount === 0 && (
                        <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-[11px] leading-4 text-emerald-700">
                          Payment completed. Thank you!
                        </p>
                      )}

                      {paymentStatus !== "paid" &&
                        paymentStatus !== "refunded" &&
                        balanceAmount > 0 && (
                          <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800">
                            {paymentStatus === "partial"
                              ? "A partial payment has been recorded."
                              : "Payment has not been completed yet."}{" "}
                             Remaining balance: {formatCurrency(balanceAmount)}.
                            Tap Pay Now to complete your payment.
                          </p>
                        )}

                      {paymentStatus === "refunded" && (
                        <p className="mt-3 rounded bg-gray-100 px-3 py-2 text-[11px] leading-4 text-gray-700">
                          This order has a refunded payment. Please contact
                          restaurant staff if you need more information.
                        </p>
                      )}
                    </div>

                    {isQrOpen && (
                      <div className="mt-2">
                        <OrderQRCode
                          orderId={orderId}
                          orderNumber={order.orderNumber || ""}
                          amount={balanceAmount}
                          onPaid={handlePaid}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      
      {activeTab === "menu" && itemCount > 0 && (
        <button
          type="button"
          onClick={scrollToCart}
          className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between rounded bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white lg:hidden"
        >
          <span>
            View cart · {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span>{formatCurrency(subtotal)}</span>
        </button>
      )}
    </div>
  );
}