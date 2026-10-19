import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

const list = (url, params = {}) =>
  api.get(url, { params }).then((res) => {
    const data = res.data?.data;
    return { items: data?.items ?? [], meta: data?.meta ?? null };
  });

// Guests
export const getGuestList = (params) => list("/guests", params);
export const getGuestById = (id) => unwrap(api.get(`/guests/${id}`));
export const createGuest = (data) => unwrap(api.post("/guests", data));
export const updateGuest = (id, data) => unwrap(api.patch(`/guests/${id}`, data));
export const setGuestVip = (id, isVip) => unwrap(api.patch(`/guests/${id}/vip`, { isVip }));
export const setGuestBlacklist = (id, isBlacklisted, reason = "") =>
  unwrap(api.patch(`/guests/${id}/blacklist`, { isBlacklisted, reason }));
export const setGuestActive = (id, isActive) =>
  unwrap(api.patch(`/guests/${id}/status`, { isActive }));
export const deleteGuest = (id) => unwrap(api.delete(`/guests/${id}`));

// Guest services
export const getRequestList = (params) => list("/guest-requests", params);
export const getRequestSummary = () => unwrap(api.get("/guest-requests/summary"));
export const createRequest = (data) => unwrap(api.post("/guest-requests", data));
export const updateRequest = (id, data) => unwrap(api.patch(`/guest-requests/${id}`, data));
export const setRequestStatus = (id, status) =>
  unwrap(api.patch(`/guest-requests/${id}/status`, { status }));
export const deleteRequest = (id) => unwrap(api.delete(`/guest-requests/${id}`));

// Reviews
export const getReviewList = (params) => list("/reviews", params);
export const getReviewSummary = () => unwrap(api.get("/reviews/summary"));
export const createReview = (data) => unwrap(api.post("/reviews", data));
export const replyToReview = (id, text) => unwrap(api.patch(`/reviews/${id}/reply`, { text }));
export const setReviewStatus = (id, status) =>
  unwrap(api.patch(`/reviews/${id}/status`, { status }));
export const deleteReview = (id) => unwrap(api.delete(`/reviews/${id}`));