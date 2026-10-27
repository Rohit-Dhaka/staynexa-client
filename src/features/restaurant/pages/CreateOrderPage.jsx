import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrderQr } from "../services/restaurant.service";
import OrderQRCode from "../components/OrderQRCode";
import {
  getMenuItems,
  getCategories,
  getTables,
  updateTableStatus,
  getInHouseBookings,
  getRestaurantSettings,
  createOrder,
} from "../services/restaurant.service";
import {
  UtensilsCrossed,
  ShoppingBag,
  Armchair,
  BedDouble,
} from "lucide-react";

const getList = (result, key) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.[key])) return result[key];
  if (Array.isArray(result?.data?.[key])) return result.data[key];
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const extractSettings = (result) => {
  if (result?.settings && typeof result.settings === "object") {
    return result.settings;
  }
  if (result?.data && typeof result.data === "object") {
    return result.data;
  }
  return result || {};
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getImageUrl = (item) => {
  const first = Array.isArray(item?.images) ? item.images[0] : null;
  if (typeof first === "string") return first;
  if (first?.url) return first.url;
  return item?.image || item?.imageUrl || "";
};

const getItemName = (item) => item?.title || item?.name || "Menu item";
const getId = (item) => item?._id || item?.id || "";

const ORDER_TYPES = [
  { value: "dine_in", label: "Dine-in", Icon: UtensilsCrossed },
  { value: "takeaway", label: "Pack", Icon: ShoppingBag },
  { value: "room_service", label: "Room Service", Icon: BedDouble },
];

const getRoom = (booking) =>
  booking?.room && typeof booking.room === "object" ? booking.room : null;

const getRoomId = (booking) => {
  const room = booking?.room;
  return typeof room === "object" ? getId(room) : room || "";
};

const getRoomNumber = (booking) => {
  const room = getRoom(booking);
  return (
    room?.roomNumber ||
    room?.number ||
    booking?.roomNumber ||
    (getRoomId(booking)
      ? `Room ${String(getRoomId(booking)).slice(-6)}`
      : "Room")
  );
};

const getBookingGuestName = (booking) =>
  booking?.guestDetails?.name ||
  booking?.guest?.name ||
  booking?.guestName ||
  booking?.customerName ||
  "";

export default function CreateOrderPage() {
  const navigate = useNavigate();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [inHouseBookings, setInHouseBookings] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [restaurantSettings, setRestaurantSettings] = useState({
    taxPercent: 0,
    serviceChargePercent: 0,
  });
  const [cart, setCart] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderType, setOrderType] = useState("dine_in");
  const [tableId, setTableId] = useState("");
  const [tableActionLoading, setTableActionLoading] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [menuResult, categoryResult, tableResult] = await Promise.all([
        getMenuItems({ page: 1, limit: 100 }),
        getCategories({ page: 1, limit: 100 }),
        getTables({ page: 1, limit: 100 }),
      ]);

      setMenuItems(getList(menuResult, "items"));
      setCategories(getList(categoryResult, "categories"));
      setTables(getList(tableResult, "tables"));

   
      try {
        const settingsResult = await getRestaurantSettings();
        const settings = extractSettings(settingsResult);
        setRestaurantSettings({
          taxPercent: Math.max(0, Number(settings.taxPercent) || 0),
          serviceChargePercent: Math.max(
            0,
            Number(settings.serviceChargePercent) || 0,
          ),
        });
      } catch {
        setRestaurantSettings({
          taxPercent: 0,
          serviceChargePercent: 0,
        });
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load menu and table information.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateQR = async (orderId) => {
  try {
    setQrLoading(true);
    setQrError("");

    const data = await createOrderQr(orderId);

    setQrData(data);
  } catch (error) {
    setQrError(
      error?.response?.data?.message ||
        "Unable to generate order QR code."
    );
  } finally {
    setQrLoading(false);
  }
};

  const loadInHouseBookings = useCallback(async () => {
    setBookingsLoading(true);
    setError("");

    try {
      const result = await getInHouseBookings({ page: 1, limit: 100 });
      const bookings = getList(result, "items");

      setInHouseBookings(bookings);

      setSelectedBookingId((currentId) =>
        bookings.some((booking) => getId(booking) === currentId)
          ? currentId
          : "",
      );
    } catch (err) {
      setInHouseBookings([]);
      setSelectedBookingId("");
      setError(
        err?.response?.data?.message || "Unable to load active room bookings.",
      );
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (orderType === "room_service") {
      loadInHouseBookings();
    }
  }, [orderType, loadInHouseBookings]);

  const activeTables = useMemo(
    () => tables.filter((table) => table.isActive !== false),
    [tables],
  );

  
  const availableTables = useMemo(
    () =>
      activeTables.filter(
        (table) =>
          String(table.status || "available").trim().toLowerCase() === "available",
      ),
    [activeTables],
  );

  
  const releasableTables = useMemo(
    () =>
      activeTables.filter((table) =>
        ["occupied", "reserved"].includes(
          String(table.status || "").trim().toLowerCase(),
        ),
      ),
    [activeTables],
  );

  const handleMakeTableAvailable = async (table) => {
    const id = getId(table);
    if (!id || tableActionLoading) return;

    setTableActionLoading(id);
    setError("");
    setSuccess("");

    try {
      await updateTableStatus(id, "available");
      setTables((current) =>
        current.map((item) =>
          getId(item) === id ? { ...item, status: "available" } : item,
        ),
      );
      if (tableId === id) setTableId("");
      setSuccess(`Table ${table.tableNumber || table.name || ""} is now available.`.trim());
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to update table status. Please check the backend table-status rules.",
      );
    } finally {
      setTableActionLoading("");
    }
  };

  const filteredMenu = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menuItems.filter((item) => {
      if (item.isAvailable !== true) return false;

      const itemCategory =
        typeof item.category === "object"
          ? item.category?._id || item.category?.id
          : item.category;

      const matchesCategory =
        categoryFilter === "all" ||
        String(itemCategory) === String(categoryFilter);

      const matchesSearch =
        !query ||
        getItemName(item).toLowerCase().includes(query) ||
        String(item.description || "")
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, search, categoryFilter]);

  const selectedBooking = useMemo(
    () =>
      inHouseBookings.find((booking) => getId(booking) === selectedBookingId) ||
      null,
    [inHouseBookings, selectedBookingId],
  );

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const taxPercent = Number(restaurantSettings.taxPercent) || 0;
  const serviceChargePercent =
    Number(restaurantSettings.serviceChargePercent) || 0;
  const estimatedTax = (subtotal * taxPercent) / 100;
  const estimatedServiceCharge = (subtotal * serviceChargePercent) / 100;
  const estimatedTotal = subtotal + estimatedTax + estimatedServiceCharge;

  const addToCart = (menuItem) => {
    const id = getId(menuItem);
    if (!id) return;

    setCart((current) => {
      const existing = current.find((item) => item.menuItem === id);

      if (existing) {
        return current.map((item) =>
          item.menuItem === id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          menuItem: id,
          name: getItemName(menuItem),
          price: Number(menuItem.price) || 0,
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

  const removeFromCart = (id) => {
    setCart((current) => current.filter((item) => item.menuItem !== id));
  };

  const handleOrderTypeChange = (value) => {
    setOrderType(value);

    if (value !== "dine_in") setTableId("");
    if (value !== "room_service") setSelectedBookingId("");

    setError("");
    setSuccess("");
  };

  const handleBookingChange = (bookingId) => {
    setSelectedBookingId(bookingId);

    const booking = inHouseBookings.find((item) => getId(item) === bookingId);

    const guestName = getBookingGuestName(booking);
    if (guestName) setCustomerName(guestName);

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = customerName.trim();

    if (cart.length === 0) {
      setError("Add at least one menu item to create an order.");
      return;
    }

    if (orderType === "dine_in" && !tableId) {
      setError("Select a table for dine-in orders.");
      return;
    }

    if (orderType === "room_service") {
      if (!selectedBooking) {
        setError("Select an active room booking.");
        return;
      }

      if (!getRoomId(selectedBooking)) {
        setError("The selected booking does not have a valid room.");
        return;
      }
    }

    const payload = {
      orderType,
      ...(name ? { customerName: name } : {}),
      ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
      items: cart.map((item) => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
      })),
      ...(orderType === "dine_in" ? { restaurantTable: tableId } : {}),
      ...(orderType === "room_service"
        ? {
            booking: getId(selectedBooking),
            room: getRoomId(selectedBooking),
          }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    setSubmitting(true);

    try {
      const result = await createOrder(payload);

      const orderNumber =
        result?.orderNumber ||
        result?.order?.orderNumber ||
        result?.data?.orderNumber ||
        result?._id ||
        result?.id;

      setSuccess(
        orderNumber
          ? `Order ${orderNumber} created successfully.`
          : "Order created successfully.",
      );

      setCart([]);
      setNotes("");
      setTableId("");
      setSelectedBookingId("");
      setCustomerName("");
      setCustomerPhone("");

      await loadData();

      if (orderType === "room_service") {
        await loadInHouseBookings();
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to create the order. Please check the order details.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="mx-auto max-w-7xl rounded border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Loading restaurant menu...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {qrLoading && (
  <p>Generating order QR code...</p>
)}

{qrError && (
  <p className="text-red-600">{qrError}</p>
)}

{qrData && (
  <OrderQRCode
    trackingUrl={qrData.trackingUrl}
    orderNumber={qrData.orderNumber}
  />
)}
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Create Restaurant Order
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Select menu items, choose an order type, and review the order.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/restaurant/orders")}
            className="rounded border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:"
          >
            Order List
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3"
        >
          <section className="space-y-5 xl:col-span-2">
            <div className=" flex gap-4">
              <div className="w-full">
                <label
                  htmlFor="menu-search"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Search Menu
                </label>
                <input
                  id="menu-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search food and drinks..."
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <div className="w-full">
                <label
                  htmlFor="menu-category"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Category
                </label>
                <select
                  id="menu-category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={getId(category)} value={getId(category)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredMenu.length === 0 ? (
              <div className="rounded border border-gray-200 bg-white p-10 text-center">
                <h2 className="font-semibold text-gray-900">
                  No available menu items
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Try another search or category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredMenu.map((item) => {
                  const id = getId(item);
                  const cartItem = cart.find((entry) => entry.menuItem === id);
                  const imageUrl = getImageUrl(item);

                  return (
                    <article
                      key={id}
                      className="overflow-hidden rounded border border-gray-200 bg-white"
                    >
                      {imageUrl ? (
                        <div className="relative">
                          <img
                            src={imageUrl}
                            alt={getItemName(item)}
                            loading="lazy"
                            className="h-40 w-full object-cover"
                          />

                          {["vegetarian", "non_vegetarian"].includes(
                            String(item.dietaryType || "").toLowerCase(),
                          ) && (
                            <span
                              title={
                                item.dietaryType === "vegetarian"
                                  ? "Vegetarian"
                                  : "Non-vegetarian"
                              }
                              className={`absolute left-3 top-3 p-2 h-3 w-3 rounded-full border-2  ${
                                String(item.dietaryType).toLowerCase() ===
                                "vegetarian"
                                  ? "bg-green-500 border-green-500"
                                  : "bg-red-500 border-red-500"
                              }`}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-gray-100 text-sm text-gray-400">
                          No image available
                        </div>
                      )}

                      <div className="space-y-3 p-4">
                        {item.dietaryType}
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-semibold text-gray-900">
                            {getItemName(item)}
                          </h2>
                          <span className="shrink-0 text-sm font-semibold text-gray-900">
                            {formatCurrency(item.price)}
                          </span>
                        </div>

                        <p className="line-clamp-2 text-sm text-gray-500">
                          {item.description || "No description available."}
                        </p>

                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="w-full rounded border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 hover:"
                        >
                          {cartItem
                            ? `Add Another (${cartItem.quantity})`
                            : "Add to Order"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="rounded border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Order Summary
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {cart.reduce((total, item) => total + item.quantity, 0)} items
              selected
            </p>

            <div className="mt-5">
              <label
                htmlFor="customer-name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Customer Name *
              </label>
              <input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                maxLength={150}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div className="mt-4">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                Order Type
              </span>

              <div className="flex gap-2">
                {ORDER_TYPES.map(({ value, label, Icon }) => {
                  const isChecked = orderType === value;

                  return (
                    <label
                      key={value}
                      htmlFor={`order-type-${value}`}
                      className={`flex cursor-pointer items-center gap-2 rounded border px-3.5 py-1.5 text-sm transition ${
                        isChecked
                          ? "border-gray-900  text-gray-900"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <input
                        id={`order-type-${value}`}
                        type="radio"
                        name="orderType"
                        checked={isChecked}
                        onChange={() => handleOrderTypeChange(value)}
                        className="sr-only"
                      />
                      <Icon size={18} className="shrink-0" />
                      <span className="font-medium text-nowrap">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {orderType === "dine_in" && (
              <div className="mt-4 space-y-5">
                <section>
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    Select Available Table *
                  </span>

                  {availableTables.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {availableTables.map((table) => {
                        const id = getId(table);
                        const isSelected = tableId === id;

                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setTableId(isSelected ? "" : id)}
                            aria-pressed={isSelected}
                            className={`flex items-center gap-3 rounded border px-3 py-2.5 text-left text-sm ${
                              isSelected
                                ? "border-gray-900  text-gray-900"
                                : "border-gray-200 text-gray-600 hover:border-gray-400"
                            }`}
                          >
                            <Armchair size={18} className="shrink-0" />
                            <span className="flex min-w-0 flex-col leading-tight">
                              <span className="font-medium">
                                {table.tableNumber || table.name || "Table"}
                              </span>
                              <span className="mt-1 text-xs text-gray-500">
                                {table.capacity ?? 0} seats · Available
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      No available tables. You can release an in-use or reserved table below.
                    </p>
                  )}
                </section>

                {releasableTables.length > 0 && (
                  <section className="rounded border border-gray-200 p-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Manage In-Use / Reserved Tables
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Mark a table available only after confirming it is no longer in use.
                    </p>
                    <div className="mt-3 space-y-2">
                      {releasableTables.map((table) => {
                        const id = getId(table);
                        const status = String(table.status || "").toLowerCase();
                        const isChanging = tableActionLoading === id;
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {table.tableNumber || table.name || "Table"}
                              </p>
                              <p className="text-xs capitalize text-gray-500">
                                {status === "occupied" ? "In Use" : "Reserved"} · {table.capacity ?? 0} seats
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={Boolean(tableActionLoading)}
                              onClick={() => handleMakeTableAvailable(table)}
                              className="shrink-0 rounded border border-green-200 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isChanging ? "Updating..." : "Make Available"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}

            {orderType === "room_service" && (
              <div className="mt-4">
                <label
                  htmlFor="active-booking"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Active Room Booking *
                </label>

                {bookingsLoading ? (
                  <p className="rounded border border-gray-200 p-3 text-sm text-gray-500">
                    Loading active bookings...
                  </p>
                ) : (
                  <select
                    id="active-booking"
                    value={selectedBookingId}
                    onChange={(event) =>
                      handleBookingChange(event.target.value)
                    }
                    className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                    required
                  >
                    <option value="">Select a checked-in booking</option>
                    {inHouseBookings.map((booking) => (
                      <option key={getId(booking)} value={getId(booking)}>
                        {getRoomNumber(booking)}
                        {getBookingGuestName(booking)
                          ? ` — ${getBookingGuestName(booking)}`
                          : ""}
                        {booking.bookingNumber
                          ? ` (${booking.bookingNumber})`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}

                {!bookingsLoading && inHouseBookings.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No checked-in room bookings were found.
                  </p>
                )}

                {selectedBooking && (
                  <div className="mt-3 rounded border border-gray-200  p-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {getRoomNumber(selectedBooking)}
                    </p>
                    <p className="mt-1 text-gray-600">
                      Guest: {getBookingGuestName(selectedBooking) || "Guest"}
                    </p>
                    <p className="mt-1 break-all text-xs text-gray-500">
                      Booking ID: {getId(selectedBooking)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <label
                htmlFor="order-notes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Order Notes
              </label>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Special instructions..."
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div className="mt-5 space-y-4 border-t border-gray-100 pt-4">
              {cart.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">
                  Your order is empty.
                </p>
              ) : (
                <div className="max-h-72 space-y-4 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.menuItem}
                      className="border-b border-gray-100 pb-4 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${item.name}`}
                            onClick={() => changeQuantity(item.menuItem, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-700 hover:"
                          >
                            −
                          </button>
                          <span className="min-w-5 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${item.name}`}
                            onClick={() => changeQuantity(item.menuItem, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-700 hover:"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.menuItem)}
                          className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-600">Subtotal</span>
                  <span className="text-xs font-medium text-gray-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-600">
                    Tax ({taxPercent}%)
                  </span>
                  <span className="text-xs font-medium text-gray-900">
                    {formatCurrency(estimatedTax)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-600">
                    Service Charge ({serviceChargePercent}%)
                  </span>
                  <span className="text-xs font-medium text-gray-900">
                    {formatCurrency(estimatedServiceCharge)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                  <span className="text-sm font-semibold text-gray-900">
                    Estimated Total
                  </span>
                  <span className="text-base font-semibold text-gray-900">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] leading-4 text-gray-500">
                Tax and service charge are estimated from saved restaurant
                settings. The server must calculate and save the final amounts
                when creating the order.
              </p>

              <button
                type="submit"
                disabled={
                  submitting ||
                  cart.length === 0 ||
                  (orderType === "dine_in" && !tableId) ||
                  (orderType === "room_service" &&
                    (!selectedBookingId || bookingsLoading))
                }
                className="w-full rounded bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating Order..." : "Place Order"}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
