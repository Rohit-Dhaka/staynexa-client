import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

export const getSummary = () => unwrap(api.get("/banquet/summary"));
export const getCalendar = (params) => unwrap(api.get("/banquet/calendar", { params }));
export const checkAvailability = (params) => unwrap(api.get("/banquet/availability", { params }));

export const listHalls = (params) => unwrap(api.get("/banquet/halls", { params }));
export const createHall = (data) => unwrap(api.post("/banquet/halls", data));
export const updateHall = (id, data) => unwrap(api.put(`/banquet/halls/${id}`, data));
export const deleteHall = (id) => unwrap(api.delete(`/banquet/halls/${id}`));

export const listCatering = (params) => unwrap(api.get("/banquet/catering", { params }));
export const createCatering = (data) => unwrap(api.post("/banquet/catering", data));
export const updateCatering = (id, data) => unwrap(api.put(`/banquet/catering/${id}`, data));
export const deleteCatering = (id) => unwrap(api.delete(`/banquet/catering/${id}`));

export const listBookings = (params) => unwrap(api.get("/banquet/bookings", { params }));
export const getBooking = (id) => unwrap(api.get(`/banquet/bookings/${id}`));
export const createBooking = (data) => unwrap(api.post("/banquet/bookings", data));
export const updateBooking = (id, data) => unwrap(api.put(`/banquet/bookings/${id}`, data));
export const confirmBooking = (id) => unwrap(api.post(`/banquet/bookings/${id}/confirm`));
export const cancelBooking = (id, data) => unwrap(api.post(`/banquet/bookings/${id}/cancel`, data));
export const completeBooking = (id, data) => unwrap(api.post(`/banquet/bookings/${id}/complete`, data));
export const addPayment = (id, data) => unwrap(api.post(`/banquet/bookings/${id}/payments`, data));
export const voidPayment = (id, paymentId, reason) =>
  unwrap(api.post(`/banquet/bookings/${id}/payments/${paymentId}/void`, { reason }));