
import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);



export const getInHouseBookings = (params = {}) =>
  unwrap(
    api.get("/bookings", {
      params: {
        view: "in_house",
        page: 1,
        limit: 100,
        ...params,
      },
    })
  );



export const getCategories = (params = {}) =>
  unwrap(api.get("/restaurant/categories", { params }));

export const getCategoryById = (id) =>
  unwrap(api.get(`/restaurant/categories/${id}`));

export const createCategory = (data) =>
  unwrap(api.post("/restaurant/categories", data));

export const updateCategory = (id, data) =>
  unwrap(api.patch(`/restaurant/categories/${id}`, data));

export const deleteCategory = (id) =>
  unwrap(api.delete(`/restaurant/categories/${id}`));



export const getMenuItems = (params = {}) =>
  unwrap(api.get("/restaurant/menu", { params }));

export const getMenuItemById = (id) =>
  unwrap(api.get(`/restaurant/menu/${id}`));

export const createMenuItem = (data) =>
  unwrap(api.post("/restaurant/menu", data));

export const updateMenuItem = (id, data) =>
  unwrap(api.patch(`/restaurant/menu/${id}`, data));

export const updateMenuItemAvailability = (id, isAvailable) =>
  unwrap(
    api.patch(`/restaurant/menu/${id}/availability`, {
      isAvailable,
    })
  );

export const deleteMenuItem = (id) =>
  unwrap(api.delete(`/restaurant/menu/${id}`));



export const getTables = (params = {}) =>
  unwrap(api.get("/restaurant/tables", { params }));

export const getTableById = (id) =>
  unwrap(api.get(`/restaurant/tables/${id}`));

export const createTable = (data) =>
  unwrap(api.post("/restaurant/tables", data));

export const updateTable = (id, data) =>
  unwrap(api.patch(`/restaurant/tables/${id}`, data));

export const updateTableStatus = (id, status) =>
  unwrap(
    api.patch(`/restaurant/tables/${id}/status`, { status })
  );

export const deleteTable = (id) =>
  unwrap(api.delete(`/restaurant/tables/${id}`));



export const getOrders = (params = {}) =>
  unwrap(api.get("/restaurant/orders", { params }));

export const getOrderById = (id) =>
  unwrap(api.get(`/restaurant/orders/${id}`));

export const createOrder = (data) =>
  unwrap(api.post("/restaurant/orders", data));

export const updateOrderStatus = (id, status) =>
  unwrap(
    api.patch(`/restaurant/orders/${id}/status`, { status })
  );

export const cancelOrder = (id, reason = "") =>
  unwrap(
    api.post(`/restaurant/orders/${id}/cancel`, { reason })
  );


export const createOrderQr = (orderId) => {
  if (!orderId) {
    throw new Error("Order ID is required to generate a QR code.");
  }

  return unwrap(
    api.post(`/restaurant/orders/${encodeURIComponent(orderId)}/qr`)
  );
};

/**
 * Retrieve tracking information using the QR token.
 * Backend: GET /api/restaurant/orders/track?token=...
 */
export const trackOrderByQr = (token) => {
  if (!token) {
    throw new Error("Tracking token is required.");
  }

  return unwrap(
    api.get("/restaurant/orders/track", {
      params: { token },
    })
  );
};



export const getRestaurantSettings = () =>
  unwrap(api.get("/restaurant/settings"));

export const updateRestaurantSettings = (data) =>
  unwrap(api.patch("/restaurant/settings", data));



/* =========================================================
   RAZORPAY PAYMENTS
========================================================= */

export const createRazorpayOrder = async (orderId) => {
  const response = await api.post(
    `/restaurant-payments/orders/${orderId}/razorpay/create`
  );

  return response.data?.data ?? response.data;
};

export const verifyRazorpayPayment = async (orderId, payload) => {
  const response = await api.post(
    `/restaurant-payments/orders/${orderId}/razorpay/verify`,
    payload
  );

  return response.data?.data ?? response.data;
};