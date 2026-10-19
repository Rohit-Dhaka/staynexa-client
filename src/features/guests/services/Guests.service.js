import api from "../../../api/axiosInstance";

const unwrap = (res) => res.data.data;

// { guest, stays }  (guest is null when the phone number is new)
export const lookupGuest = (phone) =>
  api.get("/guests/lookup", { params: { phone } }).then(unwrap);

// { guests: [...] }  type-ahead suggestions by name, phone or email
export const suggestGuests = (q) =>
  api.get("/guests/suggest", { params: { q } }).then(unwrap);

// { guests: [...], meta }
export const getGuests = (params) =>
  api.get("/guests", { params }).then(unwrap);

// { guest, stats, bookings }
export const getGuest = (id) => api.get(`/guests/${id}`).then(unwrap);

export const updateGuest = (id, data) =>
  api.patch(`/guests/${id}`, data).then(unwrap);

// data: { isVip, isBlacklisted, blacklistReason }
export const updateGuestFlags = (id, data) =>
  api.patch(`/guests/${id}/flags`, data).then(unwrap);

// Get the logged-in guest's own profile
export const getMyGuestProfile = () =>
  api.get("/guests/me").then(unwrap);