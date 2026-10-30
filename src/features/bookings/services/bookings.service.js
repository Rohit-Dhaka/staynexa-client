import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

export const searchAvailability = (params) => unwrap(api.get("/bookings/availability", { params }));

export const listBookings = (params) => unwrap(api.get("/bookings", { params }));
export const getBooking = (id) => unwrap(api.get(`/bookings/${id}`));
export const createBooking = (data) => unwrap(api.post("/bookings", data));
export const updateBooking = (id, data) => unwrap(api.put(`/bookings/${id}`, data));

export const checkInBooking = (id, data) => unwrap(api.post(`/bookings/${id}/check-in`, data));
export const getCheckoutSummary = (id, params) =>
  unwrap(api.get(`/bookings/${id}/checkout-summary`, { params }));
export const checkOutBooking = (id, data) => unwrap(api.post(`/bookings/${id}/check-out`, data));
export const extendStay = (id, data) => unwrap(api.post(`/bookings/${id}/extend`, data));
export const changeRoom = (id, data) => unwrap(api.post(`/bookings/${id}/change-room`, data));

export const getCancelQuote = (id) => unwrap(api.get(`/bookings/${id}/cancel-quote`));
export const cancelBooking = (id, data) => unwrap(api.post(`/bookings/${id}/cancel`, data));
export const markNoShow = (id, data) => unwrap(api.post(`/bookings/${id}/no-show`, data));

export const getBookingPayments = (id) => unwrap(api.get(`/bookings/${id}/payments`));
export const addPayment = (id, data) => unwrap(api.post(`/bookings/${id}/payments`, data));
export const refundPayment = (id, data) => unwrap(api.post(`/bookings/${id}/refund`, data));
export const voidPayment = (paymentId, reason) =>
  unwrap(api.post(`/payments/${paymentId}/void`, { reason }));
export const listPayments = (params) => unwrap(api.get("/payments", { params }));
export const getCollectionSummary = (params) => unwrap(api.get("/payments/summary", { params }));

export const getBill = (id) => unwrap(api.get(`/bookings/${id}/bill`));
export const addCharge = (id, data) => unwrap(api.post(`/bookings/${id}/bill/charges`, data));
export const voidCharge = (id, itemId, reason) =>
  unwrap(api.post(`/bookings/${id}/bill/charges/${itemId}/void`, { reason }));
export const setDiscount = (id, data) => unwrap(api.put(`/bookings/${id}/bill/discount`, data));
export const updateBillTo = (id, data) => unwrap(api.put(`/bookings/${id}/bill/bill-to`, data));
export const getInvoice = (id) => unwrap(api.get(`/bookings/${id}/invoice`));
export const listBills = (params) => unwrap(api.get("/billing", { params }));
export const getRevenueSummary = (params) => unwrap(api.get("/billing/revenue", { params }));

export const getCalendarMonth = (params) => unwrap(api.get("/calendar/month", { params }));
export const getCalendarTimeline = (params) => unwrap(api.get("/calendar/timeline", { params }));
export const getCalendarDay = (params) => unwrap(api.get("/calendar/day", { params }));
export const getAvailabilityGrid = (params) => unwrap(api.get("/calendar/availability", { params }));

export const createHold = (data) => unwrap(api.post("/bookings/hold", data));
export const convertHold = (id, data) => unwrap(api.post(`/bookings/${id}/convert`, data));
export const extendHold = (id, data) => unwrap(api.post(`/bookings/${id}/extend-hold`, data));

export const quickCheckIn = (data) => unwrap(api.post("/bookings/quick-check-in", data));