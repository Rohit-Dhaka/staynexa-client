
import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

// Constants
export const VEHICLE_TYPES = [
  "hatchback",
  "sedan",
  "suv",
  "tempo_traveller",
];

export const TRIP_TYPES = [
  "airport_pickup",
  "airport_drop",
  "local",
  "outstation",
  "point_to_point",
];

export const CAB_STATUSES = [
  "requested",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
];

// Rates and fare estimates
export const getCabRates = (all = false) =>
  unwrap(api.get("/cab/rates", { params: all ? { all: true } : {} }));

export const updateCabRate = (vehicleType, data) =>
  unwrap(api.put(`/cab/rates/${vehicleType}`, data));

export const estimateCabFare = (params) =>
  unwrap(api.get("/cab/estimate", { params }));

// Vehicles
export const getCabVehicles = (params = {}) =>
  unwrap(api.get("/cab/vehicles", { params }));

export const getCabVehicle = (id) =>
  unwrap(api.get(`/cab/vehicles/${id}`));

export const createCabVehicle = (data) =>
  unwrap(api.post("/cab/vehicles", data));

export const updateCabVehicle = (id, data) =>
  unwrap(api.put(`/cab/vehicles/${id}`, data));

export const deleteCabVehicle = (id) =>
  unwrap(api.delete(`/cab/vehicles/${id}`));

// Drivers
export const getCabDrivers = (params = {}) =>
  unwrap(api.get("/cab/drivers", { params }));

export const getCabDriver = (id) =>
  unwrap(api.get(`/cab/drivers/${id}`));

export const createCabDriver = (data) =>
  unwrap(api.post("/cab/drivers", data));

export const updateCabDriver = (id, data) =>
  unwrap(api.put(`/cab/drivers/${id}`, data));

export const deleteCabDriver = (id) =>
  unwrap(api.delete(`/cab/drivers/${id}`));

// Cab bookings
export const getCabBookings = (params = {}) =>
  unwrap(api.get("/cab/bookings", { params }));

export const getCabBooking = (id) =>
  unwrap(api.get(`/cab/bookings/${id}`));

export const createCabBooking = (data) =>
  unwrap(api.post("/cab/bookings", data));

export const cancelCabBooking = (id, reason = "") =>
  unwrap(api.post(`/cab/bookings/${id}/cancel`, { reason }));

export const rateCabBooking = (id, data) =>
  unwrap(api.post(`/cab/bookings/${id}/rate`, data));

// Dispatch
export const getAvailableCabResources = (id) =>
  unwrap(api.get(`/cab/bookings/${id}/available`));

export const acceptCabBooking = (id, data = {}) =>
  unwrap(api.post(`/cab/bookings/${id}/accept`, data));

export const rejectCabBooking = (id, reason) =>
  unwrap(api.post(`/cab/bookings/${id}/reject`, { reason }));

export const assignCabResources = (id, data) =>
  unwrap(api.post(`/cab/bookings/${id}/assign`, data));

export const startCabTrip = (id) =>
  unwrap(api.post(`/cab/bookings/${id}/start`));

export const completeCabTrip = (id, data = {}) =>
  unwrap(api.post(`/cab/bookings/${id}/complete`, data));

export const addCabToRoomBill = (id) =>
  unwrap(api.post(`/cab/bookings/${id}/bill`));


